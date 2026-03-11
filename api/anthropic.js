module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }));
    return;
  }

  try {
    const body = {
      ...(req.body || {}),
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024
    };

    const upstreamRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    const text = await upstreamRes.text();
    res.statusCode = upstreamRes.status;
    res.setHeader("Content-Type", upstreamRes.headers.get("content-type") || "application/json");
    res.end(text);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Proxy error" }));
  }
};

