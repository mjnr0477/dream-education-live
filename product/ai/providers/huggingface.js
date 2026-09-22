"use strict";

const https = require("https");

function request(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
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
            return reject(new Error(parsed?.error?.message || `Hugging Face HTTP ${res.statusCode}`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Hugging Face returned invalid JSON: ${e.message}`));
        }
      });
    });

    req.setTimeout(15000, () => req.destroy(new Error("Hugging Face request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateHuggingFace({ messages, maxTokens = 1200, temperature = 0.2 } = {}) {
  if (!String(process.env.HF_TOKEN || "").trim()) {
    return { success: false, provider: "huggingface", status: "not_configured", message: "HF_TOKEN is not configured." };
  }

  try {
    const response = await request({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: Array.isArray(messages) ? messages : [{ role: "user", content: String(messages || "") }],
      max_tokens: maxTokens,
      temperature
    });

    const content = response?.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      return { success: false, provider: "huggingface", status: "empty_response", message: "Hugging Face returned no usable text." };
    }

    return {
      success: true,
      provider: "huggingface",
      model: response?.model || "meta-llama/Llama-3.1-8B-Instruct",
      content: content.trim(),
      usage: response?.usage || null
    };
  } catch (error) {
    return { success: false, provider: "huggingface", status: "request_failed", message: error.message };
  }
}

module.exports = { generateHuggingFace };
