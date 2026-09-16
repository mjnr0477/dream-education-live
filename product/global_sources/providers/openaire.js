"use strict";

const https = require("https");

function getJson(url, timeout = 3500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Dream-Education/1.0"
      }
    }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`OpenAIRE HTTP ${res.statusCode}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("OpenAIRE returned invalid JSON"));
        }
      });
    });

    req.setTimeout(timeout, () => req.destroy(new Error("OpenAIRE timeout")));
    req.on("error", reject);
  });
}

async function searchOpenAIRE(query, limit = 5) {
  const params = new URLSearchParams({
    search: String(query || "").trim(),
    type: "publication",
    accessRightLabel: '"Open Access"',
    page: "1",
    pageSize: String(Math.min(Math.max(Number(limit) || 5, 1), 100))
  });

  const data = await getJson(
    `https://api.openaire.eu/graph/v3/research-products?${params.toString()}`
  );

  const results = Array.isArray(data.results) ? data.results : [];

  return results.map(item => {
    const title =
      item.mainTitle ||
      item.title ||
      "OpenAIRE research publication";

    const description =
      item.description ||
      item.abstract ||
      "";

    const identifiers = Array.isArray(item.originalIds)
      ? item.originalIds
      : [];

    const url =
      item.url ||
      item.bestAccessRight?.url ||
      identifiers[0] ||
      "";

    return {
      provider: "openaire",
      source: "OpenAIRE",
      title: String(title),
      extract: String(description),
      url: String(url),
      open_access: true
    };
  }).filter(item => item.title && item.extract.length >= 40);
}

module.exports = { searchOpenAIRE };
