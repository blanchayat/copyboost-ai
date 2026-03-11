require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.post("/anthropic", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Missing ANTHROPIC_API_KEY in environment." });
    }

    const body = {
      ...(req.body || {}),
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
    };

    const upstreamRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const text = await upstreamRes.text();
    res
      .status(upstreamRes.status)
      .set("Content-Type", upstreamRes.headers.get("content-type") || "application/json")
      .send(text);
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    res.status(500).json({ error: "Error calling Anthropic API through proxy." });
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Anthropic proxy listening on http://localhost:${PORT}`);
  });
}

