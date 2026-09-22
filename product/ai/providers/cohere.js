"use strict";

const https = require("https");

function request(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(parsed?.message || `Cohere HTTP ${res.statusCode}`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Cohere returned invalid JSON: ${e.message}`));
        }
      });
    });

    req.setTimeout(15000, () => req.destroy(new Error("Cohere request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateCohere({ messages, maxTokens = 1200, temperature = 0.2 } = {}) {
  if (!String(process.env.COHERE_API_KEY || "").trim()) {
    return { success: false, provider: "cohere", status: "not_configured", message: "COHERE_API_KEY is not configured." };
  }

  try {
    const response = await request({
      model: "command-r7b-12-2024",
      messages: Array.isArray(messages) ? messages : [{ role: "user", content: String(messages || "") }],
      max_tokens: maxTokens,
      temperature
    });

    const content = response?.message?.content
      ?.map(part => part?.text || "")
      .join("") || "";

    if (!content.trim()) {
      return { success: false, provider: "cohere", status: "empty_response", message: "Cohere returned no usable text." };
    }

    return {
      success: true,
      provider: "cohere",
      model: response?.model || "command-r7b-12-2024",
      content: content.trim(),
      usage: response?.usage || null
    };
  } catch (error) {
    return { success: false, provider: "cohere", status: "request_failed", message: error.message };
  }
}

module.exports = { generateCohere };
