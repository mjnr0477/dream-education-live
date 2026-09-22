"use strict";

const https = require("https");

function requestOpenRouter(payload, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "HTTP-Referer": "https://dreameducation.app",
          "X-Title": "Dream Education"
        }
      },
      res => {
        let data = "";

        res.on("data", chunk => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);

            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(
                new Error(
                  parsed?.error?.message ||
                  `OpenRouter HTTP ${res.statusCode}`
                )
              );
            }

            resolve(parsed);
          } catch (error) {
            reject(
              new Error(
                `OpenRouter returned invalid JSON: ${error.message}`
              )
            );
          }
        });
      }
    );

    req.setTimeout(timeout, () => {
      req.destroy(new Error("OpenRouter request timed out"));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateOpenRouter({
  messages,
  maxTokens = 600,
  temperature = 0.2
} = {}) {
  if (!String(process.env.OPENROUTER_API_KEY || "").trim()) {
    return {
      success: false,
      provider: "openrouter_free",
      status: "not_configured",
      message: "OPENROUTER_API_KEY is not configured."
    };
  }

  try {
    const response = await requestOpenRouter({
      model: "openrouter/free",
      messages: Array.isArray(messages)
        ? messages
        : [{ role: "user", content: String(messages || "") }],
      max_tokens: maxTokens,
      temperature
    });

    const choice = response?.choices?.[0];

    const content =
      typeof choice?.message?.content === "string"
        ? choice.message.content
        : Array.isArray(choice?.message?.content)
          ? choice.message.content
              .map(part =>
                typeof part === "string"
                  ? part
                  : part?.text || ""
              )
              .join("")
          : typeof choice?.text === "string"
            ? choice.text
            : "";

    if (!content.trim()) {
      return {
        success: false,
        provider: "openrouter_free",
        status: "empty_response",
        message: "OpenRouter returned no usable text.",
        raw: response
      };
    }

    return {
      success: true,
      provider: "openrouter_free",
      model: response?.model || "openrouter/free",
      content: content.trim(),
      usage: response?.usage || null,
      raw: response
    };
  } catch (error) {
    return {
      success: false,
      provider: "openrouter_free",
      status: "request_failed",
      message: error.message
    };
  }
}

module.exports = {
  generateOpenRouter
};
