export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  const backendUrl = process.env.VITE_CHAT_API_URL;
  const hfToken = process.env.HF_TOKEN;

  if (!backendUrl) {
    return res.status(500).json({ error: "Backend URL not configured" });
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (hfToken) {
      headers["Authorization"] = `Bearer ${hfToken}`;
    }

    const response = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(502).json({ error: "Backend request failed" });
  }
}
