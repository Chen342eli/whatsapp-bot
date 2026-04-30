const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: false }));

app.post("/webhook", (req, res) => {
  const incomingMsg = req.body.Body;

  const response = `
    <Response>
      <Message>קיבלתי: ${incomingMsg}</Message>
    </Response>
  `;

  res.set("Content-Type", "text/xml");
  res.send(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
