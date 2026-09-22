"use strict";

const https = require("https");

function request(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;

    const req = https.request(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
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
            if (res.statusCode < 200 || res.statusCode >= 300 || parsed.success === false) {
              return reject(new Error(parsed?.errors?.[0]?.message || `Cloudflare HTTP ${res.statusCode}`));
            }
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Cloudflare returned invalid JSON: ${e.message}`));
          }
        });
      }
    );

    req.setTimeout(15000, () => req.destroy(new Error("Cloudflare request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateCloudflare({ messages, maxTokens = 1200, temperature = 0.2 } = {}) {
  if (!String(process.env.CLOUDFLARE_API_TOKEN || "").trim() ||
      !String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim()) {
    return { success: false, provider: "cloudflare", status: "not_configured", message: "Cloudflare credentials are not configured." };
  }

  try {
    const prompt = (Array.isArray(messages) ? messages : [])
      .map(m => `${String(m.role || "user").toUpperCase()}: ${String(m.content || "")}`)
      .join("\n");

    const response = await request({
      prompt,
      max_tokens: maxTokens,
      temperature
    });

    const content = response?.result?.response || "";

    if (!content.trim()) {
      return { success: false, provider: "cloudflare", status: "empty_response", message: "Cloudflare returned no usable text." };
    }

    return {
      success: true,
      provider: "cloudflare",
      model: "@cf/meta/llama-3.1-8b-instruct",
      content: content.trim()
    };
  } catch (error) {
    return { success: false, provider: "cloudflare", status: "request_failed", message: error.message };
  }
}

module.exports = { generateCloudflare };
