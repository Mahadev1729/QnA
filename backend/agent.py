import os
from pathlib import Path
from typing import AsyncGenerator, Dict, List, Optional
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_core.tools import Tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from backend.database import get_messages

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

SYSTEM_PROMPT = (
    "You are QuickAnswer, an intelligent, helpful, and concise AI assistant. "
    "You provide clear, well-structured, and accurate responses. "
    "When asked for current events, fresh facts, documentation, or recent information, "
    "use Google Search tool to find reliable data."
)

# Supported models available on this Groq environment
FALLBACK_MODELS = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]


def get_llm(model_name: Optional[str] = None) -> ChatGroq:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY is not set in the environment or .env file.")

    selected_model = model_name or os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

    return ChatGroq(
        model=selected_model,
        api_key=groq_api_key,
        streaming=True,
        temperature=0.3,
    )


def get_tools() -> List[Tool]:
    serper_api_key = os.getenv("SERPER_API_KEY")
    tools = []

    if serper_api_key:
        try:
            search_wrapper = GoogleSerperAPIWrapper(serper_api_key=serper_api_key)
            tools.append(
                Tool(
                    name="google_search",
                    func=search_wrapper.run,
                    description="Search Google for current news, facts, recent information, and live web data.",
                )
            )
        except Exception as e:
            print(f"Warning: Failed to initialize Serper search tool: {e}")

    return tools


async def generate_chat_response_stream(
    chat_id: str,
    user_query: str,
    model_name: Optional[str] = None,
) -> AsyncGenerator[Dict, None]:
    """
    Streams response chunks for a given user query in a chat session.
    Yields dictionary payloads:
      {"type": "token", "content": "..."}
      {"type": "status", "content": "Searching web..."}
      {"type": "done", "full_content": "..."}
      {"type": "error", "error": "..."}
    """
    try:
        # Check API key
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            yield {
                "type": "error",
                "error": "GROQ_API_KEY is missing. Please set it in your root .env file.",
            }
            return

        tools = get_tools()

        # Load recent context for conversation continuity (only include completed Q&A pairs)
        past_messages = get_messages(chat_id)
        clean_history = []
        i = 0
        while i < len(past_messages):
            msg = past_messages[i]
            if msg["role"] == "user":
                # Check if next message is assistant response
                if i + 1 < len(past_messages) and past_messages[i + 1]["role"] == "assistant" and past_messages[i + 1]["content"].strip():
                    clean_history.append(msg)
                    clean_history.append(past_messages[i + 1])
                    i += 2
                else:
                    i += 1
            else:
                i += 1

        recent = clean_history[-10:] if len(clean_history) > 10 else clean_history

        formatted_messages = [SystemMessage(content=SYSTEM_PROMPT)]
        for msg in recent:
            if msg["role"] == "user":
                formatted_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                formatted_messages.append(AIMessage(content=msg["content"]))

        # Append current user query
        formatted_messages.append(HumanMessage(content=user_query))

        # Check if search tool is available and query requires web search
        used_search = False
        search_keywords = ["today", "latest", "news", "current", "price", "weather", "release", "2024", "2025", "2026", "who is", "what is"]
        query_lower = user_query.lower()

        if tools and any(kw in query_lower for kw in search_keywords):
            yield {"type": "status", "content": "Searching the web for latest info..."}
            try:
                search_tool = tools[0]
                search_results = search_tool.func(user_query)
                used_search = True
                search_context = f"\n\n[Live Google Search Results]:\n{search_results}\n\nUse the above search results to provide a fresh and accurate answer."
                formatted_messages.append(SystemMessage(content=search_context))
            except Exception as search_err:
                print(f"Search error (continuing without tool): {search_err}")

        # Try user model or fallback cascade
        candidate_models = [model_name] if model_name else []
        env_model = os.getenv("GROQ_MODEL")
        if env_model and env_model not in candidate_models:
            candidate_models.append(env_model)
        for fm in FALLBACK_MODELS:
            if fm not in candidate_models:
                candidate_models.append(fm)

        stream_success = False
        last_exception = None

        for candidate in candidate_models:
            try:
                llm = ChatGroq(
                    model=candidate,
                    api_key=groq_key,
                    streaming=True,
                    temperature=0.3,
                )
                full_text = ""
                async for chunk in llm.astream(formatted_messages):
                    content = chunk.content
                    if isinstance(content, str) and content:
                        full_text += content
                        yield {"type": "token", "content": content}
                    elif isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict) and "text" in item:
                                text = item["text"]
                                full_text += text
                                yield {"type": "token", "content": text}

                yield {
                    "type": "done",
                    "full_content": full_text,
                    "used_search": used_search,
                }
                stream_success = True
                break

            except Exception as stream_err:
                err_str = str(stream_err).lower()
                if any(x in err_str for x in ["model_not_found", "does not exist", "404", "decommissioned", "not supported", "400"]):
                    last_exception = stream_err
                    continue
                else:
                    raise stream_err

        if not stream_success:
            if last_exception:
                raise last_exception
            else:
                raise RuntimeError("Failed to stream response from available Groq models.")

    except Exception as e:
        yield {"type": "error", "error": str(e)}
