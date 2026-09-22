import json
import os
import sqlite3
import ssl
import urllib.parse
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import pymysql
    from pymysql.cursors import DictCursor
    PYMYSQL_AVAILABLE = True
except ImportError:
    PYMYSQL_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent.parent
SQLITE_DB_PATH = BASE_DIR / "chat_history.db"


def get_database_url() -> Optional[str]:
    """Retrieves MySQL/TiDB connection string from environment if provided."""
    return os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL")


def is_mysql_configured() -> bool:
    """Checks if a MySQL / TiDB database is configured and PyMySQL is installed."""
    db_url = get_database_url()
    has_individual_mysql = bool(os.getenv("MYSQL_HOST") and os.getenv("MYSQL_USER"))
    return PYMYSQL_AVAILABLE and bool(db_url or has_individual_mysql)


def parse_mysql_config() -> Dict[str, Any]:
    """Parses database URL or individual environment variables into PyMySQL connection parameters."""
    db_url = get_database_url()
    if db_url:
        # Strip scheme prefixes like mysql+pymysql:// or mysql://
        clean_url = db_url
        if clean_url.startswith("mysql+pymysql://"):
            clean_url = "mysql://" + clean_url[len("mysql+pymysql://"):]
        
        parsed = urllib.parse.urlparse(clean_url)
        raw_db = parsed.path.lstrip("/").split("?")[0]
        if raw_db in ("sys", "information_schema", "mysql", "performance_schema", ""):
            db_name = "test"
        else:
            db_name = raw_db
        
        # TiDB / Cloud MySQL SSL Context
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        config = {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 4000 if "tidbcloud.com" in (parsed.hostname or "") else (parsed.port or 3306),
            "user": parsed.username or "root",
            "password": urllib.parse.unquote(parsed.password or ""),
            "database": db_name,
            "cursorclass": DictCursor,
            "autocommit": False,
            "charset": "utf8mb4",
            "connect_timeout": 15,
        }

        # Apply SSL if connecting to cloud provider (TiDB, Aiven, AWS, etc.)
        if any(h in (parsed.hostname or "") for h in ["tidbcloud.com", "aivencloud.com", "aws", "rds", "cloud"]) or "ssl" in parsed.query:
            config["ssl"] = ssl_ctx

        return config
    else:
        ssl_ctx = None
        if os.getenv("MYSQL_SSL", "false").lower() in ("true", "1", "yes"):
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

        return {
            "host": os.getenv("MYSQL_HOST", "localhost"),
            "port": int(os.getenv("MYSQL_PORT", "3306")),
            "user": os.getenv("MYSQL_USER", "root"),
            "password": os.getenv("MYSQL_PASSWORD", ""),
            "database": os.getenv("MYSQL_DATABASE", "test"),
            "cursorclass": DictCursor,
            "autocommit": False,
            "charset": "utf8mb4",
            "ssl": ssl_ctx,
            "connect_timeout": 15,
        }


