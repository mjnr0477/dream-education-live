"use strict";

const https = require("https");

function request(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 429) {
            const error = new Error(
              parsed?.message ||
              parsed?.error?.message ||
              "Mistral rate limit exceeded"
            );
            error.statusCode = 429;
            error.retryAfter = res.headers["retry-after"] || null;
            return reject(error);
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(
                parsed?.message ||
                parsed?.error?.message ||
                `Mistral HTTP ${res.statusCode}`
              )
            );
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Mistral returned invalid JSON: ${e.message}`));
        }
      });
    });

    req.setTimeout(15000, () => req.destroy(new Error("Mistral request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateMistral({ messages, maxTokens = 1200, temperature = 0.2 } = {}) {
  if (!String(process.env.MISTRAL_API_KEY || "").trim()) {
    return { success: false, provider: "mistral", status: "not_configured", message: "MISTRAL_API_KEY is not configured." };
  }

  try {
    const response = await request({
      model: "mistral-small-latest",
      messages: Array.isArray(messages) ? messages : [{ role: "user", content: String(messages || "") }],
      max_tokens: maxTokens,
      temperature
    });

    const content = response?.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      return { success: false, provider: "mistral", status: "empty_response", message: "Mistral returned no usable text." };
    }

    return {
      success: true,
      provider: "mistral",
      model: response?.model || "mistral-small-latest",
      content: content.trim(),
      usage: response?.usage || null
    };
  } catch (error) {
    if (error.statusCode === 429) {
      return {
        success: false,
        provider: "mistral",
        status: "rate_limited",
        message: error.message,
        retry_after: error.retryAfter || null
      };
    }

    return {
      success: false,
      provider: "mistral",
      status: "request_failed",
      message: error.message
    };
  }
}

module.exports = { generateMistral };
