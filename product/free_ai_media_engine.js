"use strict";

const FREE_AI_BASE_URL = "https://api.free.ai/v1";

function sendAuthFailure(res, auth) {
  return res.status(Number(auth?.status) || 401).json({
    success: false,
    error: auth?.error || "Authentication required."
  });
}

function normalizeText(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function parseResponse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return { output: raw };
  }
}

const requestWindows = new Map();
const REQUEST_LIMIT = 12;
const REQUEST_WINDOW_MS = 10 * 60 * 1000;

function allowRequest(account) {
  const identity = String(account?.id || account?.user_id || account?.email || "authenticated-user");
  const now = Date.now();
  const existing = requestWindows.get(identity);
  if (!existing || now - existing.startedAt >= REQUEST_WINDOW_MS) {
    requestWindows.set(identity, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= REQUEST_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((REQUEST_WINDOW_MS - (now - existing.startedAt)) / 1000))
    };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function registerFreeAiMediaRoutes(app, options = {}) {
  const getAuthenticatedAccount = options.getAuthenticatedAccount;

  async function requireAccount(req, res) {
    if (typeof getAuthenticatedAccount !== "function") {
      res.status(503).json({ success: false, error: "Authentication is unavailable." });
      return null;
    }

    try {
      const auth = await getAuthenticatedAccount(req);
      if (!auth?.success || !auth.account) {
        sendAuthFailure(res, auth);
        return null;
      }
      return auth.account;
    } catch (error) {
      res.status(503).json({ success: false, error: "Could not verify your Dream Education account." });
      return null;
    }
  }

  app.get("/api/media-studio/status", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;

    res.json({
      success: true,
      provider: "free.ai",
      configured: Boolean(String(process.env.FREE_AI_API_KEY || "").trim()),
      supportedActions: ["chat", "image", "tts", "translate", "freetts"]
    });
  });

  app.post("/api/media-studio/generate", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;

    const rate = allowRequest(account);
    if (!rate.allowed) {
      res.set("Retry-After", String(rate.retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: "Media Studio is temporarily rate limited. Please try again shortly.",
        retry_after_seconds: rate.retryAfterSeconds
      });
    }

    const action = normalizeText(req.body?.action, 20).toLowerCase();
    const providerKey = action === "freetts" ? "FREETTS_API_KEY" : "FREE_AI_API_KEY";
    const apiKey = String(process.env[providerKey] || "").trim();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: providerKey + " is not configured on the server. Add it to Render Environment."
      });
    }

    const prompt = normalizeText(req.body?.prompt, 1200);
    const text = normalizeText(req.body?.text, 4000);
    const target = normalizeText(req.body?.target, 16) || "en";

    let endpoint;
    let payload;

    if (action === "freetts") {
      if (!text) {
        return res.status(400).json({ success: false, error: "Enter text to turn into speech." });
      }
      const voice = normalizeText(req.body?.voice, 80) || "en-US-JennyNeural";
      const rate = normalizeText(req.body?.rate, 8) || "+0%";
      const pitch = normalizeText(req.body?.pitch, 8) || "+0Hz";
      if (!/^[+-]?(?:0|[1-9]\\d?)(?:%|Hz)$/.test(rate) || !/^[+-]?(?:0|[1-9]\\d?)(?:Hz)$/.test(pitch)) {
        return res.status(400).json({ success: false, error: "Use a speaking rate such as +0% and pitch such as +0Hz." });
      }
      endpoint = "https://freetts.org/api/v1/tts";
      payload = { text: text.slice(0, 5000), voice, rate, pitch, output_format: "mp3" };
    } else if (action === "image") {
      if (prompt.length < 3) {
        return res.status(400).json({ success: false, error: "Enter a description for the image." });
      }
      endpoint = "/image/generate/";
      payload = { prompt, model: "sdxl" };
    } else if (action === "tts") {
      if (!text) {
        return res.status(400).json({ success: false, error: "Enter text to turn into speech." });
      }
      endpoint = "/tts/";
      payload = { text, voice: "default", model: "kokoro" };
    } else if (action === "translate") {
      if (!text) {
        return res.status(400).json({ success: false, error: "Enter text to translate." });
      }
      endpoint = "/translate/";
      payload = { text, target };
    } else if (action === "chat") {
      if (!text) {
        return res.status(400).json({ success: false, error: "Enter a question or instruction." });
      }
      endpoint = "/chat/";
      payload = { messages: [{ role: "user", content: text }], model: "qwen7b" };
    } else {
      return res.status(400).json({
        success: false,
        error: "Unsupported action. Choose chat, image, speech, or translation."
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const upstream = await fetch(action === "freetts" ? endpoint : FREE_AI_BASE_URL + endpoint, {
        method: "POST",
        headers: {
          ...(action === "freetts" ? { "x-api-key": apiKey } : { Authorization: "Bearer " + apiKey }),
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const raw = await upstream.text();
      const result = parseResponse(raw);

      if (!upstream.ok) {
        const safeMessage = normalizeText(
          result?.detail || result?.message || result?.error,
          400
        );
        return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({
          success: false,
          provider: "free.ai",
          error: safeMessage || "Free.ai could not complete that request. Check its model limits and API documentation.",
          upstream_status: upstream.status
        });
      }

      if (action === "freetts") {
        const fileId = normalizeText(result?.file_id, 80);
        if (!fileId || !/^[a-f0-9-]{20,80}$/i.test(fileId)) {
          return res.status(502).json({
            success: false,
            provider: "freetts",
            error: "FreeTTS did not return a valid audio file ID."
          });
        }
        return res.json({
          success: true,
          provider: "freetts",
          action,
          result: {
            file_id: fileId,
            audio_url: "https://freetts.org/api/audio/" + encodeURIComponent(fileId),
            subtitles_url: "https://freetts.org/api/srt/" + encodeURIComponent(fileId),
            voice: normalizeText(req.body?.voice, 80) || "en-US-JennyNeural"
          }
        });
      }

      return res.json({
        success: true,
        provider: "free.ai",
        action,
        result
      });
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      return res.status(timedOut ? 504 : 502).json({
        success: false,
        provider: "free.ai",
        error: timedOut
          ? "Free.ai took too long to respond. Please try again."
          : "Could not reach Free.ai. Please try again later."
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}

module.exports = { registerFreeAiMediaRoutes };
