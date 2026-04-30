const express = require("express");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.urlencoded({ extended: false }));

// 🔑 חיבור ל-AI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔑 חיבור לדאטאבייס
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🎯 נקודת כניסה מהוואטסאפ
app.post("/webhook", async (req, res) => {
  try {
    // 1️⃣ קבלת ההודעה מהמשתמש
    const incomingMsg = req.body.Body;
    console.log("Incoming:", incomingMsg);

    // =====================================================
    // 2️⃣ הבנה (AI) → הופך טקסט לנתונים
    // =====================================================
    const parseCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You extract structured data from messages.

Water rules:
- cup = 250 ml
- bottle = 720 ml

Return JSON:
{
  "type": "water | weight | steps | workout | none",
  "value": number,
  "unit": "ml | cup | bottle | none"
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
      parsed = JSON.parse(parseCompletion.choices[0].message.content);
    } catch (e) {
      parsed = { type: "none", value: null, unit: "none" };
    }

    console.log("PARSED:", parsed);

    // =====================================================
    // 3️⃣ שמירה לדאטאבייס
    // =====================================================
    if (parsed.type !== "none" && parsed.value !== null) {

      let finalValue = parsed.value;

      // 💧 אם זה מים → תמיד לשמור במ״ל
      if (parsed.type === "water") {
        if (parsed.unit === "cup") {
          finalValue = parsed.value * 250;
        } else if (parsed.unit === "bottle") {
          finalValue = parsed.value * 720;
        }
      }

      const { data, error } = await supabase
        .from("logs")
        .insert([
          {
            type: parsed.type,
            value: finalValue
          }
        ]);

      console.log("DB RESULT:", data, error);
    }

    // =====================================================
    // 4️⃣ חישוב מצב יומי (כמה שתית היום)
    // =====================================================
    const today = new Date().toISOString().split("T")[0];

    const { data: waterLogs } = await supabase
      .from("logs")
      .select("*")
      .eq("type", "water")
      .gte("created_at", today);

    const totalWater = waterLogs.reduce((sum, log) => sum + log.value, 0);

    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_water_target_ml")
      .limit(1)
      .single();

    const target = profile?.daily_water_target_ml || 2000;

    console.log("TOTAL WATER:", totalWater, "TARGET:", target);

    // =====================================================
    // 5️⃣ תגובה חכמה (AI)
    // =====================================================
    const replyCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a supportive but honest nutrition coach.

Rules:
- Be friendly but not soft
- If user is behind → push
- If user is doing well → encourage
- Keep answers short (2 sentences)
- Always ask one question
`
        },
        {
          role: "user",
          content: `
User message: ${incomingMsg}

User water today: ${totalWater} ml
Target: ${target} ml
`
        }
      ],
    });

    const reply = replyCompletion.choices[0].message.content;

    // =====================================================
    // 6️⃣ החזרת תשובה לוואטסאפ
    // =====================================================
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

// 🚀 הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
