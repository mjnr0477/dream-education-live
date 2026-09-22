"use strict";

const https = require("https");

function request(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const key = process.env.GEMINI_API_KEY;

    const req = https.request(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(parsed?.error?.message || `Gemini HTTP ${res.statusCode}`));
            }
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Gemini returned invalid JSON: ${e.message}`));
          }
        });
      }
    );

    req.setTimeout(15000, () => req.destroy(new Error("Gemini request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateGemini({ messages, maxTokens = 1200, temperature = 0.2 } = {}) {
  if (!String(process.env.GEMINI_API_KEY || "").trim()) {
    return { success: false, provider: "gemini", status: "not_configured", message: "GEMINI_API_KEY is not configured." };
  }

  try {
    const contents = (Array.isArray(messages) ? messages : []).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    }));

    const response = await request({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature
      }
    });

    const content = response?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("") || "";

    if (!content.trim()) {
      return { success: false, provider: "gemini", status: "empty_response", message: "Gemini returned no usable text." };
    }

    return {
      success: true,
      provider: "gemini",
      model: response?.modelVersion || "gemini-3.6-flash",
      content: content.trim(),
      usage: response?.usageMetadata || null
    };
  } catch (error) {
    return { success: false, provider: "gemini", status: "request_failed", message: error.message };
  }
}

module.exports = { generateGemini };
