# Farmer Helps - FastAPI Gemini voice endpoint
#
# Install:
#   pip install fastapi uvicorn google-genai python-dotenv
#
# .env:
#   GEMINI_API_KEY=your_real_key_here
#
# IMPORTANT: Keep the Gemini API key on the backend.

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

load_dotenv()

router = APIRouter()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


class VoiceRequest(BaseModel):
    message: str
    language: str = "en-IN"
    context: str = "Farmer Helps agricultural assistant"


@router.post("/api/voice")
def voice_assistant(req: VoiceRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")

    language_instruction = (
        "Answer in natural Hindi (Devanagari)."
        if req.language == "hi-IN"
        else "Answer in clear, simple English."
    )

    prompt = f"""
You are the Farmer Helps AI agricultural assistant.

{language_instruction}

Help farmers with practical, easy-to-understand information.
Topics can include weather, mandi rates, crop diseases, farming practices,
government schemes, and farmer helplines.

User question:
{req.message}

Give a concise, useful answer. Do not claim live data unless it was supplied
by the application's APIs. If the question requires live weather or mandi data,
say that the relevant live feature should be used rather than inventing values.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        answer = getattr(response, "text", None)

        if not answer:
            raise HTTPException(status_code=502, detail="Gemini returned no text")

        return {"answer": answer.strip()}

    except HTTPException:
        raise
    except Exception as exc:
        print("Gemini error:", exc)
        raise HTTPException(status_code=502, detail="Gemini request failed")
