const express = require("express");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.urlencoded({ extended: false }));

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body;

  try {
 const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: `
You are BuddyFit, a friendly but honest nutrition coach.

Your job:
1. Understand the user's message
2. Extract structured data
3. Respond like a human coach

Supported types:
- water (cups)
- weight (kg)
- steps (number)
- workout (minutes)

Return ONLY valid JSON in this format:
{
  "type": "water | weight | steps | workout | none",
  "value": number | null,
  "reply": "short motivating response in Hebrew (2-3 sentences, ask one question)"
}
`
    },
    {
      role: "user",
      content: incomingMsg
    }
  ],
});

let parsed;

try {
  parsed = JSON.parse(completion.choices[0].message.content);
} catch (e) {
  parsed = { type: "none", value: null, reply: "לא הבנתי עד הסוף 😅 תוכלי לנסח שוב?" };
}

console.log("PARSED:", parsed);

// שמירה ל-DB
if (parsed.type !== "none" && parsed.value !== null) {
  const { data, error } = await supabase
    .from("logs")
    .insert([
      {
        type: parsed.type,
        value: parsed.value
      }
    ]);

  console.log("DB RESULT:", data, error);
}

// תשובה
const reply = parsed.reply || "מעולה! ממשיכים 💪";

    // 🟡 שמירה ל-DB
    if (parsed.type !== "none" && parsed.value !== null) {
  const { data, error } = await supabase
    .from("logs")
    .insert([
      {
        type: parsed.type,
        value: parsed.value,
      }
    ]);

  console.log("DB RESULT:", data, error);
}

    // 🔵 שלב 2 — תגובת באדי
    const replyCompletion = await openai.chat.completions.create({
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

    const reply = replyCompletion.choices[0].message.content;

    // תשובה לוואטסאפ
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
