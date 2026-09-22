"use strict";

const https = require("https");

function request(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
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
            return reject(new Error(parsed?.error?.message || `Groq HTTP ${res.statusCode}`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Groq returned invalid JSON: ${e.message}`));
        }
      });
    });

    req.setTimeout(15000, () => req.destroy(new Error("Groq request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateGroq({ messages, maxTokens = 1200, temperature = 0.2 } = {}) {
  if (!String(process.env.GROQ_API_KEY || "").trim()) {
    return { success: false, provider: "groq", status: "not_configured", message: "GROQ_API_KEY is not configured." };
  }

  try {
    const response = await request({
      model: "openai/gpt-oss-20b",
      messages: Array.isArray(messages) ? messages : [{ role: "user", content: String(messages || "") }],
      max_tokens: maxTokens,
      temperature
    });

    const content = response?.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      return { success: false, provider: "groq", status: "empty_response", message: "Groq returned no usable text." };
    }

    return {
      success: true,
      provider: "groq",
      model: response?.model || "openai/gpt-oss-20b",
      content: content.trim(),
      usage: response?.usage || null
    };
  } catch (error) {
    return { success: false, provider: "groq", status: "request_failed", message: error.message };
  }
}

module.exports = { generateGroq };
