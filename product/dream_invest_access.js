"use strict";

const defaultDataEngine = require("./data_engine");

function isDreamInvestEnabled(account) {
  return Boolean(account && account.dream_invest_enabled === true);
}

function registerDreamInvestAccessRoutes(app, options = {}) {
  const getAuthenticatedAccount = options.getAuthenticatedAccount;
  const dataEngine = options.dataEngine || defaultDataEngine;

  async function resolveAccount(req, res) {
    if (typeof getAuthenticatedAccount !== "function") {
      res.status(503).json({ success: false, error: "Dream Education authentication is unavailable." });
      return null;
    }
    try {
      const auth = await getAuthenticatedAccount(req);
      if (!auth || !auth.success || !auth.account) {
        res.status(Number(auth && auth.status) || 401).json({
          success: false,
          error: (auth && auth.error) || "Sign in to Dream Education first."
        });
        return null;
      }
      return auth.account;
    } catch (_) {
      res.status(503).json({ success: false, error: "Could not verify your Dream Education account." });
      return null;
    }
  }

  function getStoredAccount(account) {
    if (!account || !account.account_id || typeof dataEngine.getAccount !== "function") return null;
    return dataEngine.getAccount(account.account_id) || null;
  }

  app.get("/api/dream-invest/preferences", async (req, res) => {
    const account = await resolveAccount(req, res);
    if (!account) return;
    const stored = getStoredAccount(account);
    if (!stored) {
      return res.status(403).json({ success: false, error: "Your account is not linked to Dream Education." });
    }
    return res.json({ success: true, enabled: isDreamInvestEnabled(stored) });
  });

  app.post("/api/dream-invest/preferences", async (req, res) => {
    const account = await resolveAccount(req, res);
    if (!account) return;
    if (!req.body || typeof req.body.enabled !== "boolean") {
      return res.status(400).json({ success: false, error: "Choose whether Dream Invest should be enabled." });
    }
    const stored = getStoredAccount(account);
    if (!stored) {
      return res.status(403).json({ success: false, error: "Your account is not linked to Dream Education." });
    }
    stored.dream_invest_enabled = req.body.enabled;
    dataEngine.saveAccount(stored);
    return res.json({ success: true, enabled: isDreamInvestEnabled(stored) });
  });

  // Registered after the preference endpoints but before the feature routes:
  // every Dream Invest API path is opt-in protected, not just hidden in the UI.
  app.use("/api/dream-invest", async (req, res, next) => {
    const account = await resolveAccount(req, res);
    if (!account) return;
    const stored = getStoredAccount(account);
    if (!isDreamInvestEnabled(stored)) {
      return res.status(403).json({
        success: false,
        feature_disabled: true,
        error: "Dream Invest is turned off for this account. Enable it under Explore → Optional Features."
      });
    }
    return next();
  });
}

module.exports = { registerDreamInvestAccessRoutes, isDreamInvestEnabled };
