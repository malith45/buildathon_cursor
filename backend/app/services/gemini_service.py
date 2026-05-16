import google.generativeai as genai

from app.config import get_settings

MODEL = "gemini-2.0-flash"


def generate_json(system_instruction: str, user_content: str) -> str:
    settings = get_settings()
    genai.configure(api_key=settings.GEMINI_API_KEY)

    model = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system_instruction,
        generation_config={"response_mime_type": "application/json"},
    )

    result = model.generate_content(user_content)
    text = result.text
    if not text:
        raise ValueError("Empty response from Gemini")
    return text
