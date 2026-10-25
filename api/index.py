"""Vercel Python entrypoint: serves the FastAPI app in backend/ as one serverless function (all /api/* routes)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402,F401  (Vercel looks for the ASGI `app`)
