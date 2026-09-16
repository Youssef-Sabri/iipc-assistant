export default async function handler(req, res) {
  // 1. Origin and Referer checks to prevent cross-site requests
  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  
  const isAllowedOrigin = 
    origin.includes("localhost") || 
    origin.includes("127.0.0.1") || 
    origin.endsWith(".vercel.app") ||
    origin.includes("iipc-assistant.vercel.app") ||
    referer.includes("localhost") ||
    referer.includes("127.0.0.1") ||
    referer.includes(".vercel.app") ||
    referer.includes("iipc-assistant.vercel.app");

  if (!isAllowedOrigin) {
    return res.status(403).json({ error: "Access denied: Unauthorized origin" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Invalid request payload. Expected JSON object." });
  }

  const { query } = req.body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Query is required and must be a non-empty string." });
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length > 2000) {
    return res.status(400).json({ error: "Query exceeds maximum limit of 2000 characters." });
  }

  const backendUrl = process.env.CHAT_API_URL;
  const hfToken = process.env.HF_TOKEN;

  if (!backendUrl) {
    return res.status(500).json({ error: "Backend URL not configured" });
  }

  const cleanBaseUrl = backendUrl.replace(/\/+$/, "");
  const targetUrl = cleanBaseUrl.endsWith("/chat") ? cleanBaseUrl : `${cleanBaseUrl}/chat`;

  try {
    const headers = { "Content-Type": "application/json" };
    if (hfToken) {
      headers["Authorization"] = `Bearer ${hfToken.trim()}`;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: trimmedQuery }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Backend returned non-JSON response (Status ${response.status}):`, responseText.slice(0, 500));
      return res.status(response.status >= 400 ? response.status : 502).json({ 
        error: "Backend service returned an invalid non-JSON response",
        status: response.status
      });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(502).json({ error: "Backend request failed" });
  }
}
