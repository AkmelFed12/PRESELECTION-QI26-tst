import base64
import hashlib
import json
import os
import re
import smtplib
import time
import uuid
import html
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from email import policy
from email.parser import BytesParser
from pathlib import Path
from urllib.parse import urlparse

import psycopg
from psycopg.rows import dict_row
import requests

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

# ==================== GESTION D'ERREURS ====================
class APIError(Exception):
    """Exception personnalisée pour les erreurs API"""
    def __init__(self, message, status_code=400, details=None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

# Admin credentials - utiliser des variables d'environnement en production
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "qi26admin2026")
ADMIN_WHATSAPP = os.environ.get("ADMIN_WHATSAPP", "2250150070083")
CODE_PREFIX = "QI26"
MAX_UPLOAD_BYTES = 3 * 1024 * 1024
MAX_JSON_BYTES = 1024 * 1024
RATE_LIMIT_RULES = {
    "register": {"limit": 10, "window": 300},
    "vote": {"limit": 30, "window": 300},
    "contact": {"limit": 8, "window": 300},
}
RATE_LIMITS = {}
ALLOWED_STATUSES = {"pending", "approved", "eliminated"}
ALLOWED_LEVELS = {"", "Débutant", "Intermédiaire", "Avancé"}
MAX_LENGTHS = {
    "fullName": 120,
    "city": 60,
    "country": 60,
    "email": 120,
    "phone": 30,
    "whatsapp": 20,
    "quranLevel": 20,
    "motivation": 800,
    "status": 20,
    "judgeName": 80,
    "notes": 800,
    "contactName": 120,
    "contactEmail": 120,
    "contactSubject": 140,
    "contactMessage": 1200,
}

DATABASE_URL = os.environ.get("DATABASE_URL", "")
CLD_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLD_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLD_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
CLD_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "quiz-islamique")
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "")
SMTP_TO = os.environ.get("SMTP_TO", "")


def db_ready():
    return bool(DATABASE_URL)


def cloudinary_ready():
    return bool(CLD_CLOUD_NAME and CLD_API_KEY and CLD_API_SECRET)


def get_conn():
    return psycopg.connect(DATABASE_URL)


