"""
Run this script to verify your Gemini API key works with AgroShield AI.
Usage: python test_gemini.py
"""

import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

API_KEY = os.getenv("GEMINI_API_KEY")

import pytest

def test_gemini_connectivity():
    if not API_KEY:
        print("❌ GEMINI_API_KEY not found in .env file.")
        print("   The app will run in mock mode (no AI responses).")
        print(f"   Create a .env file at: {env_path}")
        print("   Add: GEMINI_API_KEY=your_key_here")
        pytest.skip("GEMINI_API_KEY not found in .env file")

    try:
        import google.generativeai as genai
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(
            "What is the best time to spray fungicide on tomatoes? Keep response under 50 words."
        )
        assert response and response.text, "Gemini API returned empty response."
        print("✅ Gemini API connection successful!")
        print(f"   Response: {response.text[:100]}...")
    except ImportError:
        print("❌ google-generativeai not installed. Run: pip install google-generativeai")
        assert False, "google-generativeai not installed"
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        assert False, f"Gemini API error: {e}"

if __name__ == "__main__":
    test_gemini_connectivity()