@contextmanager
def get_db():
    """Unified context manager for SQLite3 or MySQL/TiDB connections."""
    if is_mysql_configured():
        config = parse_mysql_config()
        conn = pymysql.connect(**config)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def init_db() -> None:
    """Initializes tables and indexes in MySQL or SQLite."""
    use_mysql = is_mysql_configured()

    with get_db() as conn:
        cursor = conn.cursor()
        if use_mysql:
            # MySQL / TiDB Schema
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(64) PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(100) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at VARCHAR(64) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(64),
                    title VARCHAR(255) NOT NULL,
                    created_at VARCHAR(64) NOT NULL,
                    updated_at VARCHAR(64) NOT NULL,
                    INDEX idx_conversations_user_id (user_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    chat_id VARCHAR(64) NOT NULL,
                    role VARCHAR(20) NOT NULL,
                    content LONGTEXT NOT NULL,
                    sources LONGTEXT,
                    created_at VARCHAR(64) NOT NULL,
                    INDEX idx_chat_messages_chat_id (chat_id),
                    FOREIGN KEY (chat_id) REFERENCES conversations(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
        else:
            # SQLite3 Schema
            cursor.execute(
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

            cursor.execute(
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

            cursor.execute(
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

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id)")


# --- User Operations ---
def create_user(email: str, username: str, password_hash: str) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    ph = "%s" if is_mysql_configured() else "?"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            INSERT INTO users (id, email, username, password_hash, created_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
            """,
            (user_id, email.lower().strip(), username.strip(), password_hash, now),
        )

    return {
        "id": user_id,
        "email": email.lower().strip(),
        "username": username.strip(),
        "created_at": now,
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    ph = "%s" if is_mysql_configured() else "?"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT * FROM users WHERE email = {ph}",
            (email.lower().strip(),),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    ph = "%s" if is_mysql_configured() else "?"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, email, username, created_at FROM users WHERE id = {ph}",
            (user_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


# --- Conversation Operations (Per-User Scoped) ---
def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    ph = "%s" if is_mysql_configured() else "?"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT id, user_id, title, created_at, updated_at
            FROM conversations
            WHERE user_id = {ph}
            ORDER BY updated_at DESC
            """,
            (user_id,),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_conversation(chat_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    ph = "%s" if is_mysql_configured() else "?"
    with get_db() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute(
                f"""
                SELECT id, user_id, title, created_at, updated_at
                FROM conversations
                WHERE id = {ph} AND user_id = {ph}
                """,
                (chat_id, user_id),
            )
        else:
            cursor.execute(
                f"""
                SELECT id, user_id, title, created_at, updated_at
                FROM conversations
                WHERE id = {ph}
                """,
                (chat_id,),
            )
        row = cursor.fetchone()
        return dict(row) if row else None


def create_conversation(
    chat_id: str, user_id: str, title: str = "New Conversation"
) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    use_mysql = is_mysql_configured()
    ph = "%s" if use_mysql else "?"

    with get_db() as conn:
        cursor = conn.cursor()
        if use_mysql:
            cursor.execute(
                f"""
                INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
                ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)
                """,
                (chat_id, user_id, title, now, now),
            )
        else:
            cursor.execute(
                f"""
                INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
                ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
                """,
                (chat_id, user_id, title, now, now),
            )

    return {
        "id": chat_id,
        "user_id": user_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
    }


def update_conversation_title(chat_id: str, user_id: str, title: str) -> bool:
    now = datetime.utcnow().isoformat()
    ph = "%s" if is_mysql_configured() else "?"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            UPDATE conversations
            SET title = {ph}, updated_at = {ph}
            WHERE id = {ph} AND user_id = {ph}
            """,
            (title, now, chat_id, user_id),
        )
        return cursor.rowcount > 0


def delete_conversation(chat_id: str, user_id: Optional[str] = None) -> bool:
    ph = "%s" if is_mysql_configured() else "?"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"DELETE FROM chat_messages WHERE chat_id = {ph}", (chat_id,))
        if user_id:
            cursor.execute(
                f"DELETE FROM conversations WHERE id = {ph} AND user_id = {ph}",
                (chat_id, user_id),
            )
        else:
            cursor.execute(f"DELETE FROM conversations WHERE id = {ph}", (chat_id,))
        return cursor.rowcount > 0


# --- Message Operations ---
def get_messages(chat_id: str) -> List[Dict[str, Any]]:
    ph = "%s" if is_mysql_configured() else "?"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT id, chat_id, role, content, sources, created_at
            FROM chat_messages
            WHERE chat_id = {ph}
            ORDER BY id ASC
            """,
            (chat_id,),
        )
        rows = cursor.fetchall()
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


def generate_smart_title(content: str) -> str:
    """Generates a clean, concise 3-6 word title from the user's first prompt."""
    text = content.strip().replace("\n", " ")
    if not text:
        return "New Conversation"

    lower_text = text.lower()
    fillers = [
        "please explain ",
        "please write ",
        "please tell me ",
        "can you explain ",
        "can you write ",
        "can you tell me ",
        "how do i ",
        "how to ",
        "what is the ",
        "what is ",
        "what are ",
        "tell me about ",
    ]
    for filler in fillers:
        if lower_text.startswith(filler):
            text = text[len(filler):].strip()
            break

    if text:
        text = text[0].upper() + text[1:]

    if len(text) > 36:
        truncated = text[:36]
        last_space = truncated.rfind(" ")
        if last_space > 15:
            text = truncated[:last_space] + "..."
        else:
            text = truncated + "..."

    return text or "New Conversation"


def save_message(
    chat_id: str,
    role: str,
    content: str,
    user_id: Optional[str] = None,
    sources: Optional[List[Any]] = None,
) -> int:
    sources_json = json.dumps(sources) if sources else None
    now = datetime.utcnow().isoformat()
    ph = "%s" if is_mysql_configured() else "?"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, title FROM conversations WHERE id = {ph}", (chat_id,)
        )
        row = cursor.fetchone()

        if not row and user_id:
            initial_title = generate_smart_title(content) if role == "user" else "New Conversation"
            cursor.execute(
                f"""
                INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
                """,
                (chat_id, user_id, initial_title, now, now),
            )
        elif row:
            row_dict = dict(row)
            if role == "user" and row_dict.get("title") in ("New Conversation", "New chat", "", None):
                new_title = generate_smart_title(content)
                cursor.execute(
                    f"UPDATE conversations SET title = {ph}, updated_at = {ph} WHERE id = {ph}",
                    (new_title, now, chat_id),
                )
            else:
                cursor.execute(
                    f"UPDATE conversations SET updated_at = {ph} WHERE id = {ph}",
                    (now, chat_id),
                )

        cursor.execute(
            f"""
            INSERT INTO chat_messages (chat_id, role, content, sources, created_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
            """,
            (chat_id, role, content, sources_json, now),
        )
        return cursor.lastrowid or 0


def delete_last_message(chat_id: str) -> bool:
    """Deletes the latest message for this chat."""
    ph = "%s" if is_mysql_configured() else "?"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id FROM chat_messages WHERE chat_id = {ph} ORDER BY id DESC LIMIT 1",
            (chat_id,),
        )
        row = cursor.fetchone()
        if row:
            row_dict = dict(row)
            cursor.execute(f"DELETE FROM chat_messages WHERE id = {ph}", (row_dict["id"],))
            return True
        return False