def init_db():
    if not db_ready():
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                create table if not exists candidates (
                  id bigserial primary key,
                  candidateCode text unique,
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
                  status text default 'pending',
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
                  registrationLocked integer default 0,
                  competitionClosed integer default 0,
                  announcementText text default '',
                  scheduleJson text default '[]',
                  updatedAt timestamp with time zone default now()
                );

                create table if not exists admin_audit (
                  id bigserial primary key,
                  action text not null,
                  payload text,
                  ip text,
                  createdAt timestamp with time zone default now()
                );

                create table if not exists contact_messages (
                  id bigserial primary key,
                  fullName text not null,
                  email text not null,
                  subject text not null,
                  message text not null,
                  ip text,
                  archived integer default 0,
                  createdAt timestamp with time zone default now()
                );

                insert into tournament_settings (id)
                values (1)
                on conflict (id) do nothing;
                """
            )
            cur.execute("alter table candidates add column if not exists status text default 'pending'")
            cur.execute("alter table candidates add column if not exists candidateCode text unique")
            cur.execute(
                "alter table tournament_settings add column if not exists registrationLocked integer default 0"
            )
            cur.execute(
                "alter table tournament_settings add column if not exists competitionClosed integer default 0"
            )
            cur.execute("alter table tournament_settings add column if not exists announcementText text default ''")
            cur.execute("alter table tournament_settings add column if not exists scheduleJson text default '[]'")
            cur.execute(
                f"""
                update candidates
                set candidateCode = '{CODE_PREFIX}-' || lpad(id::text, 3, '0')
                where candidateCode is null
                """
            )
            cur.execute("create index if not exists idx_votes_candidate on votes(candidateId)")
            cur.execute("create index if not exists idx_scores_candidate on scores(candidateId)")
            cur.execute("alter table votes add column if not exists ip text")
            cur.execute("alter table contact_messages add column if not exists archived integer default 0")
            cur.execute("create index if not exists idx_votes_candidate_ip on votes(candidateId, ip)")
            cur.execute("create index if not exists idx_contact_archived on contact_messages(archived)")
            try:
                cur.execute("create unique index if not exists uniq_candidates_whatsapp on candidates(whatsapp)")
            except Exception:
                pass
        conn.commit()


class Handler(BaseHTTPRequestHandler):
    def _set_security_headers(self):
        # Sécurité standard
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        
        # CORS - Accepter les requêtes du même domaine et locales
        origin = self.headers.get("Origin", "")
        if not origin or origin.endswith(("localhost", ".local", "127.0.0.1")):
            self.send_header("Access-Control-Allow-Origin", origin or "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "3600")
        
        if self._is_https():
            self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def _send_json(self, payload, status=200):
        """Envoie une réponse JSON avec gestion d'erreurs"""
        try:
            # S'assurer que payload est un dict
            if not isinstance(payload, dict):
                payload = {"data": payload}
            
            data = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self._set_security_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            print(f"Error sending JSON response: {e}")
            try:
                fallback = json.dumps({"error": "Erreur serveur interne"}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(fallback)))
                self.end_headers()
                self.wfile.write(fallback)
            except:
                pass

    def _get_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_JSON_BYTES:
            self._send_json({"message": "Requête trop volumineuse."}, 413)
            return None
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return {}

    def _is_admin(self):
        if not ADMIN_USERNAME or not ADMIN_PASSWORD:
            return False
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Basic "):
            return False
        expected = base64.b64encode(f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}".encode()).decode()
        return auth == f"Basic {expected}"

    def _is_https(self):
        forwarded = self.headers.get("X-Forwarded-Proto", "")
        if forwarded:
            return forwarded.lower() == "https"
        host = self.headers.get("Host", "")
        # En développement local, considérer comme sécurisé
        # En production, vérifier que c'est vraiment HTTPS
        is_local = any(value in host for value in ["localhost", "127.0.0.1", "0.0.0.0"])
        return is_local

    def _require_admin(self):
        # Toujours exiger les credentials (on a des defaults maintenant)
        if not self._is_admin():
            self._send_json({"message": "Accès non autorisé"}, 401)
            return False
        return True

    def _audit(self, action, payload=None):
        if not db_ready():
            return
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "insert into admin_audit (action, payload, ip) values (%s, %s, %s)",
                    (action, json.dumps(payload or {}), get_client_ip(self)),
                )
            conn.commit()

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
        self._set_security_headers()
        self.send_header("Content-Type", content_types.get(ext, "application/octet-stream"))
        if ext in {".css", ".js", ".svg", ".png", ".jpg", ".jpeg"}:
            self.send_header("Cache-Control", "public, max-age=86400")
        elif ext == ".html":
            self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _require_db(self):
        if not db_ready():
            self._send_json({"message": "DATABASE_URL non configuré."}, 500)
            return False
        return True

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_UPLOAD_BYTES:
            return b""
        return self.rfile.read(length) if length else b""

    def _parse_multipart(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            return None
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > MAX_UPLOAD_BYTES:
            return {"__too_large__": True}
        body = self._read_body()
        parser = BytesParser(policy=policy.default)
        msg = parser.parsebytes(
            b"Content-Type: " + content_type.encode("utf-8") + b"\r\nMIME-Version: 1.0\r\n\r\n" + body
        )
        fields = {}
        for part in msg.iter_parts():
            if part.get_content_disposition() != "form-data":
                continue
            name = part.get_param("name", header="content-disposition")
            filename = part.get_filename()
            payload = part.get_payload(decode=True)
            fields[name] = {
                "filename": filename,
                "content_type": part.get_content_type(),
                "data": payload,
            }
        return fields

    def do_OPTIONS(self):
        """Gérer les requêtes OPTIONS pour CORS preflight"""
        self.send_response(200)
        self._set_security_headers()
        self.end_headers()

    def _handle_api_error(self, error):
        """Gère une erreur API et envoie la réponse appropriée"""
        if isinstance(error, APIError):
            self._send_json({"error": error.message, **error.details}, error.status_code)
        else:
            # Erreur non prévue
            error_msg = str(error)
            print(f"Unexpected error: {error_msg}")
            print(traceback.format_exc())
            self._send_json({"error": "Erreur serveur interne"}, 500)

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path

            if path == "/":
                return self._serve_file("index.html")

            if path.startswith("/api/"):
            if not self._require_db():
                return

            if path == "/api/health":
                return self._send_json({"status": "ok"})

            if path == "/api/public-candidates":
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute(
                            "select id, candidateCode, fullName, city, country, photoUrl from candidates order by id asc"
                        )
                        rows = cur.fetchall()
                return self._send_json(rows)

            if path == "/api/public-settings":
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute(
                            """
                            select votingEnabled, registrationLocked, competitionClosed, announcementText
                            from tournament_settings
                            where id = 1
                            """
                        )
                        row = cur.fetchone()
                return self._send_json(
                    row
                    or {
                        "votingEnabled": 0,
                        "registrationLocked": 0,
                        "competitionClosed": 0,
                        "announcementText": "",
                        "scheduleJson": "[]",
                    }
                )

            if path == "/api/public-results":
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute(
                            """
                            select c.id,
                                   c.fullName,
                                   c.city,
                                   c.country,
                                   c.photoUrl,
                                   count(v.id) as totalVotes,
                                   avg(s.themeChosenScore + s.themeImposedScore) as averageScore,
                                   count(s.id) as passages
                            from candidates c
                            left join votes v on c.id = v.candidateId
                            left join scores s on c.id = s.candidateId
                            group by c.id, c.fullName, c.city, c.country, c.photoUrl
                            order by totalVotes desc, c.fullName asc
                            """
                        )
                        rows = cur.fetchall()
                countries = {str(r.get("country", "")).strip().lower() for r in rows if r.get("country")}
                cities = {str(r.get("city", "")).strip().lower() for r in rows if r.get("city")}
                total_votes = sum(int(r.get("totalVotes") or 0) for r in rows)
                return self._send_json(
                    {
                        "candidates": rows,
                        "stats": {
                            "totalCandidates": len(rows),
                            "totalVotes": total_votes,
                            "countries": len(countries),
                            "cities": len(cities),
                        },
                    }
                )

            if path == "/api/public-results/qualified":
                # Système simple de qualification : top 10 candidats par votes
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute(
                            """
                            select c.id, count(v.id) as totalVotes
                            from candidates c
                            left join votes v on c.id = v.candidateId
                            group by c.id
                            order by totalVotes desc
                            limit 10
                            """
                        )
                        qualified = cur.fetchall()
                qualified_ids = [int(r.get("id", 0)) for r in qualified]
                return self._send_json({"qualifiedIds": qualified_ids})

            if not self._require_admin():
                return

            if path == "/api/candidates":
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute("select * from candidates order by id desc")
                        rows = cur.fetchall()
                return self._send_json(rows)

            if path == "/api/votes/summary":
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
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
                    with conn.cursor(row_factory=dict_row) as cur:
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
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute("select * from tournament_settings where id = 1")
                        row = cur.fetchone()
                return self._send_json(row or {})

            if path == "/api/contact-messages":
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute(
                            """
                            select id, fullName, email, subject, message, ip, archived, createdAt
                            from contact_messages
                            order by id desc
                            limit 500
                            """
                        )
                        rows = cur.fetchall()
                return self._send_json(rows)

            if path == "/api/admin-audit":
                with get_conn() as conn:
                    with conn.cursor(row_factory=dict_row) as cur:
                        cur.execute(
                            """
                            select id, action, payload, ip, createdAt
                            from admin_audit
                            order by id desc
                            limit 500
                            """
                        )
                        rows = cur.fetchall()
                return self._send_json(rows)

            return self._send_json({"message": "Not found"}, 404)

        return self._serve_file(path)
        except APIError as error:
            self._handle_api_error(error)
        except Exception as error:
            self._handle_api_error(error)

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/admin/change-password":
            if not self._require_admin():
                return
            
            p = self._get_json()
            if p is None:
                return
            
            current_password = p.get("currentPassword", "")
            new_password = p.get("newPassword", "")
            
            if not current_password or not new_password:
                return self._send_json({"message": "Mot de passe actuel et nouveau requis."}, 400)
            
            if len(new_password) < 8:
                return self._send_json({"message": "Le mot de passe doit contenir au moins 8 caractères."}, 400)
            
            # Vérifier le mot de passe actuel
            if current_password != ADMIN_PASSWORD:
                return self._send_json({"message": "Mot de passe actuel incorrect."}, 401)
            
            # Mettre à jour la variable globale
            globals()['ADMIN_PASSWORD'] = new_password
            
            # Aussi enregistrer dans la base de données pour persistance si disponible
            if db_ready():
                with get_conn() as conn:
                    with conn.cursor() as cur:
                        # Créer une table de configuration si elle n'existe pas
                        cur.execute("""
                            create table if not exists admin_config (
                                key text primary key,
                                value text,
                                updatedAt timestamp with time zone default now()
                            )
                        """)
                        cur.execute(
                            "insert into admin_config (key, value) values (%s, %s) on conflict (key) do update set value = %s, updatedAt = now()",
                            ("admin_password_hash", hashlib.sha256(new_password.encode()).hexdigest(), hashlib.sha256(new_password.encode()).hexdigest())
                        )
                    conn.commit()
            
            self._audit("admin_change_password", {})
            return self._send_json({"message": "Mot de passe changé avec succès."})

        if path == "/api/admin/upload-photo":
            if not self._require_admin():
                return
            if not cloudinary_ready():
                return self._send_json({"message": "Cloudinary non configuré."}, 500)

            form = self._parse_multipart()
            if form and form.get("__too_large__"):
                return self._send_json({"message": "Fichier trop volumineux (max 3 Mo)."}, 413)
            if not form or "photo" not in form:
                return self._send_json({"message": "Fichier photo requis."}, 400)
            photo_item = form["photo"]
            if not photo_item["filename"]:
                return self._send_json({"message": "Nom de fichier invalide."}, 400)

            raw = photo_item["data"]
            if raw and len(raw) > MAX_UPLOAD_BYTES:
                return self._send_json({"message": "Fichier trop volumineux (max 3 Mo)."}, 413)
            if photo_item["content_type"] not in {"image/jpeg", "image/png", "image/webp"}:
                return self._send_json({"message": "Format de fichier non supporté."}, 400)
            ext = Path(photo_item["filename"]).suffix.lower().strip(".") or "jpg"
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
                files={"file": (f"upload.{safe_ext}", raw, photo_item["content_type"] or "application/octet-stream")},
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
        if payload is None:
            return

        if path == "/api/contact":
            if not self._require_db():
                return
            if not check_rate_limit(get_client_ip(self), "contact"):
                return self._send_json({"message": "Trop de tentatives, réessayez plus tard."}, 429)
            full_name = (payload.get("fullName") or "").strip()
            email = (payload.get("email") or "").strip()
            subject = (payload.get("subject") or "").strip()
            message = (payload.get("message") or "").strip()
            if not full_name or not email or not subject or not message:
                return self._send_json({"message": "Tous les champs sont obligatoires."}, 400)
            if not validate_lengths(
                {
                    "contactName": full_name,
                    "contactEmail": email,
                    "contactSubject": subject,
                    "contactMessage": message,
                }
            ):
                return self._send_json({"message": "Message trop long."}, 400)
            if not re.fullmatch(r"[^@\\s]+@[^@\\s]+\\.[^@\\s]+", email):
                return self._send_json({"message": "Email invalide."}, 400)
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into contact_messages (fullName, email, subject, message, ip)
                        values (%s, %s, %s, %s, %s)
                        """,
                        (full_name, email, subject, message, get_client_ip(self)),
                    )
                conn.commit()
            send_contact_email(full_name, email, subject, message)
            return self._send_json({"message": "Message envoyé. Nous vous répondrons rapidement."}, 201)

        if path == "/api/register":
            if not self._require_db():
                return
            if not check_rate_limit(get_client_ip(self), "register"):
                return self._send_json({"message": "Trop de tentatives, réessayez plus tard."}, 429)
            if not payload.get("fullName") or not payload.get("whatsapp"):
                return self._send_json({"message": "Nom complet et WhatsApp obligatoires."}, 400)
            normalized = normalize_whatsapp(payload.get("whatsapp"))
            if not normalized:
                return self._send_json({"message": "Numéro WhatsApp invalide."}, 400)
            if not validate_lengths(payload):
                return self._send_json({"message": "Certains champs dépassent la taille maximale."}, 400)
            if payload.get("quranLevel", "") not in ALLOWED_LEVELS:
                return self._send_json({"message": "Niveau invalide."}, 400)

            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "select registrationLocked, competitionClosed from tournament_settings where id = 1"
                    )
                    locked = cur.fetchone()
                    if locked and (int(locked[0]) == 1 or int(locked[1]) == 1):
                        return self._send_json({"message": "Inscriptions fermées."}, 403)
                    cur.execute(
                        "select id from candidates where lower(fullName) = lower(%s) and whatsapp = %s",
                        (payload.get("fullName"), normalized),
                    )
                    if cur.fetchone():
                        return self._send_json({"message": "Utilisateur déjà enregistré."}, 409)
                    cur.execute("select id from candidates where whatsapp = %s", (normalized,))
                    if cur.fetchone():
                        return self._send_json({"message": "WhatsApp déjà utilisé."}, 409)
                    cur.execute(
                        """
                        insert into candidates
                        (fullName, age, city, country, email, phone, whatsapp, photoUrl, quranLevel, motivation, status)
                        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        returning id
                        """,
                        (
                            payload.get("fullName"),
                            payload.get("age") or None,
                            payload.get("city"),
                            payload.get("country"),
                            payload.get("email"),
                            payload.get("phone"),
                            normalized,
                            payload.get("photoUrl"),
                            payload.get("quranLevel"),
                            payload.get("motivation"),
                            payload.get("status") or "pending",
                        ),
                    )
                    candidate_id = cur.fetchone()[0]
                    cur.execute(
                        "update candidates set candidateCode = %s where id = %s",
                        (f"{CODE_PREFIX}-{str(candidate_id).zfill(3)}", candidate_id),
                    )
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
            if not check_rate_limit(get_client_ip(self), "vote"):
                return self._send_json({"message": "Trop de votes, réessayez plus tard."}, 429)
            candidate_id = payload.get("candidateId")
            if not candidate_id:
                return self._send_json({"message": "Candidate ID requis."}, 400)

            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "select votingEnabled, competitionClosed from tournament_settings where id = 1"
                    )
                    settings = cur.fetchone()
                    if not settings or int(settings[0]) != 1 or int(settings[1]) == 1:
                        return self._send_json({"message": "Votes fermés."}, 403)
                    cur.execute("select id from candidates where id = %s", (candidate_id,))
                    if not cur.fetchone():
                        return self._send_json({"message": "Candidat introuvable."}, 404)
                    cur.execute(
                        """
                        select id from votes
                        where candidateId = %s and ip = %s and createdAt > now() - interval '24 hours'
                        """,
                        (candidate_id, get_client_ip(self)),
                    )
                    if cur.fetchone():
                        return self._send_json({"message": "Vote déjà enregistré pour ce candidat."}, 429)
                    cur.execute(
                        "insert into votes (candidateId, voterName, voterContact, ip) values (%s, %s, %s, %s)",
                        (candidate_id, payload.get("voterName"), payload.get("voterContact"), get_client_ip(self)),
                    )
                conn.commit()
            return self._send_json({"message": "Vote enregistré."}, 201)

        if path == "/api/admin/candidates":
            if not self._require_admin():
                return
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
                "status": payload.get("status"),
            }
            clean = {k: v for k, v in data.items() if v not in [None, ""]}
            if not validate_lengths(clean):
                return self._send_json({"message": "Certains champs dépassent la taille maximale."}, 400)
            if "quranLevel" in clean and clean["quranLevel"] not in ALLOWED_LEVELS:
                return self._send_json({"message": "Niveau invalide."}, 400)
            if "status" in clean and clean["status"] not in ALLOWED_STATUSES:
                return self._send_json({"message": "Statut invalide."}, 400)
            if "whatsapp" in clean:
                normalized = normalize_whatsapp(clean["whatsapp"])
                if not normalized:
                    return self._send_json({"message": "Numéro WhatsApp invalide."}, 400)
                clean["whatsapp"] = normalized

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
                        if "whatsapp" in clean:
                            cur.execute(
                                "select id from candidates where whatsapp = %s and id != %s",
                                (clean["whatsapp"], candidate_id),
                            )
                            if cur.fetchone():
                                return self._send_json({"message": "WhatsApp déjà utilisé."}, 409)
                        set_parts = ", ".join([f"{k} = %s" for k in clean.keys()])
                        params = list(clean.values()) + [candidate_id]
                        cur.execute(f"update candidates set {set_parts} where id = %s", params)
                        if cur.rowcount == 0:
                            return self._send_json({"message": "Candidat introuvable."}, 404)
                        conn.commit()
                        self._audit("candidate_update", {"id": candidate_id, "fields": list(clean.keys())})
                        return self._send_json({"message": "Candidat mis à jour."})

                    if not payload.get("fullName"):
                        return self._send_json({"message": "Nom complet requis."}, 400)
                    if not payload.get("whatsapp"):
                        return self._send_json({"message": "WhatsApp requis."}, 400)
                    normalized = normalize_whatsapp(payload.get("whatsapp"))
                    if not normalized:
                        return self._send_json({"message": "Numéro WhatsApp invalide."}, 400)
                    if not validate_lengths(payload):
                        return self._send_json({"message": "Certains champs dépassent la taille maximale."}, 400)
                    if payload.get("quranLevel", "") not in ALLOWED_LEVELS:
                        return self._send_json({"message": "Niveau invalide."}, 400)
                    if payload.get("status", "pending") not in ALLOWED_STATUSES:
                        return self._send_json({"message": "Statut invalide."}, 400)
                    cur.execute(
                        "select id from candidates where lower(fullName) = lower(%s) and whatsapp = %s",
                        (payload.get("fullName"), normalized),
                    )
                    if cur.fetchone():
                        return self._send_json({"message": "Utilisateur déjà enregistré."}, 409)
                    cur.execute("select id from candidates where whatsapp = %s", (normalized,))
                    if cur.fetchone():
                        return self._send_json({"message": "WhatsApp déjà utilisé."}, 409)
                    cur.execute(
                        """
                        insert into candidates
                        (fullName, age, city, country, email, phone, whatsapp, photoUrl, quranLevel, motivation, status)
                        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        returning id
                        """,
                        (
                            payload.get("fullName"),
                            payload.get("age") or None,
                            payload.get("city"),
                            payload.get("country"),
                            payload.get("email"),
                            payload.get("phone"),
                            normalized,
                            payload.get("photoUrl"),
                            payload.get("quranLevel"),
                            payload.get("motivation"),
                            payload.get("status") or "pending",
                        ),
                    )
                    new_id = cur.fetchone()[0]
                    cur.execute(
                        "update candidates set candidateCode = %s where id = %s",
                        (f"{CODE_PREFIX}-{str(new_id).zfill(3)}", new_id),
                    )
                conn.commit()
            self._audit("candidate_create", {"id": new_id})
            return self._send_json({"message": "Candidat ajouté.", "candidateId": new_id}, 201)

        if path == "/api/scores":
            if not self._require_admin():
                return
            if not self._require_db():
                return
            candidate_id = payload.get("candidateId")
            judge = payload.get("judgeName")
            if not candidate_id or not judge:
                return self._send_json({"message": "Candidate ID et nom du juge requis."}, 400)
            if not validate_lengths(payload):
                return self._send_json({"message": "Certains champs dépassent la taille maximale."}, 400)

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
            self._audit("score_create", {"candidateId": candidate_id, "judgeName": judge})
            return self._send_json({"message": "Notation enregistrée."}, 201)

        return self._send_json({"message": "Not found"}, 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path.startswith("/api/contact-messages/"):
            if not self._require_admin():
                return
            message_id = path.rsplit("/", 1)[-1]
            if not message_id.isdigit():
                return self._send_json({"message": "ID message invalide."}, 400)
            payload = self._get_json()
            if payload is None:
                return
            archived = 1 if int(payload.get("archived", 0)) == 1 else 0
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "update contact_messages set archived = %s where id = %s",
                        (archived, message_id),
                    )
                    if cur.rowcount == 0:
                        return self._send_json({"message": "Message introuvable."}, 404)
                conn.commit()
            self._audit("contact_archive", {"id": message_id, "archived": archived})
            return self._send_json({"message": "Message mis à jour."})
        if path != "/api/tournament-settings":
            return self._send_json({"message": "Not found"}, 404)
        if not self._require_admin():
            return
        if not self._require_db():
            return

        p = self._get_json()
        if p is None:
            return
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
            "registrationLocked": p.get("registrationLocked", 0),
            "competitionClosed": p.get("competitionClosed", 0),
            "announcementText": p.get("announcementText", ""),
            "scheduleJson": p.get("scheduleJson", "[]"),
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
        self._audit("settings_update", {"fields": list(payload.keys())})
        return self._send_json({"message": "Paramètres du tournoi mis à jour."})
        except APIError as error:
            self._handle_api_error(error)
        except Exception as error:
            self._handle_api_error(error)

    def do_DELETE(self):
        try:
            path = urlparse(self.path).path
        if path.startswith("/api/contact-messages/"):
            if not self._require_admin():
                return
            message_id = path.rsplit("/", 1)[-1]
            if not message_id.isdigit():
                return self._send_json({"message": "ID message invalide."}, 400)
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("delete from contact_messages where id = %s", (message_id,))
                    if cur.rowcount == 0:
                        return self._send_json({"message": "Message introuvable."}, 404)
                conn.commit()
            self._audit("contact_delete", {"id": message_id})
            return self._send_json({"message": "Message supprimé."})
        if not path.startswith("/api/admin/candidates/"):
            return self._send_json({"message": "Not found"}, 404)
        if not self._require_admin():
            return
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
        self._audit("candidate_delete", {"id": candidate_id})
        return self._send_json({"message": "Candidat supprimé."})
        except APIError as error:
            self._handle_api_error(error)
        except Exception as error:
            self._handle_api_error(error)


def get_client_ip(handler):
    forwarded = handler.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return handler.client_address[0] if handler.client_address else "unknown"


# ==================== SÉCURITÉ ====================
def sanitize_string(value, max_length=None):
    """Nettoie et valide une chaîne pour prévenir XSS"""
    if not isinstance(value, str):
        return ""
    # Échapper HTML
    value = html.escape(value).strip()
    # Limiter la longueur
    if max_length:
        value = value[:max_length]
    return value


def sanitize_json(obj):
    """Nettoie récursivement un objet JSON"""
    if isinstance(obj, dict):
        return {sanitize_string(k): sanitize_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json(item) for item in obj]
    elif isinstance(obj, str):
        return sanitize_string(obj)
    return obj


def validate_email(email):
    """Valide un email"""
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return len(email) <= 120 and re.match(pattern, email) is not None


def validate_phone(phone):
    """Valide un numéro de téléphone"""
    if not phone or not isinstance(phone, str):
        return False
    digits = re.sub(r'\D', '', phone)
    return 8 <= len(digits) <= 20


def hash_password(password):
    """Hash un mot de passe avec SHA256"""
    if not password:
        return ""
    return hashlib.sha256(password.encode()).hexdigest()


def check_password(password, hashed):
    """Vérifie un mot de passe"""
    return hash_password(password) == hashed


def check_rate_limit(ip, action):
    rule = RATE_LIMIT_RULES.get(action)
    if not rule:
        return True
    now = time.time()
    entries = RATE_LIMITS.get(ip, {}).get(action, [])
    window = rule["window"]
    entries = [t for t in entries if now - t < window]
    if len(entries) >= rule["limit"]:
        RATE_LIMITS.setdefault(ip, {})[action] = entries
        return False
    entries.append(now)
    RATE_LIMITS.setdefault(ip, {})[action] = entries
    return True


def normalize_whatsapp(value):
    if not value:
        return ""
    raw = re.sub(r"[^\d+]", "", str(value).strip())
    raw = raw.replace("00", "+", 1) if raw.startswith("00") else raw
    if not re.fullmatch(r"\+?[1-9]\d{6,14}", raw):
        return ""
    if not raw.startswith("+"):
        raw = f"+{raw}"
    return raw


def validate_lengths(payload):
    for key, max_len in MAX_LENGTHS.items():
        if key in payload and payload[key] is not None:
            if len(str(payload[key])) > max_len:
                return False
    return True


def send_contact_email(full_name, email, subject, message):
    if not (SMTP_HOST and SMTP_FROM and SMTP_TO):
        return
    body = (
        "Nouveau message de contact\n\n"
        f"Nom: {full_name}\n"
        f"Email: {email}\n"
        f"Sujet: {subject}\n\n"
        f"Message:\n{message}\n"
    )
    headers = [
        f"From: {SMTP_FROM}",
        f"To: {SMTP_TO}",
        f"Subject: [QI26] {subject}",
        "Content-Type: text/plain; charset=utf-8",
    ]
    msg = "\r\n".join(headers) + "\r\n\r\n" + body
    try:
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
        with server:
            server.ehlo()
            if SMTP_PORT != 465:
                server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [SMTP_TO], msg.encode("utf-8"))
    except Exception:
        return


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", "3000"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Serveur démarré sur http://localhost:{port}")
    server.serve_forever()
