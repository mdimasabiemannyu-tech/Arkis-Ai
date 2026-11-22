
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const accessToken = process.env.ARKIS_ACCESS_TOKEN;

    if (!apiKey || !accessToken) {
      return res.status(500).json({
        error: "Server configuration missing"
      });
    }

    const authorization = req.headers.authorization;

    if (authorization !== `Bearer ${accessToken}`) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message || message.length > 4000) {
      return res.status(400).json({
        error: "Message is required (maximum 4000 characters)"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are ARKIS, a helpful personal AI assistant. Respond naturally in Indonesian unless the user uses another language. Be accurate, concise, honest, and useful. Never pretend to perform actions you cannot perform."
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);
      return res.status(502).json({
        error: "Gemini service error"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {
      return res.status(502).json({
        error: "No response from Gemini"
      });
    }

    return res.status(200).json({
      success: true,
      assistant: "ARKIS",
      reply
    });

  } catch (error) {
    console.error("ARKIS error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};
