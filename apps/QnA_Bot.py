from pathlib import Path
import os

import streamlit as st
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver


st.set_page_config(
    page_title="QuickAnswer",
    page_icon="🤖",
    layout="centered"
)

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BASE_DIR / ".env"

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

if "memory" not in st.session_state:
    st.session_state.memory = MemorySaver()

if "history" not in st.session_state:
    st.session_state.history = []

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

st.title("🤖 QuickAnswer")
st.subheader("Answers at the speed of thought")
st.caption("Powered by Groq + LangGraph + Google Search")

if st.button("🗑️ Clear Chat"):
    st.session_state.history = []
    st.session_state.memory = MemorySaver()
    st.rerun()

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

    except Exception as e:
        st.error(
            f"An error occurred:\n\n{str(e)}"
        )
