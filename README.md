# ⚡ QuickAnswer AI — Full-Stack ChatGPT-Style QnA Platform

**QuickAnswer AI** is an intelligent conversational AI platform built with a high-performance **React (Vite)** frontend, **FastAPI (Python)** backend, and flexible database persistence (**SQLite3** or **MySQL**). It features **Groq** ultra-fast LLM streaming, **Google Serper** live web search, **JWT multi-user authentication**, **smart auto-titling**, and **zero-cost browser-native voice dictation & audio speaker readout**.

---

## ✨ Key Features

- ⚡ **Ultra-Fast LLM Reasoning**: Groq-powered response streaming (`openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, etc.) with real-time Server-Sent Events (SSE).
- 🌐 **Live Web Search & Citations**: Google Serper integration automatically searches the live web for up-to-date facts, documentation, and news with source tags.
- 🎙️ **Native Voice Input (Speech-to-Text)**: Zero API cost voice dictation using browser Web Speech API (`SpeechRecognition`) with live glowing audio animations.
- 🔊 **Read Aloud Speaker (Text-to-Speech)**: Zero API cost text-to-speech (`speechSynthesis`) under every answer with intelligent markdown/code sanitization.
- 🔐 **Multi-User JWT Authentication**: Secure user registration, PBKDF2 password hashing, and token-based session persistence with complete per-user chat isolation.
- 🧠 **Smart Thread Auto-Titling**: Automatically summarizes first user prompts into concise, 3–5 word conversation titles in the sidebar.
- 🗄️ **Dual Database Support**: Works out of the box with zero-config **SQLite3** or seamlessly connects to **MySQL / Aiven Cloud MySQL**.
- 🎨 **ChatGPT-Inspired Minimalist UI**: Sleek dark mode (`#212121` / `#171717`), collapsible sidebar, quick starter prompts, and 1-click markdown clipboard copying.
- 🐳 **Production-Ready**: Multi-stage `Dockerfile`, `docker-compose.yml`, and unified FastAPI static SPA serving.

---

## 🏗️ Architecture & Project Structure

```
QuickAnswer/
├── backend/
│   ├── main.py             # FastAPI server, CORS, Auth routes, & SSE stream endpoints
│   ├── agent.py            # LangChain Groq agent with Google Serper web search
│   ├── auth.py             # JWT token issuance, PBKDF2 password hashing & auth dependency
│   ├── database.py         # Dual SQLite3 / MySQL engine with user isolation & auto-titling
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthScreen.jsx     # Login / Registration with emerald alerts
│   │   │   ├── Sidebar.jsx        # ChatGPT-style thread drawer & user profile
│   │   │   ├── ChatHeader.jsx     # Model indicator & sidebar toggle
│   │   │   ├── ChatInput.jsx      # Capsule input, mic dictation & search indicator
│   │   │   ├── MessageList.jsx    # Markdown chat bubbles, sources, copy & audio speaker
│   │   │   └── WelcomeScreen.jsx  # "What can I help with today?" greeting & cards
│   │   ├── services/
│   │   │   └── api.js             # Authenticated REST client & SSE stream consumer
│   │   ├── App.jsx                # Root session controller & state manager
│   │   ├── index.css              # Custom ChatGPT design system & animations
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── Dockerfile              # Multi-stage production container
├── docker-compose.yml      # Container orchestration
├── run_dev.py              # Local FastAPI development runner
├── chat_history.db         # Auto-generated local SQLite database
└── .env                    # API keys and environment variables
```

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- [Groq API Key](https://console.groq.com/keys)
- [Google Serper API Key](https://serper.dev/) *(Optional, for live web browsing)*

---

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Groq LLM Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

# Live Web Search (Optional)
SERPER_API_KEY=your_serper_api_key_here

# JWT Security
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_ALGORITHM=HS256

# Database (Leave empty for SQLite3, or set for MySQL / Aiven)
# DATABASE_URL=mysql+pymysql://user:password@host:port/dbname
# Or individual MySQL variables:
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASSWORD=yourpassword
# MYSQL_DATABASE=qna_database

PORT=8000
```

---

### 3. Run Backend (FastAPI)
```powershell
# Activate your virtual environment
.\qnaenv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI server on http://127.0.0.1:8000
python run_dev.py
```

---

### 4. Run Frontend (React + Vite)
In a new terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser!

---

## 🎙️ Native Voice Input & Audio Speaker

This application uses the browser's built-in **Web Speech API** for zero-cost, zero-latency audio processing:

| Feature | Control | Technology | Details |
|---|---|---|---|
| **Voice Dictation** | 🎙️ Mic button in chat capsule | `SpeechRecognition` / `webkitSpeechRecognition` | Live speech-to-text with red recording animation that appends words directly into the prompt. |
| **Audio Speaker** | 🔊 Speaker icon under answer | `window.speechSynthesis` | Reads response out loud in natural English. Automatically strips markdown formatting and code snippets. |

*Works natively on Chrome, Microsoft Edge, Safari, and Chromium browsers with 0 third-party API keys required.*

---

## 📡 API Reference

### 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | Register new user account with hashed password | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile details | Yes (Bearer) |

### 💬 Chat & Thread Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/chats` | List user's isolated conversation threads | Yes (Bearer) |
| `POST` | `/api/chats` | Create a new conversation session | Yes (Bearer) |
| `GET` | `/api/chats/{chat_id}` | Retrieve messages for a specific conversation | Yes (Bearer) |
| `DELETE` | `/api/chats/{chat_id}` | Delete a conversation thread and its history | Yes (Bearer) |
| `POST` | `/api/chat/stream` | **SSE Streaming endpoint** for real-time AI generation | Yes (Bearer) |
| `GET` | `/api/health` | Health check & Groq / Serper connection test | No |

---

## 📦 Production Deployment

### Option 1: Docker (Recommended)
```bash
docker compose up -d --build
```
Your full-stack application will be available at `http://localhost:8000`.

### Option 2: Render / Railway / Cloud Hosting
1. Connect your repository to your cloud provider (e.g., Render Web Service).
2. Set Environment to **Docker** (using the root `Dockerfile`).
3. Set your environment variables in the cloud dashboard (`GROQ_API_KEY`, `SERPER_API_KEY`, `JWT_SECRET`, `DATABASE_URL`).
4. Deploy!

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
