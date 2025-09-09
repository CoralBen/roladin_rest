import sqlite3
import requests
import json

# שליפת פריטים זמינים מהתפריט
def get_menu_items():
    conn = sqlite3.connect("roladin_restaurant.db")
    cursor = conn.cursor()
    cursor.execute("SELECT name, description, price, category FROM menu_items WHERE is_available=1")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return "כרגע אין פריטים זמינים בתפריט."

    return "\n".join([
        f"{name} ({category}) - {description}, ₪{price}"
        for name, description, price, category in rows
    ])

# בניית פרומפט
def build_prompt(user_question):
    menu_info = get_menu_items()
    return f"""
    אתה עוזר וירטואלי של מסעדת רולדין.
    זהו התפריט שלנו:
    {menu_info}

    השאלה של המשתמש:
    {user_question}

    ענה תשובה ברורה וקצרה, התבסס על המידע למעלה.
    """

# שליחה לאולמה
def get_kosher_response(prompt, model="llama2"):
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt},
            stream=True,
            timeout=120
        )

        full_text = ""
        for line in response.iter_lines():
            if line:
                data = json.loads(line.decode("utf-8"))
                if "response" in data:
                    full_text += data["response"]

        return full_text.strip()

    except Exception as e:
        return f"שגיאה בעת הפנייה ל-Ollama: {e}"

# פונקציה מרכזית
def ask_with_context(user_question, model="llama2"):
    prompt = build_prompt(user_question)
    return get_kosher_response(prompt, model=model)
