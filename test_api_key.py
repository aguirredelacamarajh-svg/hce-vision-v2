import google.generativeai as genai
import os

api_key = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

try:
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
    print("Success! API Key works.")
except Exception as e:
    print(f"Error: {e}")
