"use strict";

// Dream Wi-Fi package catalogue foundation.
// Durations are fixed; retail prices are configurable and remain unpublished
// when no price has been approved. Checkout stays disabled until a real hotspot,
// provider authorization, payment verification, and expiry flow pass end-to-end.
const PACKAGE_DEFINITIONS = [
  { id: "hour_1", name: "1 hour", duration_seconds: 60 * 60, price_env: "DREAM_WIFI_PRICE_1H", example_price_kes: 5 },
  { id: "hours_2", name: "2 hours", duration_seconds: 2 * 60 * 60, price_env: "DREAM_WIFI_PRICE_2H" },
  { id: "hours_5", name: "5 hours", duration_seconds: 5 * 60 * 60, price_env: "DREAM_WIFI_PRICE_5H" },
  { id: "hours_12", name: "12 hours", duration_seconds: 12 * 60 * 60, price_env: "DREAM_WIFI_PRICE_12H" },
  { id: "day_1", name: "1 day", duration_seconds: 24 * 60 * 60, price_env: "DREAM_WIFI_PRICE_1D" },
  { id: "week_1", name: "1 week", duration_seconds: 7 * 24 * 60 * 60, price_env: "DREAM_WIFI_PRICE_1W" },
  { id: "month_1", name: "1 month", duration_seconds: 30 * 24 * 60 * 60, price_env: "DREAM_WIFI_PRICE_1M" },
  { id: "year_1", name: "1 year", duration_seconds: 365 * 24 * 60 * 60, price_env: "DREAM_WIFI_PRICE_1Y" }
];

function positivePrice(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 1000000
    ? Number(amount.toFixed(2))
    : null;
}

function getDreamWifiPackages(env = process.env) {
  return PACKAGE_DEFINITIONS.map((definition) => {
    const configured = positivePrice(env[definition.price_env]);
    const price = configured === null && definition.example_price_kes
      ? definition.example_price_kes
      : configured;
    return {
      id: definition.id,
      name: definition.name,
      duration_seconds: definition.duration_seconds,
      duration_minutes: definition.duration_seconds / 60,
      price_kes: price,
      // An illustrative amount is visible for planning, not a configured sale price.
      price_configured: configured !== null,
      price_source: configured !== null ? "server_environment" : price !== null ? "illustrative_example" : "not_set"
    };
  });
}

function registerDreamWifiPackageRoutes(app) {
  app.get("/api/dream-wifi/packages", (_req, res) => {
    res.set("Cache-Control", "no-store");
    const packages = getDreamWifiPackages();
    return res.json({
      success: true,
      currency: "KES",
      packages,
      checkout_enabled: false,
      live_access_enabled: false,
      reason: "Dream Wi-Fi checkout is not enabled until provider wholesale pricing, an authorized live hotspot, payment confirmation, device authorization, and session expiry are verified end-to-end.",
      message: "Package durations are prepared. The 1-hour KES 5 amount is an illustrative example; confirm final retail prices against the provider's actual rates and configure other prices on the server before launch."
    });
  });
}

module.exports = { PACKAGE_DEFINITIONS, getDreamWifiPackages, registerDreamWifiPackageRoutes };
