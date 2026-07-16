export default async function handler(req, res) {
  // 1. Origin and Referer checks to prevent cross-site requests
  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  
  const isAllowedOrigin = 
    origin.includes("localhost") || 
    origin.includes("127.0.0.1") || 
    origin.includes("iipc-assistant.vercel.app") ||
    referer.includes("localhost") ||
    referer.includes("127.0.0.1") ||
    referer.includes("iipc-assistant.vercel.app");

  if (!isAllowedOrigin) {
    return res.status(403).json({ error: "Access denied: Unauthorized origin" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  const backendUrl = process.env.CHAT_API_URL;
  const backendApiKey = process.env.BACKEND_API_KEY;

  if (!backendUrl) {
    return res.status(500).json({ error: "Backend URL not configured" });
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (backendApiKey) {
      headers["Authorization"] = `Bearer ${backendApiKey}`;
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
