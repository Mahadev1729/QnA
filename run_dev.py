import os
import subprocess
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def main():
    print("==================================================")
    print("🚀 Starting QuickAnswer Full-Stack Dev Environment")
    print("==================================================")

    # Check python executable
    venv_python = BASE_DIR / "qnaenv" / "Scripts" / "python.exe"
    python_cmd = str(venv_python) if venv_python.exists() else sys.executable

    print("\n1. Starting FastAPI Backend (http://127.0.0.1:8000)...")
    backend_cmd = [
        python_cmd,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
        "--reload",
    ]

    try:
        subprocess.run(backend_cmd, cwd=str(BASE_DIR))
    except KeyboardInterrupt:
        print("\nStopping QuickAnswer server.")

if __name__ == "__main__":
    main()
