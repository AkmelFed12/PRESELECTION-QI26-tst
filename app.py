import base64
import cgi
import hashlib
import json
import os
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
import psycopg2.extras
import requests

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

ADMIN_USERNAME = "ASAAQI"
ADMIN_PASSWORD = "2026ASAA"
ADMIN_WHATSAPP = "2250150070082"

DATABASE_URL = os.environ.get("DATABASE_URL", "")
CLD_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLD_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLD_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
CLD_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "quiz-islamique")


def db_ready():
    return bool(DATABASE_URL)


def cloudinary_ready():
    return bool(CLD_CLOUD_NAME and CLD_API_KEY and CLD_API_SECRET)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def init_db():
    if not db_ready():
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                create table if not exists candidates (
                  id bigserial primary key,
                  fullName text not null,
                  age integer,
                  city text,
                  country text,
                  email text,
                  phone text,
                  whatsapp text not null,
                  photoUrl text,
                  quranLevel text,
                  motivation text,
                  createdAt timestamp with time zone default now()
                );

                create table if not exists votes (
                  id bigserial primary key,
                  candidateId bigint not null references candidates(id) on delete cascade,
                  voterName text,
                  voterContact text,
                  createdAt timestamp with time zone default now()
                );

                create table if not exists scores (
                  id bigserial primary key,
                  candidateId bigint not null references candidates(id) on delete cascade,
                  judgeName text not null,
                  themeChosenScore real default 0,
                  themeImposedScore real default 0,
                  notes text,
                  createdAt timestamp with time zone default now()
                );

                create table if not exists tournament_settings (
                  id integer primary key check (id = 1),
                  maxCandidates integer default 64,
                  directQualified integer default 16,
                  playoffParticipants integer default 32,
                  playoffWinners integer default 16,
                  groupsCount integer default 8,
                  candidatesPerGroup integer default 4,
                  finalistsFromWinners integer default 8,
                  finalistsFromBestSecond integer default 2,
                  totalFinalists integer default 10,
                  votingEnabled integer default 0,
                  updatedAt timestamp with time zone default now()
                );

                insert into tournament_settings (id)
                values (1)
                on conflict (id) do nothing;
                """
            )
            cur.execute("create index if not exists idx_votes_candidate on votes(candidateId)")
            cur.execute("create index if not exists idx_scores_candidate on scores(candidateId)")
        conn.commit()


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _get_json(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def _is_admin(self):
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Basic "):
            return False
        expected = base64.b64encode(f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}".encode()).decode()
        return auth == f"Basic {expected}"

    def _serve_file(self, rel_path):
        path = (PUBLIC_DIR / rel_path.lstrip("/")).resolve()
        if PUBLIC_DIR not in path.parents and path != PUBLIC_DIR:
            self.send_error(404)
            return
        if path.is_dir():
            path = path / "index.html"
        if not path.exists():
            self.send_error(404)
            return

        ext = path.suffix.lower()
        content_types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        content = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_types.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _require_db(self):
        if not db_ready():
            self._send_json({"message": "DATABASE_URL non configuré."}, 500)
            return False
        return True

    def _parse_multipart(self):
        ctype, _ = cgi.parse_header(self.headers.get("Content-Type", ""))
        if ctype != "multipart/form-data":
            return None
        environ = {"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("Content-Type")}
        return cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=environ)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/":
            return self._serve_file("index.html")

        if path.startswith("/api/"):
            if not self._require_db():
                return

            if path == "/api/public-candidates":
                with get_conn() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute(
                            "select id, fullName, country, photoUrl from candidates order by id asc"
                        )
                        rows = cur.fetchall()
                return self._send_json(rows)

            if path == "/api/public-settings":
                with get_conn() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("select votingEnabled from tournament_settings where id = 1")
                        row = cur.fetchone()
                return self._send_json(row or {"votingEnabled": 0})

            if not self._is_admin():
                return self._send_json({"message": "Accès non autorisé"}, 401)

            if path == "/api/candidates":
                with get_conn() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("select * from candidates order by id desc")
                        rows = cur.fetchall()
                return self._send_json(rows)

            if path == "/api/votes/summary":
                with get_conn() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute(
                            """
                            select c.id, c.fullName, count(v.id) as totalVotes
                            from candidates c
                            left join votes v on c.id = v.candidateId
                            group by c.id, c.fullName
                            order by totalVotes desc, c.fullName asc
                            """
                        )
                        rows = cur.fetchall()
                return self._send_json(rows)

            if path == "/api/scores/ranking":
                with get_conn() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute(
                            """
                            select c.id,
                                   c.fullName,
                                   round(avg(coalesce(s.themeChosenScore, 0) + coalesce(s.themeImposedScore, 0)), 2)
                                   as averageScore,
                                   count(s.id) as passages
                            from candidates c
                            left join scores s on c.id = s.candidateId
                            group by c.id, c.fullName
                            order by averageScore desc nulls last, passages desc, c.fullName asc
                            """
                        )
                        rows = cur.fetchall()
                return self._send_json(rows)

            if path == "/api/tournament-settings":
                with get_conn() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("select * from tournament_settings where id = 1")
                        row = cur.fetchone()
                return self._send_json(row or {})

            return self._send_json({"message": "Not found"}, 404)

        return self._serve_file(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/admin/upload-photo":
            if not self._is_admin():
                return self._send_json({"message": "Accès non autorisé"}, 401)
            if not cloudinary_ready():
                return self._send_json({"message": "Cloudinary non configuré."}, 500)

            form = self._parse_multipart()
            if not form or "photo" not in form:
                return self._send_json({"message": "Fichier photo requis."}, 400)
            photo_item = form["photo"]
            if not photo_item.filename:
                return self._send_json({"message": "Nom de fichier invalide."}, 400)

            raw = photo_item.file.read()
            ext = Path(photo_item.filename).suffix.lower().strip(".") or "jpg"
            safe_ext = ext if ext in {"jpg", "jpeg", "png", "webp"} else "jpg"
            public_id = f"{CLD_FOLDER}/{uuid.uuid4().hex}"

            timestamp = int(time.time())
            params = {
                "folder": CLD_FOLDER,
                "public_id": public_id.split("/")[-1],
                "timestamp": timestamp,
            }
            signature_base = "&".join(
                f"{k}={params[k]}" for k in sorted(params)
            ) + CLD_API_SECRET
            signature = hashlib.sha1(signature_base.encode("utf-8")).hexdigest()

            upload_res = requests.post(
                f"https://api.cloudinary.com/v1_1/{CLD_CLOUD_NAME}/image/upload",
                data={
                    "api_key": CLD_API_KEY,
                    "timestamp": timestamp,
                    "folder": CLD_FOLDER,
                    "public_id": params["public_id"],
                    "signature": signature,
                },
                files={"file": (f"upload.{safe_ext}", raw)},
                timeout=20,
            )
            if upload_res.status_code >= 300:
                return self._send_json(
                    {"message": "Erreur lors de l'upload photo.", "details": upload_res.text},
                    500,
                )
            upload_json = upload_res.json()
            return self._send_json({"photoUrl": upload_json.get("secure_url")})

        payload = self._get_json()

        if path == "/api/register":
            if not self._require_db():
                return
            if not payload.get("fullName") or not payload.get("whatsapp"):
                return self._send_json({"message": "Nom complet et WhatsApp obligatoires."}, 400)

            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "select id from candidates where lower(fullName) = lower(%s) and whatsapp = %s",
                        (payload.get("fullName"), payload.get("whatsapp")),
                    )
                    if cur.fetchone():
                        return self._send_json({"message": "Utilisateur déjà enregistré."}, 409)
                    cur.execute(
                        """
                        insert into candidates
                        (fullName, age, city, country, email, phone, whatsapp, photoUrl, quranLevel, motivation)
                        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        returning id
                        """,
                        (
                            payload.get("fullName"),
                            payload.get("age") or None,
                            payload.get("city"),
                            payload.get("country"),
                            payload.get("email"),
                            payload.get("phone"),
                            payload.get("whatsapp"),
                            payload.get("photoUrl"),
                            payload.get("quranLevel"),
                            payload.get("motivation"),
                        ),
                    )
                    candidate_id = cur.fetchone()[0]
                conn.commit()

            msg = (
                "Assalamou alaykoum, je confirme mon inscription au Quiz Islamique 2026. "
                f"Mon ID candidat est {candidate_id}."
            )
            redirect = f"https://wa.me/{ADMIN_WHATSAPP}?text={msg.replace(' ', '%20')}"
            return self._send_json(
                {
                    "message": "Inscription enregistrée.",
                    "candidateId": candidate_id,
                    "whatsappRedirect": redirect,
                },
                201,
            )

        if path == "/api/votes":
            if not self._require_db():
                return
            candidate_id = payload.get("candidateId")
            if not candidate_id:
                return self._send_json({"message": "Candidate ID requis."}, 400)

            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("select id from candidates where id = %s", (candidate_id,))
                    if not cur.fetchone():
                        return self._send_json({"message": "Candidat introuvable."}, 404)
                    cur.execute(
                        "insert into votes (candidateId, voterName, voterContact) values (%s, %s, %s)",
                        (candidate_id, payload.get("voterName"), payload.get("voterContact")),
                    )
                conn.commit()
            return self._send_json({"message": "Vote enregistré."}, 201)

        if path == "/api/admin/candidates":
            if not self._is_admin():
                return self._send_json({"message": "Accès non autorisé"}, 401)
            if not self._require_db():
                return

            candidate_id = payload.get("candidateId")
            data = {
                "fullName": payload.get("fullName"),
                "age": payload.get("age"),
                "city": payload.get("city"),
                "country": payload.get("country"),
                "email": payload.get("email"),
                "phone": payload.get("phone"),
                "whatsapp": payload.get("whatsapp"),
                "photoUrl": payload.get("photoUrl"),
                "quranLevel": payload.get("quranLevel"),
                "motivation": payload.get("motivation"),
            }
            clean = {k: v for k, v in data.items() if v not in [None, ""]}

            with get_conn() as conn:
                with conn.cursor() as cur:
                    if candidate_id:
                        if not clean:
                            return self._send_json({"message": "Aucune modification fournie."}, 400)
                        if "fullName" in clean or "whatsapp" in clean:
                            cur.execute(
                                """
                                select id from candidates
                                where lower(fullName) = lower(%s)
                                  and whatsapp = %s
                                  and id != %s
                                """,
                                (
                                    clean.get("fullName", payload.get("fullName")),
                                    clean.get("whatsapp", payload.get("whatsapp")),
                                    candidate_id,
                                ),
                            )
                            if cur.fetchone():
                                return self._send_json({"message": "Utilisateur déjà enregistré."}, 409)
                        set_parts = ", ".join([f"{k} = %s" for k in clean.keys()])
                        params = list(clean.values()) + [candidate_id]
                        cur.execute(f"update candidates set {set_parts} where id = %s", params)
                        if cur.rowcount == 0:
                            return self._send_json({"message": "Candidat introuvable."}, 404)
                        conn.commit()
                        return self._send_json({"message": "Candidat mis à jour."})

                    if not payload.get("fullName"):
                        return self._send_json({"message": "Nom complet requis."}, 400)
                    if not payload.get("whatsapp"):
                        return self._send_json({"message": "WhatsApp requis."}, 400)
                    cur.execute(
                        "select id from candidates where lower(fullName) = lower(%s) and whatsapp = %s",
                        (payload.get("fullName"), payload.get("whatsapp")),
                    )
                    if cur.fetchone():
                        return self._send_json({"message": "Utilisateur déjà enregistré."}, 409)
                    cur.execute(
                        """
                        insert into candidates
                        (fullName, age, city, country, email, phone, whatsapp, photoUrl, quranLevel, motivation)
                        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        returning id
                        """,
                        (
                            payload.get("fullName"),
                            payload.get("age") or None,
                            payload.get("city"),
                            payload.get("country"),
                            payload.get("email"),
                            payload.get("phone"),
                            payload.get("whatsapp"),
                            payload.get("photoUrl"),
                            payload.get("quranLevel"),
                            payload.get("motivation"),
                        ),
                    )
                    new_id = cur.fetchone()[0]
                conn.commit()
            return self._send_json({"message": "Candidat ajouté.", "candidateId": new_id}, 201)

        if path == "/api/scores":
            if not self._is_admin():
                return self._send_json({"message": "Accès non autorisé"}, 401)
            if not self._require_db():
                return
            candidate_id = payload.get("candidateId")
            judge = payload.get("judgeName")
            if not candidate_id or not judge:
                return self._send_json({"message": "Candidate ID et nom du juge requis."}, 400)

            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("select id from candidates where id = %s", (candidate_id,))
                    if not cur.fetchone():
                        return self._send_json({"message": "Candidat introuvable."}, 404)
                    cur.execute(
                        """
                        insert into scores (candidateId, judgeName, themeChosenScore, themeImposedScore, notes)
                        values (%s, %s, %s, %s, %s)
                        """,
                        (
                            candidate_id,
                            judge,
                            payload.get("themeChosenScore", 0),
                            payload.get("themeImposedScore", 0),
                            payload.get("notes", ""),
                        ),
                    )
                conn.commit()
            return self._send_json({"message": "Notation enregistrée."}, 201)

        return self._send_json({"message": "Not found"}, 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path != "/api/tournament-settings":
            return self._send_json({"message": "Not found"}, 404)
        if not self._is_admin():
            return self._send_json({"message": "Accès non autorisé"}, 401)
        if not self._require_db():
            return

        p = self._get_json()
        payload = {
            "maxCandidates": p.get("maxCandidates", 64),
            "directQualified": p.get("directQualified", 16),
            "playoffParticipants": p.get("playoffParticipants", 32),
            "playoffWinners": p.get("playoffWinners", 16),
            "groupsCount": p.get("groupsCount", 8),
            "candidatesPerGroup": p.get("candidatesPerGroup", 4),
            "finalistsFromWinners": p.get("finalistsFromWinners", 8),
            "finalistsFromBestSecond": p.get("finalistsFromBestSecond", 2),
            "totalFinalists": p.get("totalFinalists", 10),
            "votingEnabled": p.get("votingEnabled", 0),
        }
        set_parts = ", ".join([f"{k} = %s" for k in payload.keys()])
        values = list(payload.values())
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"update tournament_settings set {set_parts}, updatedAt = now() where id = 1",
                    values,
                )
            conn.commit()
        return self._send_json({"message": "Paramètres du tournoi mis à jour."})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/admin/candidates/"):
            return self._send_json({"message": "Not found"}, 404)
        if not self._is_admin():
            return self._send_json({"message": "Accès non autorisé"}, 401)
        if not self._require_db():
            return

        candidate_id = path.rsplit("/", 1)[-1]
        if not candidate_id.isdigit():
            return self._send_json({"message": "ID candidat invalide."}, 400)

        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("delete from candidates where id = %s", (candidate_id,))
                if cur.rowcount == 0:
                    return self._send_json({"message": "Candidat introuvable."}, 404)
            conn.commit()
        return self._send_json({"message": "Candidat supprimé."})


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", "3000"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Serveur démarré sur http://localhost:{port}")
    server.serve_forever()
