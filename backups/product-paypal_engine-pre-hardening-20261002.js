const https = require("https");

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const ENVIRONMENT = (process.env.PAYPAL_ENVIRONMENT || "sandbox").toLowerCase();

const BASE_URL =
  ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);

    const req = https.request(
      {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          ...headers
        }
      },
      res => {
        let data = "";

        res.on("data", chunk => {
          data += chunk;
        });

        res.on("end", () => {
          let parsed;

          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = { raw: data };
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(
              new Error(
                `PayPal API ${res.statusCode}: ${
                  parsed.message || parsed.name || data
                }`
              )
            );
          }
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("PayPal credentials are not configured.");
  }

  const credentials = Buffer.from(
    `${CLIENT_ID}:${CLIENT_SECRET}`
  ).toString("base64");

  const response = await request(
    "POST",
    "/v1/oauth2/token",
    "grant_type=client_credentials",
    {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    }
  );

  if (!response.access_token) {
    throw new Error("PayPal did not return an access token.");
  }

  return response.access_token;
}

async function paypalRequest(method, path, body = null, requestId = null) {
  const token = await getAccessToken();

  return request(
    method,
    path,
    body ? JSON.stringify(body) : null,
    {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "PayPal-Request-Id":
        requestId ||
        "dream-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10)
    }
  );
}

async function testConnection() {
  const token = await getAccessToken();

  return {
    success: true,
    environment: ENVIRONMENT,
    authenticated: Boolean(token)
  };
}

module.exports = {
  getAccessToken,
  paypalRequest,
  testConnection
};

async function createCheckoutOrder({
  amount,
  currency = "USD",
  planId,
  customId = null,
  description = "Dream Education subscription",
  returnUrl,
  cancelUrl
}) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid PayPal checkout amount.");
  }

  if (!planId) {
    throw new Error("PayPal checkout requires a plan ID.");
  }

  if (!returnUrl || !cancelUrl) {
    throw new Error("PayPal checkout requires return and cancel URLs.");
  }

  return paypalRequest("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        description,
        custom_id: String(customId || planId),
        amount: {
          currency_code: currency,
          value: numericAmount.toFixed(2)
        }
      }
    ],
    application_context: {
      return_url: returnUrl,
      cancel_url: cancelUrl,
      user_action: "PAY_NOW"
    }
  });
}

async function captureCheckoutOrder(orderId) {
  if (!orderId) {
    throw new Error("PayPal order ID is required.");
  }

  return paypalRequest(
    "POST",
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    null,
    `dream-capture-${String(orderId)}`
  );
}

module.exports.createCheckoutOrder = createCheckoutOrder;
module.exports.captureCheckoutOrder = captureCheckoutOrder;
