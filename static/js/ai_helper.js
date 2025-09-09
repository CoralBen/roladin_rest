async function askAI() {
    const question = document.getElementById("question").value.trim();
    const answerBox = document.getElementById("answer");

    if (!question) {
        answerBox.style.display = "block";
        answerBox.className = "alert alert-warning";
        answerBox.innerText = "נא לכתוב שאלה לפני השליחה.";
        return;
    }

    // הצגת סטטוס "טוען..."
    answerBox.style.display = "block";
    answerBox.className = "alert alert-info";
    answerBox.innerText = "⏳ מחפש תשובה עבורך...";

    try {
        const res = await fetch("/ask_ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        const data = await res.json();

        if (data.ok) {
            answerBox.className = "alert alert-success";
            answerBox.innerText = data.answer;
        } else {
            answerBox.className = "alert alert-danger";
            answerBox.innerText = data.answer || "❌ לא התקבלה תשובה.";
        }
    } catch (err) {
        console.error("שגיאת רשת:", err);
        answerBox.className = "alert alert-danger";
        answerBox.innerText = "❌ שגיאה בתקשורת מול השרת.";
    }
}
