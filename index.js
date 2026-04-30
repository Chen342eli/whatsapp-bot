const express = require("express");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.urlencoded({ extended: false }));

// חיבור ל-OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body;

  // זיהוי מים
if (incomingMsg.includes("מים")) {
  const numberMatch = incomingMsg.match(/\d+/);
  const value = numberMatch ? parseInt(numberMatch[0]) : 1;

  await supabase.from("logs").insert([
    {
      type: "water",
      value: value
    }
  ]);
}

  try {
    // שליחה ל-AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
אתה באדי, מאמן תזונתי אישי.

הסגנון שלך:
- חברי, תומך ומעודד
- מדבר בגובה העיניים
- נותן חיזוקים אמיתיים

אבל:
- אם יש חוסר עקביות, אתה נהיה יותר ישיר
- לא שיפוטי, אבל כן דוחף לפעולה

חוקים:
- תשובות קצרות (עד 2-3 משפטים)
- תמיד לשאול שאלה אחת להמשך
`
        },
        {
          role: "user",
          content: incomingMsg
        }
      ],
    });

    const reply = completion.choices[0].message.content;

    // תשובה ל-WhatsApp
    const response = `
      <Response>
        <Message>${reply}</Message>
      </Response>
    `;

    res.set("Content-Type", "text/xml");
    res.send(response);

  } catch (error) {
    console.error(error);

    res.send(`
      <Response>
        <Message>יש תקלה קטנה, נסי שוב 🙏</Message>
      </Response>
    `);
  }
});


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
