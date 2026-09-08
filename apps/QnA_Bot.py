from pathlib import Path
import os
import sqlite3
import uuid

import streamlit as st
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver


st.set_page_config(
    page_title="QuickAnswer",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

STYLE_FILE = Path(__file__).with_name("style.css")
st.markdown(
    f"<style>{STYLE_FILE.read_text(encoding='utf-8')}</style>",
    unsafe_allow_html=True,
)

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BASE_DIR / ".env"
DATABASE_FILE = BASE_DIR / "chat_history.db"

if ENV_FILE.exists():
    load_dotenv(
        dotenv_path=ENV_FILE,
        override=True
    )


def get_secret(key_name):
    val = os.getenv(key_name)
    if val:
        return val
    try:
        if key_name in st.secrets:
            return st.secrets[key_name]
    except Exception:
        pass
    return None


def get_chat_id():
    chat_id = st.query_params.get("chat_id")
    if not chat_id:
        chat_id = str(uuid.uuid4())
        st.query_params["chat_id"] = chat_id
    return chat_id


def initialize_database():
    with sqlite3.connect(DATABASE_FILE) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()


def load_chat_history(chat_id):
    with sqlite3.connect(DATABASE_FILE) as connection:
        rows = connection.execute(
            """
            SELECT role, content
            FROM chat_messages
            WHERE chat_id = ?
            ORDER BY id
            """,
            (chat_id,),
        ).fetchall()
    return [{"role": role, "content": content} for role, content in rows]


def save_chat_message(chat_id, role, content):
    with sqlite3.connect(DATABASE_FILE) as connection:
        connection.execute(
            """
            INSERT INTO chat_messages (chat_id, role, content)
            VALUES (?, ?, ?)
            """,
            (chat_id, role, content),
        )
        connection.commit()


def clear_chat_history(chat_id):
    with sqlite3.connect(DATABASE_FILE) as connection:
        connection.execute(
            "DELETE FROM chat_messages WHERE chat_id = ?",
            (chat_id,),
        )
        connection.commit()


GROQ_API_KEY = get_secret("GROQ_API_KEY")
SERPER_API_KEY = get_secret("SERPER_API_KEY")

if not GROQ_API_KEY:
    st.error(
        f"GROQ_API_KEY is missing. Add it to:\n`{ENV_FILE}` (for local) or Streamlit Secrets (for cloud deployment)."
    )
    st.stop()

if not SERPER_API_KEY:
    st.error(
        f"SERPER_API_KEY is missing. Add it to:\n`{ENV_FILE}` (for local) or Streamlit Secrets (for cloud deployment)."
    )
    st.stop()

initialize_database()
CHAT_ID = get_chat_id()

if "memory" not in st.session_state:
    st.session_state.memory = MemorySaver()

if "history" not in st.session_state:
    st.session_state.history = load_chat_history(CHAT_ID)

llm = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=GROQ_API_KEY,
    streaming=True
)

search = GoogleSerperAPIWrapper(
    serper_api_key=SERPER_API_KEY
)

tools = [search.run]

agent = create_agent(
    model=llm,
    tools=tools,
    checkpointer=st.session_state.memory,
    system_prompt=(
        "You are an amazing AI assistant. "
        "Answer questions clearly and accurately. "
        "Use Google Search when the user asks for "
        "current, recent, or web-based information."
    )
)

with st.sidebar:
    st.markdown(
        """
        <div class="brand">
            <div class="brand-mark">Q</div>
            <div class="brand-name">QuickAnswer</div>
        </div>
        <div class="sidebar-label">Workspace</div>
        """,
        unsafe_allow_html=True,
    )

    clear_chat = st.button("＋  New conversation", use_container_width=True)

    st.markdown(
        """
        <div class="sidebar-label">About</div>
        <div class="sidebar-note">
            <strong>Focused answers, less noise.</strong><br>
            Groq reasoning with web search when freshness matters.
        </div>
        <div class="sidebar-note">
            Your conversation is saved locally for this chat link.
        </div>
        """,
        unsafe_allow_html=True,
    )

if clear_chat:
    st.session_state.history = []
    st.session_state.memory = MemorySaver()
    clear_chat_history(CHAT_ID)
    st.rerun()

st.markdown(
    """
    <div class="topline">
        <span>QuickAnswer / New thread</span>
        <span><span class="status-dot"></span>Ready when you are</span>
    </div>
    """,
    unsafe_allow_html=True,
)

if not st.session_state.history:
    st.markdown(
        """
        <section class="welcome">
            <div class="welcome-kicker">Your thinking companion</div>
            <h1>Ask clearly.<br>Move faster.</h1>
            <p>
                Turn a rough question into a useful next step. Ask for an explanation,
                a plan, or a current answer from the web.
            </p>
            <div class="prompt-hint">✦ Try: “Help me understand this simply”</div>
        </section>
        """,
        unsafe_allow_html=True,
    )

for message in st.session_state.history:
    role = message["role"]
    content = message["content"]

    with st.chat_message(role):
        st.markdown(content)

query = st.chat_input("Ask anything...")

if query:

    with st.chat_message("user"):
        st.markdown(query)

    st.session_state.history.append(
        {
            "role": "user",
            "content": query
        }
    )
    save_chat_message(CHAT_ID, "user", query)

    try:
        response = agent.stream(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": query
                    }
                ]
            },
            {
                "configurable": {
                    "thread_id": "quickanswer-user"
                }
            },
            stream_mode="messages"
        )

        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            full_response = ""

            for chunk in response:

                if not isinstance(chunk, tuple):
                    continue

                message_chunk = chunk[0]

                content = getattr(
                    message_chunk,
                    "content",
                    ""
                )

                if isinstance(content, str):
                    full_response += content

                elif isinstance(content, list):

                    for item in content:

                        if isinstance(item, dict):
                            text = item.get("text", "")

                            if text:
                                full_response += text

                        elif isinstance(item, str):
                            full_response += item

                message_placeholder.markdown(
                    full_response
                )

        st.session_state.history.append(
            {
                "role": "assistant",
                "content": full_response
            }
        )
        save_chat_message(CHAT_ID, "assistant", full_response)

    except Exception as e:
        st.error(
            f"An error occurred:\n\n{str(e)}"
        )
