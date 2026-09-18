# QuickAnswer AI - Full-Stack React & FastAPI QnA Chatbot

**QuickAnswer** is an intelligent AI Question-and-Answer chatbot with a decoupled **React (Vite)** frontend, **FastAPI** backend, and local **SQLite3** database persistence. It leverages **Groq** for high-speed LLM reasoning and **Google Serper** for live web-augmented answers with real-time Server-Sent Events (SSE) streaming.

---

## 🌟 Key Features

- ⚡ **Lightning Fast LLM Reasoning**: Powered by Groq models (`llama-3.3-70b-versatile`, `llama3-70b-8192`, etc.)
- 🌐 **Live Web Search**: Google Serper integration automatically queries the live web for real-time news, documentation, and current facts.
- 💬 **Real-time SSE Streaming**: Word-by-word token streaming with smooth typing cursor and markdown rendering.
- 🗄️ **SQLite3 Persistence**: Automatic database storage for conversations, messages, and timestamps.
- 🎨 **Modern Premium UI**: Sleek dark-mode aesthetic, glassmorphic cards, starter prompt suggestions, responsive sidebar drawer, and syntax-highlighted code blocks.
- 🐳 **Production & Deployment Ready**: Multi-stage `Dockerfile`, `docker-compose.yml`, and unified static asset serving via FastAPI.

---

## 🏗️ Architecture Overview

```
QuickAnswer/
├── backend/
│   ├── main.py             # FastAPI server with CORS & SSE endpoints
│   ├── agent.py            # LangChain agent with Groq & Google Serper search
│   ├── database.py         # SQLite3 database helper & schema management
│   └── requirements.txt    # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React UI component
│   │   ├── services/api.js # SSE streaming reader & REST API client
│   │   └── index.css       # Premium dark glassmorphism design system
│   ├── package.json
│   └── vite.config.js
├── Dockerfile              # Multi-stage production container
├── docker-compose.yml      # Container orchestration
├── run_dev.py              # Local FastAPI runner script
├── chat_history.db         # Auto-generated SQLite database
└── .env                    # API keys configuration
```

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- **Python 3.12+**
- **Node.js 18+** & **npm**
- [Groq API Key](https://console.groq.com/keys)
- [Google Serper API Key](https://serper.dev/) (Optional for search)

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
GROQ_API_KEY=your_groq_api_key_here
SERPER_API_KEY=your_serper_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=8000
```

### 3. Run Backend (FastAPI)
```powershell
# Activate your virtual environment (if using one)
.\qnaenv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI server (http://127.0.0.1:8000)
python run_dev.py
```

### 4. Run Frontend (React + Vite)
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser!

---

## 📦 Production Deployment Options

### Option 1: Docker / Docker Compose (Recommended)
Deploy everything in a single, lightweight container:
```bash
docker compose up -d --build
```
Your application will be live at `http://localhost:8000`.

### Option 2: Build React and Serve Monolithically via FastAPI
FastAPI automatically serves the built React static files when `frontend/dist` exists:
```bash
cd frontend
npm run build
cd ..
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Option 3: Cloud Hosting (Render / Railway / Fly.io / DigitalOcean)
1. Link your GitHub repository.
2. Choose **Docker** environment or use the provided `Dockerfile`.
3. Add environment variables in the cloud dashboard (`GROQ_API_KEY`, `SERPER_API_KEY`).
4. Deploy!

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and API key checks |
| `GET` | `/api/chats` | List all conversation sessions |
| `POST` | `/api/chats` | Create a new conversation session |
| `GET` | `/api/chats/{chat_id}` | Retrieve history for a specific conversation |
| `DELETE` | `/api/chats/{chat_id}` | Delete conversation and messages |
| `POST` | `/api/chat/stream` | **SSE Streaming endpoint** for real-time AI responses |
| `POST` | `/api/chat/message` | Non-streaming JSON endpoint |

---

## 📄 License
This project is licensed under the MIT License. See [LICENSE](LICENSE).
