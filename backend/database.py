import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "chat_history.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db_connection() as conn:
        # Users Table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        # Conversations Table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        # Migration check: ensure user_id column exists
        cursor = conn.execute("PRAGMA table_info(conversations)")
        cols = [row["name"] for row in cursor.fetchall()]
        if "user_id" not in cols:
            conn.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT")

        # Chat Messages Table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                sources TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
            """
        )

        # Indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id)"
        )
        conn.commit()


# --- User Operations ---
def create_user(email: str, username: str, password_hash: str) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (id, email, username, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, email.lower().strip(), username.strip(), password_hash, now),
        )
        conn.commit()
    return {
        "id": user_id,
        "email": email.lower().strip(),
        "username": username.strip(),
        "created_at": now,
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT id, email, username, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None


# --- Conversation Operations (Per-User Scoped) ---
def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, user_id, title, created_at, updated_at
            FROM conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_conversation(chat_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        if user_id:
            row = conn.execute(
                """
                SELECT id, user_id, title, created_at, updated_at
                FROM conversations
                WHERE id = ? AND user_id = ?
                """,
                (chat_id, user_id),
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT id, user_id, title, created_at, updated_at
                FROM conversations
                WHERE id = ?
                """,
                (chat_id,),
            ).fetchone()
        return dict(row) if row else None


def create_conversation(
    chat_id: str, user_id: str, title: str = "New Conversation"
) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO conversations (id, user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
            """,
            (chat_id, user_id, title, now, now),
        )
        conn.commit()
    return {
        "id": chat_id,
        "user_id": user_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
    }


def update_conversation_title(chat_id: str, user_id: str, title: str) -> bool:
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE conversations
            SET title = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (title, now, chat_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0


def delete_conversation(chat_id: str, user_id: Optional[str] = None) -> bool:
    with get_db_connection() as conn:
        if user_id:
            convo = get_conversation(chat_id, user_id)
            if not convo:
                return False
        conn.execute("DELETE FROM chat_messages WHERE chat_id = ?", (chat_id,))
        cursor = conn.execute("DELETE FROM conversations WHERE id = ?", (chat_id,))
        conn.commit()
        return cursor.rowcount > 0


# --- Message Operations ---
def get_messages(chat_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, chat_id, role, content, sources, created_at
            FROM chat_messages
            WHERE chat_id = ?
            ORDER BY id ASC
            """,
            (chat_id,),
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if d.get("sources"):
                try:
                    d["sources"] = json.loads(d["sources"])
                except Exception:
                    d["sources"] = []
            else:
                d["sources"] = []
            result.append(d)
        return result


def save_message(
    chat_id: str,
    role: str,
    content: str,
    user_id: Optional[str] = None,
    sources: Optional[List[Any]] = None,
) -> int:
    sources_json = json.dumps(sources) if sources else None
    now = datetime.utcnow().isoformat()

    with get_db_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM conversations WHERE id = ?", (chat_id,)
        ).fetchone()
        if not exists and user_id:
            initial_title = content[:32].strip() + ("..." if len(content) > 32 else "")
            conn.execute(
                """
                INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (chat_id, user_id, initial_title or "New Conversation", now, now),
            )
        else:
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, chat_id),
            )

        cursor = conn.execute(
            """
            INSERT INTO chat_messages (chat_id, role, content, sources, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (chat_id, role, content, sources_json, now),
        )
        conn.commit()
        return cursor.lastrowid


def delete_last_message(chat_id: str) -> bool:
    """Deletes the latest message for this chat (useful for rolling back failed prompts)."""
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT id FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1",
            (chat_id,),
        ).fetchone()
        if row:
            conn.execute("DELETE FROM chat_messages WHERE id = ?", (row["id"],))
            conn.commit()
            return True
        return False
