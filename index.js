const OpenAI = require("openai");
const express = require("express");
const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.urlencoded({ extended: false }));

app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body;

  console.log("Message:", incomingMsg);

const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: "אתה באדי, מאמן תזונתי אישי תומך ומעודד"
    },
    {
      role: "user",
      content: incomingMsg
    }
  ],
});

const reply = completion.choices[0].message.content;

const response = `
  <Response>
    <Message>${reply}</Message>
  </Response>
`;

  res.set("Content-Type", "text/xml");
  res.send(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
