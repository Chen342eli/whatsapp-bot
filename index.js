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
  try {
    const incomingMsg = req.body.Body;

    console.log("Incoming:", incomingMsg);

    // 🔥 קריאה אחת ל-AI (גם הבנה וגם תשובה)
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
      parsed = {
        type: "none",
        value: null,
        reply: "לא הבנתי עד הסוף 😅 תוכלי לנסח שוב?"
      };
    }

    console.log("PARSED:", parsed);

    // 🟢 שמירה ל-DB
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

    // 🔵 תשובה למשתמש
    const reply = parsed.reply || "מעולה! ממשיכים 💪";

    const response = `
      <Response>
        <Message>${reply}</Message>
      </Response>
    `;

    res.set("Content-Type", "text/xml");
    res.send(response);

  } catch (error) {
    console.error("ERROR:", error);

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
