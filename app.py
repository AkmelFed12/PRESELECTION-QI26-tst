import base64
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = BASE_DIR / "data.sqlite"

ADMIN_USERNAME = "ASAAQI"
ADMIN_PASSWORD = "2026ASAA"
ADMIN_WHATSAPP = "22900000000"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fullName TEXT NOT NULL,
          age INTEGER,
          city TEXT,
          country TEXT,
          email TEXT,
          phone TEXT,
          whatsapp TEXT NOT NULL,
          quranLevel TEXT,
          motivation TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidateId INTEGER NOT NULL,
          voterName TEXT,
          voterContact TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(candidateId) REFERENCES candidates(id)
        );

        CREATE TABLE IF NOT EXISTS scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidateId INTEGER NOT NULL,
          judgeName TEXT NOT NULL,
          tajwidScore REAL DEFAULT 0,
          memorizationScore REAL DEFAULT 0,
          presenceScore REAL DEFAULT 0,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(candidateId) REFERENCES candidates(id)
        );

        CREATE TABLE IF NOT EXISTS tournament_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          maxCandidates INTEGER DEFAULT 64,
          directQualified INTEGER DEFAULT 16,
          playoffParticipants INTEGER DEFAULT 32,
          playoffWinners INTEGER DEFAULT 16,
          groupsCount INTEGER DEFAULT 8,
          candidatesPerGroup INTEGER DEFAULT 4,
          finalistsFromWinners INTEGER DEFAULT 8,
          finalistsFromBestSecond INTEGER DEFAULT 2,
          totalFinalists INTEGER DEFAULT 10,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        INSERT OR IGNORE INTO tournament_settings (id) VALUES (1);
        """
    )
    conn.commit()
    conn.close()


class Handler(BaseHTTPRequestHandler):
    def _conn(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

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

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/":
            return self._serve_file("index.html")

        if path.startswith("/api/"):
            if not self._is_admin():
                return self._send_json({"message": "Accès non autorisé"}, 401)

            conn = self._conn()
            cur = conn.cursor()
            if path == "/api/candidates":
                rows = [dict(r) for r in cur.execute("SELECT * FROM candidates ORDER BY id DESC").fetchall()]
                conn.close()
                return self._send_json(rows)
            if path == "/api/votes/summary":
                rows = [
                    dict(r)
                    for r in cur.execute(
                        """
                        SELECT c.id, c.fullName, COUNT(v.id) AS totalVotes
                        FROM candidates c
                        LEFT JOIN votes v ON c.id = v.candidateId
                        GROUP BY c.id, c.fullName
                        ORDER BY totalVotes DESC, c.fullName ASC
                        """
                    ).fetchall()
                ]
                conn.close()
                return self._send_json(rows)
            if path == "/api/scores/ranking":
                rows = [
                    dict(r)
                    for r in cur.execute(
                        """
                        SELECT c.id, c.fullName,
                          ROUND(AVG(s.tajwidScore + s.memorizationScore + s.presenceScore), 2) AS averageScore,
                          COUNT(s.id) AS passages
                        FROM candidates c
                        LEFT JOIN scores s ON c.id = s.candidateId
                        GROUP BY c.id, c.fullName
                        ORDER BY averageScore DESC, passages DESC, c.fullName ASC
                        """
                    ).fetchall()
                ]
                conn.close()
                return self._send_json(rows)
            if path == "/api/tournament-settings":
                row = cur.execute("SELECT * FROM tournament_settings WHERE id = 1").fetchone()
                conn.close()
                return self._send_json(dict(row) if row else {})
            conn.close()
            return self._send_json({"message": "Not found"}, 404)

        return self._serve_file(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        payload = self._get_json()
        conn = self._conn()
        cur = conn.cursor()

        if path == "/api/register":
            if not payload.get("fullName") or not payload.get("whatsapp"):
                conn.close()
                return self._send_json({"message": "Nom complet et WhatsApp obligatoires."}, 400)
            cur.execute(
                """
                INSERT INTO candidates (fullName, age, city, country, email, phone, whatsapp, quranLevel, motivation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.get("fullName"),
                    payload.get("age") or None,
                    payload.get("city"),
                    payload.get("country"),
                    payload.get("email"),
                    payload.get("phone"),
                    payload.get("whatsapp"),
                    payload.get("quranLevel"),
                    payload.get("motivation"),
                ),
            )
            candidate_id = cur.lastrowid
            conn.commit()
            conn.close()
            msg = f"Assalamou alaykoum, je confirme mon inscription au Quiz Islamique 2026. Mon ID candidat est {candidate_id}."
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
            candidate_id = payload.get("candidateId")
            if not candidate_id:
                conn.close()
                return self._send_json({"message": "Candidate ID requis."}, 400)
            exists = cur.execute("SELECT id FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
            if not exists:
                conn.close()
                return self._send_json({"message": "Candidat introuvable."}, 404)
            cur.execute(
                "INSERT INTO votes (candidateId, voterName, voterContact) VALUES (?, ?, ?)",
                (candidate_id, payload.get("voterName"), payload.get("voterContact")),
            )
            conn.commit()
            conn.close()
            return self._send_json({"message": "Vote enregistré."}, 201)

        if path == "/api/scores":
            if not self._is_admin():
                conn.close()
                return self._send_json({"message": "Accès non autorisé"}, 401)
            candidate_id = payload.get("candidateId")
            judge = payload.get("judgeName")
            if not candidate_id or not judge:
                conn.close()
                return self._send_json({"message": "Candidate ID et nom du juge requis."}, 400)
            exists = cur.execute("SELECT id FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
            if not exists:
                conn.close()
                return self._send_json({"message": "Candidat introuvable."}, 404)
            cur.execute(
                """
                INSERT INTO scores (candidateId, judgeName, tajwidScore, memorizationScore, presenceScore, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    candidate_id,
                    judge,
                    payload.get("tajwidScore", 0),
                    payload.get("memorizationScore", 0),
                    payload.get("presenceScore", 0),
                    payload.get("notes", ""),
                ),
            )
            conn.commit()
            conn.close()
            return self._send_json({"message": "Notation enregistrée."}, 201)

        conn.close()
        return self._send_json({"message": "Not found"}, 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path != "/api/tournament-settings":
            return self._send_json({"message": "Not found"}, 404)
        if not self._is_admin():
            return self._send_json({"message": "Accès non autorisé"}, 401)

        p = self._get_json()
        conn = self._conn()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE tournament_settings
            SET maxCandidates = ?, directQualified = ?, playoffParticipants = ?, playoffWinners = ?,
                groupsCount = ?, candidatesPerGroup = ?, finalistsFromWinners = ?, finalistsFromBestSecond = ?,
                totalFinalists = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = 1
            """,
            (
                p.get("maxCandidates", 64),
                p.get("directQualified", 16),
                p.get("playoffParticipants", 32),
                p.get("playoffWinners", 16),
                p.get("groupsCount", 8),
                p.get("candidatesPerGroup", 4),
                p.get("finalistsFromWinners", 8),
                p.get("finalistsFromBestSecond", 2),
                p.get("totalFinalists", 10),
            ),
        )
        conn.commit()
        conn.close()
        return self._send_json({"message": "Paramètres du tournoi mis à jour."})


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", "3000"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Serveur démarré sur http://localhost:{port}")
    server.serve_forever()
