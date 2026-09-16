"use strict";

const https = require("https");

function request(url, options = {}) {
  const timeout = options.timeout || 3500;
  const headers = {
    "User-Agent": options.userAgent || "Dream-Education/1.0",
    ...(options.headers || {})
  };

  return new Promise((resolve, reject) => {
    const req = https.get(url, {headers}, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", c => body += c);
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.setTimeout(timeout, () => {
      req.destroy(new Error("request timeout"));
    });

    req.on("error", reject);
  });
}

async function json(url, options = {}) {
  const result = await request(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  });
  return JSON.parse(result.body);
}

module.exports = {request, json};
