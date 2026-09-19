# ⚡ QuickAnswer AI — Full-Stack ChatGPT-Style AI Platform

**QuickAnswer AI** is a production-ready conversational AI assistant built with a high-performance **React 18 (Vite)** frontend, **FastAPI (Python 3.12)** backend, and persistent database storage (**TiDB Serverless / MySQL / SQLite3**). 

It features **Groq** ultra-fast LLM response streaming, **Google Serper** live web browsing with real-time citations, **Google OAuth 2.0 & JWT authentication**, **smart thread auto-titling**, **zero-cost browser-native voice dictation & text-to-speech**, and **100% responsive design across all devices**.

---

## ✨ Key Features

- ⚡ **Ultra-Fast LLM Reasoning**: Groq-powered response streaming (`openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, etc.) with real-time Server-Sent Events (SSE).
- 🌐 **Live Web Search & Citations**: Google Serper integration automatically searches the live web for fresh facts, news, and technical documentation with source badges.
- 🔑 **Google OAuth 2.0 & JWT Authentication**: 1-click **Sign in with Google** or secure Email/Password registration with PBKDF2 password hashing.
- 🗄️ **Persistent Cloud Database (TiDB / MySQL / SQLite)**: Seamlessly connects to **TiDB Cloud Serverless** or **Aiven MySQL** with SSL, guaranteeing persistent user accounts and chat history across restarts.
- 📱 **100% Fully Responsive Layout**: Mobile-first adaptive navigation bar, sliding sidebar drawer with backdrop overlay, and 1-tap new chat button for phones, tablets, and desktops.
- 🎙️ **Native Voice Input (Speech-to-Text)**: Zero API cost voice dictation using browser Web Speech API (`SpeechRecognition`) with glowing audio indicator.
- 🔊 **Read Aloud Speaker (Text-to-Speech)**: Zero API cost text-to-speech (`speechSynthesis`) under every answer with intelligent markdown & code sanitization.
- 🧠 **Smart Auto-Titling**: Automatically summarizes first user prompts into concise, 3–5 word conversation titles in the sidebar.
- 🐳 **Production Docker Ready**: Multi-stage `Dockerfile` and `docker-compose.yml` for unified single-service hosting on **Render**, Railway, or AWS.

---

## 🏗️ Architecture & Project Structure

```
QuickAnswer/
├── backend/
│   ├── main.py             # FastAPI server, CORS, Google OAuth, Auth routes, & SSE stream endpoints
│   ├── agent.py            # LangChain Groq agent with Google Serper web search
│   ├── auth.py             # JWT token issuance, PBKDF2 password hashing & auth dependency
│   ├── database.py         # Dual TiDB Cloud/MySQL & SQLite engine with SSL & auto-titling
│   └── requirements.txt    # Python dependencies (FastAPI, PyMySQL, LangChain, Cryptography)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthScreen.jsx     # Google OAuth 2.0 & Email/Password Sign-In
│   │   │   ├── Sidebar.jsx        # ChatGPT-style thread drawer & user profile
│   │   │   ├── ChatHeader.jsx     # Responsive navbar, model indicator & 1-tap new chat
│   │   │   ├── ChatInput.jsx      # Capsule input, mic dictation & search indicator
│   │   │   ├── MessageList.jsx    # Markdown chat bubbles, sources, copy & audio speaker
│   │   │   └── WelcomeScreen.jsx  # "What can I help with today?" greeting & cards
│   │   ├── services/
│   │   │   └── api.js             # Authenticated REST client & SSE stream consumer
│   │   ├── App.jsx                # Root session controller & state manager
│   │   ├── index.css              # Dark-mode design system & responsive media queries
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── Dockerfile              # Multi-stage production container
├── docker-compose.yml      # Local container orchestration
├── .dockerignore           # Optimized build exclusions
├── run_dev.py              # Local FastAPI development runner
└── .env                    # Environment variables (API keys & DB connection)
```

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- [Groq API Key](https://console.groq.com/keys) *(Required for LLM)*
- [Google Serper API Key](https://serper.dev/) *(Optional, for live web browsing)*
- [TiDB Cloud MySQL](https://tidbcloud.com/) *(Optional, for persistent cloud DB)*
- [Google Cloud Console](https://console.cloud.google.com/) *(Optional, for Google Sign-In)*

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

# Cloud Database (TiDB Cloud / MySQL / Aiven)
# Leave empty for local SQLite3, or set for TiDB Cloud:
DATABASE_URL=mysql://3vQNWEqtMPTny7t.root:yourpassword@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test

# Google Sign-In Client ID (Optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

PORT=8000
```

---

### 3. Run Backend (FastAPI)
```powershell
# Activate virtual environment
.\qnaenv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI server on http://127.0.0.1:8000
python run_dev.py
```

---

### 4. Run Frontend (React + Vite)
In a separate terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser!

---

## 📦 Production Deployment (Render + Docker)

This application is built for easy **1-click Docker deployment** on Render:

1. Push your code to your **GitHub** repository.
2. Go to **[dashboard.render.com](https://dashboard.render.com/)** ➔ Click **New +** ➔ **Web Service**.
3. Connect your repository.
4. Set **Runtime** to **`Docker`** and **Instance Type** to **`Free`**.
5. Add your **Environment Variables**:
   - `GROQ_API_KEY`: Your Groq API key
   - `DATABASE_URL`: Your TiDB Cloud / MySQL connection URL
   - `JWT_SECRET`: Random 32+ character string
   - `SERPER_API_KEY`: *(Optional)* Google Serper key
   - `GOOGLE_CLIENT_ID`: *(Optional)* Google OAuth Client ID
   - `PORT`: `8000`
6. Click **Create Web Service**. Render builds the React frontend and serves everything seamlessly under a single URL!

---

## 📡 API Reference

### 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | Register new user with hashed password | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | No |
| `POST` | `/api/auth/google` | Verify Google ID token & login/register | No |
| `GET` | `/api/auth/config` | Retrieve public auth config (Google Client ID) | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile details | Yes (Bearer) |

### 💬 Chat & Thread Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/chats` | List user's isolated conversation threads | Yes (Bearer) |
| `POST` | `/api/chats` | Create a new conversation session | Yes (Bearer) |
| `GET` | `/api/chats/{chat_id}` | Retrieve messages for a specific conversation | Yes (Bearer) |
| `PATCH` | `/api/chats/{chat_id}/title` | Rename a conversation title | Yes (Bearer) |
| `DELETE` | `/api/chats/{chat_id}` | Delete a conversation thread and its history | Yes (Bearer) |
| `POST` | `/api/chat/stream` | **SSE Streaming endpoint** for real-time AI generation | Yes (Bearer) |
| `GET` | `/api/health` | Health check & Groq / Serper connection test | No |

---

## 🎙️ Native Voice Input & Audio Readout

| Feature | Control | Technology | Details |
|---|---|---|---|
| **Voice Dictation** | 🎙️ Mic button in chat capsule | `SpeechRecognition` | Live speech-to-text with glowing recording animation that appends spoken words directly into the prompt. |
| **Audio Speaker** | 🔊 Speaker icon under answer | `speechSynthesis` | Reads response out loud in natural English. Automatically strips markdown formatting and code snippets. |

*Works natively on Google Chrome, Microsoft Edge, Safari, and Chromium browsers with 0 third-party API costs.*

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
