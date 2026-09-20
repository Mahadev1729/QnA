import json
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field

from backend.agent import generate_chat_response_stream, polish_prompt_text
from backend.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.database import (
    create_conversation,
    create_user,
    delete_conversation,
    delete_last_message,
    get_conversation,
    get_messages,
    get_user_by_email,
    init_db,
    list_conversations,
    save_message,
    update_conversation_title,
)

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Initialize database tables
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="QuickAnswer AI API",
    description="Backend API for QuickAnswer QnA ChatBot with multi-user isolation.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Configuration
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,*",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Schemas ---
class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=100)
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class AuthUserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUserResponse


class CreateChatRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    chat_id: Optional[str] = None


class UpdateChatTitleRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)


class SendMessageRequest(BaseModel):
    chat_id: str
    message: str = Field(..., min_length=1)
    model: Optional[str] = None


class PolishRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)


class PolishResponse(BaseModel):
    original_prompt: str
    polished_prompt: str


class ConversationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    created_at: str
    updated_at: str


# --- Public / Health Routes ---
@app.get("/api/health")
def health_check():
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    has_serper = bool(os.getenv("SERPER_API_KEY"))
    return {
        "status": "healthy",
        "groq_configured": has_groq,
        "serper_configured": has_serper,
        "version": "2.0.0",
    }


# --- Authentication Endpoints ---
@app.post("/api/auth/register", response_model=AuthResponse)
def register_endpoint(req: RegisterRequest):
    existing = get_user_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    pwd_hash = hash_password(req.password)
    new_user = create_user(
        email=req.email,
        username=req.username,
        password_hash=pwd_hash,
    )
    token = create_access_token({"sub": new_user["id"], "email": new_user["email"]})
    return {
        "token": token,
        "user": new_user,
    }


@app.post("/api/auth/login", response_model=AuthResponse)
def login_endpoint(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "created_at": user["created_at"],
        },
    }


@app.get("/api/auth/config")
def get_auth_config():
    """Returns public authentication configuration such as Google Client ID."""
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", "").strip(),
    }


@app.post("/api/auth/google", response_model=AuthResponse)
async def google_auth_endpoint(req: GoogleAuthRequest):
    """
    Verifies Google ID token from frontend and authenticates or registers the user.
    """
    if not req.credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential token is required.",
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={req.credential}"
            )
            if res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google credential.",
                )
            google_data = res.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify Google token: {str(e)}",
        )

    # Optional audience check if GOOGLE_CLIENT_ID is set
    expected_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if expected_client_id and google_data.get("aud") != expected_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token audience mismatch.",
        )

    email = google_data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address not provided by Google account.",
        )

    name = google_data.get("name") or google_data.get("given_name") or email.split("@")[0]

    # Find or auto-register user
    user = get_user_by_email(email)
    if not user:
        pwd_hash = hash_password(f"google_oauth_{uuid.uuid4().hex}")
        user = create_user(
            email=email,
            username=name,
            password_hash=pwd_hash,
        )

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "created_at": user["created_at"],
        },
    }


@app.get("/api/auth/me", response_model=AuthUserResponse)
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return current_user


# --- Protected Conversation Endpoints (User-Scoped) ---
@app.get("/api/chats", response_model=List[ConversationResponse])
def get_user_chats(current_user: dict = Depends(get_current_user)):
    return list_conversations(current_user["id"])


@app.post("/api/chats", response_model=ConversationResponse)
def create_new_user_chat(
    req: CreateChatRequest, current_user: dict = Depends(get_current_user)
):
    new_id = req.chat_id or str(uuid.uuid4())
    convo = create_conversation(
        chat_id=new_id,
        user_id=current_user["id"],
        title=req.title or "New Conversation",
    )
    return convo


@app.get("/api/chats/{chat_id}")
def get_user_chat_details(
    chat_id: str, current_user: dict = Depends(get_current_user)
):
    convo = get_conversation(chat_id, current_user["id"])
    if not convo:
        # Create user conversation if not exists
        convo = create_conversation(
            chat_id=chat_id,
            user_id=current_user["id"],
            title="New Conversation",
        )
    messages = get_messages(chat_id)
    return {
        "conversation": convo,
        "messages": messages,
    }


@app.patch("/api/chats/{chat_id}/title")
def update_user_chat_title(
    chat_id: str,
    req: UpdateChatTitleRequest,
    current_user: dict = Depends(get_current_user),
):
    success = update_conversation_title(chat_id, current_user["id"], req.title)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "ok", "chat_id": chat_id, "title": req.title}


@app.delete("/api/chats/{chat_id}")
def delete_user_chat(
    chat_id: str, current_user: dict = Depends(get_current_user)
):
    success = delete_conversation(chat_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "ok", "message": "Conversation deleted successfully"}


@app.post("/api/chat/stream")
async def chat_stream_endpoint(
    req: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    User-authenticated Server-Sent Events (SSE) streaming endpoint.
    Saves user message, streams assistant tokens, and stores final message in SQLite.
    """
    chat_id = req.chat_id.strip()
    user_query = req.message.strip()

    if not user_query:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Save user message in SQLite under authenticated user
    save_message(chat_id, "user", user_query, user_id=current_user["id"])

    async def event_generator():
        full_content = ""
        sources = []

        try:
            async for chunk in generate_chat_response_stream(
                chat_id=chat_id,
                user_query=user_query,
                model_name=req.model,
            ):
                chunk_type = chunk.get("type")

                if chunk_type == "token":
                    full_content += chunk.get("content", "")
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk['content']})}\n\n"

                elif chunk_type == "status":
                    yield f"data: {json.dumps({'type': 'status', 'content': chunk['content']})}\n\n"

                elif chunk_type == "done":
                    final_text = chunk.get("full_content", full_content)
                    used_search = chunk.get("used_search", False)
                    if used_search:
                        sources.append({"name": "Google Web Search", "type": "search"})

                    # Save assistant response in SQLite under user
                    msg_id = save_message(
                        chat_id,
                        "assistant",
                        final_text,
                        user_id=current_user["id"],
                        sources=sources,
                    )
                    yield f"data: {json.dumps({'type': 'done', 'message_id': msg_id, 'full_content': final_text, 'sources': sources})}\n\n"

                elif chunk_type == "error":
                    delete_last_message(chat_id)
                    yield f"data: {json.dumps({'type': 'error', 'error': chunk.get('error', 'Unknown error')})}\n\n"

        except Exception as e:
            delete_last_message(chat_id)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Transcribes audio using Groq Whisper (whisper-large-v3-turbo).
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY is not configured.",
        )

    try:
        audio_content = await file.read()
        filename = file.filename or "speech.webm"
        content_type = file.content_type or "audio/webm"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {groq_api_key}"},
                files={"file": (filename, audio_content, content_type)},
                data={"model": "whisper-large-v3-turbo"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Groq Whisper transcription error: {response.text}",
                )

            result = response.json()
            return {"transcript": result.get("text", "").strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio transcription failed: {str(e)}",
        )


@app.post("/api/polish-prompt", response_model=PolishResponse)
async def polish_prompt_endpoint(
    req: PolishRequest,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """
    Enhances and clarifies a user's prompt using Groq for optimal answering.
    """
    try:
        polished = await polish_prompt_text(req.prompt)
        return PolishResponse(
            original_prompt=req.prompt,
            polished_prompt=polished,
        )
    except Exception as e:
        return PolishResponse(
            original_prompt=req.prompt,
            polished_prompt=req.prompt,
        )


# Static frontend hosting in production
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        requested_file = FRONTEND_DIST / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not Found")
