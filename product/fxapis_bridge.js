"use strict";

const fs = require("node:fs");
const path = require("node:path");
const OWNER_EMAIL = "mathiassimiyu52@gmail.com";
const ACCOUNT_FILE = path.join(__dirname, "..", "data", "fxapis-account.json");
// Keep FXAPIS requests server-side; never expose the API key to browser code.
const API_BASE = "https://api.fxapis.com/v1";

function isOwner(account) {
  return Boolean(account && (account.owner_account === true ||
    String(account.email || "").trim().toLowerCase() === OWNER_EMAIL));
}
function readSavedAccount() {
  try {
    const value = JSON.parse(fs.readFileSync(ACCOUNT_FILE, "utf8"));
    return value && typeof value.account_id === "string" ? value : null;
  } catch (_) { return null; }
}
function saveAccount(value) {
  fs.mkdirSync(path.dirname(ACCOUNT_FILE), { recursive: true });
  const temp = ACCOUNT_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temp, ACCOUNT_FILE);
}
function keyFromEnv() {
  return String(process.env.FXAPIS_API_KEY || process.env.FXAPIS_KEY || "").trim();
}
function safeAccount(item) {
  return {
    id: String(item.id || item.account_id || ""),
    name: String(item.name || "MT5 account").slice(0, 80),
    platform: String(item.platform || "mt5").slice(0, 20),
    status: String(item.status || item.state || "unknown").slice(0, 40),
    server: String(item.server || "").slice(0, 100),
    login: String(item.login || item.account_number || "").slice(0, 40),
    currency: String(item.currency || "").slice(0, 12),
    connected: Boolean(item.connected || /online|ready|warm|connected/i.test(String(item.status || item.state || "")))
  };
}
function registerFxapisRoutes(app, options = {}) {
  const getAuthenticatedAccount = options.getAuthenticatedAccount;
  async function requireOwner(req, res) {
    if (typeof getAuthenticatedAccount !== "function") {
      res.status(503).json({ success: false, error: "Dream Education authentication is unavailable." });
      return null;
    }
    let auth;
    try { auth = await getAuthenticatedAccount(req); }
    catch (_) {
      res.status(503).json({ success: false, error: "Could not verify your Dream Education account." });
      return null;
    }
    if (!auth || !auth.success || !auth.account) {
      res.status(Number(auth && auth.status) || 401).json({ success: false, error: auth && auth.error || "Sign in first." });
      return null;
    }
    if (!isOwner(auth.account)) {
      res.status(403).json({ success: false, error: "FXAPIS connection is restricted to the Dream Education owner." });
      return null;
    }
    return auth.account;
  }
  async function requestFxapis(url, options = {}) {
    const key = keyFromEnv();
    if (!key) throw Object.assign(new Error("FXAPIS API key is not configured on the server."), { code: "NOT_CONFIGURED" });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      return await fetch(url, {
        ...options,
        headers: {
          Authorization: "Bearer " + key,
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {})
        },
        signal: controller.signal
      });
    } finally { clearTimeout(timer); }
  }
  app.get("/api/dream-invest/fxapis/status", async (req, res) => {
    if (!await requireOwner(req, res)) return;
    if (!keyFromEnv()) return res.json({ success: true, configured: false, connected: false, trading_enabled: false, message: "Add FXAPIS_API_KEY in the server environment." });
    try {
      const response = await requestFxapis(API_BASE + "/accounts");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ success: false, error: response.status === 401 || response.status === 403 ? "FXAPIS rejected the server API key or its scopes. Check it in Render Environment." : "FXAPIS account status could not be retrieved." });
      const rows = Array.isArray(body) ? body : Array.isArray(body.accounts) ? body.accounts : Array.isArray(body.data) ? body.data : [];
      const saved = readSavedAccount();
      const selected = (saved && rows.find(row => String(row.id || row.account_id || "") === saved.account_id)) || (saved && { id: saved.account_id, name: saved.name, platform: "mt5", status: "saved_connection", server: saved.server, login: saved.login }) || null;
      return res.json({ success: true, configured: true, connected: Boolean(selected), trading_enabled: false, account: selected ? safeAccount(selected) : null, accounts_count: rows.length, message: selected ? "FXAPIS account is registered. Live orders are disabled in this integration." : "API key works. Connect your MT5 account below." });
    } catch (error) {
      return res.status(error && error.name === "AbortError" ? 504 : error.code === "NOT_CONFIGURED" ? 503 : 502).json({ success: false, error: error && error.name === "AbortError" ? "FXAPIS timed out. Try again." : error.message === "FXAPIS API key is not configured on the server." ? error.message : "Could not reach FXAPIS." });
    }
  });
  app.post("/api/dream-invest/fxapis/connect", async (req, res) => {
    if (!await requireOwner(req, res)) return;
    const login = String(req.body && req.body.login || "").trim();
    const server = String(req.body && req.body.server || "").trim().slice(0, 120);
    const password = String(req.body && req.body.password || "");
    const name = String(req.body && req.body.name || "Dream Invest MT5").trim().slice(0, 80);
    if (!/^\d{4,20}$/.test(login)) return res.status(400).json({ success: false, error: "Enter the numeric MT5 account login." });
    if (!server || server.length < 3 || /[\r\n]/.test(server)) return res.status(400).json({ success: false, error: "Enter the exact MT5 server name shown in MetaTrader 5." });
    if (password.length < 1 || password.length > 256) return res.status(400).json({ success: false, error: "Enter the MT5 trading password in this secure form." });
    if (!keyFromEnv()) return res.status(503).json({ success: false, error: "FXAPIS_API_KEY is not configured on the server." });
    const existing = readSavedAccount();
    if (existing) return res.status(409).json({ success: false, error: "An FXAPIS account is already saved. Contact support before connecting a different account; the same broker login can only be connected once per workspace." });
    try {
      const upstream = await requestFxapis(API_BASE + "/accounts", {
        method: "POST",
        body: JSON.stringify({ platform: "mt5", login, password, server, name, mode: "warm_on_demand" })
      });
      const body = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const safeMessage = String(body.message || body.error || "").toLowerCase();
        const message = upstream.status === 401 || upstream.status === 403
          ? "FXAPIS rejected the API key or required scopes. Check accounts:write in FXAPIS."
          : upstream.status === 409
            ? "This MT5 account may already be connected to this FXAPIS workspace."
            : /password|credential|login|server|account/.test(safeMessage)
              ? "FXAPIS could not verify these MT5 details. Confirm the login, trading password, and exact server in MetaTrader 5."
              : "FXAPIS did not accept the account connection.";
        return res.status(upstream.status === 400 || upstream.status === 422 ? 400 : 502).json({ success: false, error: message });
      }
      const item = body.account || body.data || body;
      const id = String(item.id || item.account_id || "");
      if (!id) return res.status(502).json({ success: false, error: "FXAPIS returned no account ID. No account was saved in Dream Education." });
      saveAccount({ account_id: id, name, server, login, saved_at: new Date().toISOString() });
      return res.status(201).json({ success: true, connected: true, trading_enabled: false, account: safeAccount({ ...item, id, name, server, login }), message: "MT5 account registered with FXAPIS. Live trading remains disabled." });
    } catch (error) {
      return res.status(error && error.name === "AbortError" ? 504 : 502).json({ success: false, error: error && error.name === "AbortError" ? "FXAPIS timed out. Check FXAPIS before retrying to avoid duplicate connections." : "Could not complete the FXAPIS connection request." });
    }
  });
}
module.exports = { registerFxapisRoutes, isOwner, safeAccount };
