import requests
import json

# שולחים בקשה לשרת של Ollama
response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "llama2",
        "prompt": "תן לי המלצה על קינוח שוקולד"
    },
    stream=True  # חשוב!! כדי לקרוא שורה שורה
)

# מדפיסים רק את הטקסט מתוך הזרם
for line in response.iter_lines():
    if line:
        data = json.loads(line.decode("utf-8"))
        if "response" in data:
            print(data["response"], end="", flush=True)

print("\n--- סוף התשובה ---")
