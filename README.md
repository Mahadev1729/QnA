# QuickAnswer

QuickAnswer is a Streamlit question-and-answer chatbot powered by Groq, LangGraph, and Google Serper search. It can answer general questions, use web search for current information, and save conversations in a local SQLite database.

## Features

- ChatGPT-inspired Streamlit interface
- Groq-powered streaming responses
- Google Serper search for recent or web-based questions
- SQLite chat-history persistence by chat link
- Clear conversation control
- Local `.env` and Streamlit Secrets support

## Requirements

- Python 3.12 or newer
- A Groq API key
- A Google Serper API key

## Setup

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
SERPER_API_KEY=your_serper_api_key
```

Never commit `.env` or expose API keys in source code.

## Run Locally

```powershell
streamlit run apps/QnA_Bot.py
```

The app creates `chat_history.db` automatically. Chat history is associated with the `chat_id` in the browser URL and is ignored by Git.

## Streamlit Cloud

1. Deploy the repository from Streamlit Community Cloud.
2. Set the main file to `apps/QnA_Bot.py`.
3. Add these values under the app's Secrets settings:

```toml
GROQ_API_KEY = "your_groq_api_key"
SERPER_API_KEY = "your_serper_api_key"
```

For multi-instance production deployment, replace the local SQLite database with a shared database service.

## CI

GitHub Actions runs on pushes and pull requests to `main`. It installs the Python dependencies and checks that the Streamlit app compiles successfully.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
