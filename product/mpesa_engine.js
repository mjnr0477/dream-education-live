const https = require("https");

const DARAJA_ENVIRONMENT =
  String(process.env.DARAJA_ENVIRONMENT || "sandbox").trim().toLowerCase();

const DARAJA_BASE_URL =
  DARAJA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const DARAJA_CONSUMER_KEY =
  String(process.env.DARAJA_CONSUMER_KEY || "").trim();

const DARAJA_CONSUMER_SECRET =
  String(process.env.DARAJA_CONSUMER_SECRET || "").trim();

const DARAJA_SHORTCODE =
  String(process.env.DARAJA_SHORTCODE || "").trim();

const DARAJA_PASSKEY =
  String(process.env.DARAJA_PASSKEY || "").trim();

const DARAJA_CALLBACK_URL =
  String(process.env.DARAJA_CALLBACK_URL || "").trim();

function requireConfig(names) {
  const missing = names.filter((name) => {
    const value = {
      DARAJA_CONSUMER_KEY,
      DARAJA_CONSUMER_SECRET,
      DARAJA_SHORTCODE,
      DARAJA_PASSKEY,
      DARAJA_CALLBACK_URL
    }[name];

    return !value;
  });

  if (missing.length) {
    throw new Error(
      `Missing Daraja configuration: ${missing.join(", ")}`
    );
  }
}

function normalizeMpesaPhone(phone) {
  let value = String(phone || "").replace(/\D/g, "");

  if (value.startsWith("0")) {
    value = `254${value.slice(1)}`;
  } else if (value.startsWith("7") || value.startsWith("1")) {
    value = `254${value}`;
  }

  if (!/^254[17]\d{8}$/.test(value)) {
    throw new Error("Invalid Kenyan M-PESA phone number.");
  }

  return value;
}

function darajaRequest({
  method,
  path,
  headers = {},
  body = null
}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const request = https.request(
      `${DARAJA_BASE_URL}${path}`,
      {
        method,
        headers: {
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
              }
            : {}),
          ...headers
        }
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          let parsed = null;

          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = { raw: data };
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(
              parsed.errorMessage ||
              parsed.error_description ||
              parsed.errorCode ||
              `Daraja request failed with HTTP ${response.statusCode}.`
            );

            error.statusCode = response.statusCode;
            error.response = parsed;

            return reject(error);
          }

          resolve(parsed);
        });
      }
    );

    request.on("error", reject);

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
}

async function getAccessToken() {
  requireConfig([
    "DARAJA_CONSUMER_KEY",
    "DARAJA_CONSUMER_SECRET"
  ]);

  const credentials = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await darajaRequest({
    method: "GET",
    path: "/oauth/v1/generate?grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${credentials}`
    }
  });

  if (!response.access_token) {
    throw new Error("Daraja did not return an access token.");
  }

  return response.access_token;
}

function createStkPassword(timestamp) {
  requireConfig([
    "DARAJA_SHORTCODE",
    "DARAJA_PASSKEY"
  ]);

  return Buffer.from(
    `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
  ).toString("base64");
}

function createTimestamp() {
  const now = new Date();

  const pad = (value) => String(value).padStart(2, "0");

  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

async function initiateStkPush({
  phone,
  amount,
  accountReference,
  transactionDescription,
  callbackUrl = DARAJA_CALLBACK_URL
}) {
  requireConfig([
    "DARAJA_CONSUMER_KEY",
    "DARAJA_CONSUMER_SECRET",
    "DARAJA_SHORTCODE",
    "DARAJA_PASSKEY"
  ]);

  if (!callbackUrl) {
    throw new Error("DARAJA_CALLBACK_URL is required.");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid M-PESA payment amount.");
  }

  const normalizedPhone = normalizeMpesaPhone(phone);
  const timestamp = createTimestamp();
  const accessToken = await getAccessToken();

  const response = await darajaRequest({
    method: "POST",
    path: "/mpesa/stkpush/v1/processrequest",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: createStkPassword(timestamp),
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(numericAmount),
      PartyA: normalizedPhone,
      PartyB: DARAJA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: String(accountReference || "DreamEducation").slice(
        0,
        12
      ),
      TransactionDesc: String(
        transactionDescription || "Dream Education payment"
      ).slice(0, 13)
    }
  });

  return {
    success: true,
    environment: DARAJA_ENVIRONMENT,
    merchant_request_id: response.MerchantRequestID || null,
    checkout_request_id: response.CheckoutRequestID || null,
    response_code: response.ResponseCode || null,
    response_description: response.ResponseDescription || null,
    customer_message: response.CustomerMessage || null,
    phone: normalizedPhone
  };
}


const fs = require("fs");
const path = require("path");

const MPESA_DATA_DIR = path.join(__dirname, "..", "data");
const MPESA_PENDING_FILE = path.join(
  MPESA_DATA_DIR,
  "mpesa_pending.json"
);

function readPendingPayments() {
  fs.mkdirSync(MPESA_DATA_DIR, { recursive: true });

  if (!fs.existsSync(MPESA_PENDING_FILE)) {
    fs.writeFileSync(
      MPESA_PENDING_FILE,
      JSON.stringify([], null, 2)
    );
  }

  try {
    const data = JSON.parse(
      fs.readFileSync(MPESA_PENDING_FILE, "utf8")
    );

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writePendingPayments(data) {
  fs.mkdirSync(MPESA_DATA_DIR, { recursive: true });

  fs.writeFileSync(
    MPESA_PENDING_FILE,
    JSON.stringify(data, null, 2)
  );
}

function savePendingPayment(input = {}) {
  if (!input.checkout_request_id) {
    throw new Error("CheckoutRequestID is required.");
  }

  const data = readPendingPayments();

  const existing = data.find(
    item =>
      item.checkout_request_id === input.checkout_request_id
  );

  if (existing) {
    return existing;
  }

  const payment = {
    checkout_request_id: input.checkout_request_id,
    merchant_request_id: input.merchant_request_id || null,
    account_id: input.account_id || null,
    learner_id: input.learner_id || null,
    plan_id: input.plan_id || null,
    amount: Number(input.amount || 0),
    currency: input.currency || "KES",
    phone: input.phone || null,
    status: "pending",
    created_at: input.created_at || new Date().toISOString(),
    completed_at: null,
    mpesa_receipt_number: null
  };

  data.push(payment);
  writePendingPayments(data);

  return payment;
}

function getPendingPayment(checkoutRequestId) {
  const data = readPendingPayments();

  return (
    data.find(
      item =>
        item.checkout_request_id === checkoutRequestId
    ) || null
  );
}

function completePendingPayment(
  checkoutRequestId,
  details = {}
) {
  const data = readPendingPayments();

  const payment = data.find(
    item =>
      item.checkout_request_id === checkoutRequestId
  );

  if (!payment) {
    return null;
  }

  payment.status = details.status || "completed";
  payment.completed_at =
    details.completed_at || new Date().toISOString();

  if (details.mpesa_receipt_number) {
    payment.mpesa_receipt_number =
      details.mpesa_receipt_number;
  }

  if (details.transaction_date) {
    payment.transaction_date =
      details.transaction_date;
  }

  if (details.result_code !== undefined) {
    payment.result_code = details.result_code;
  }

  if (details.result_description) {
    payment.result_description =
      details.result_description;
  }

  writePendingPayments(data);

  return payment;
}

function parseStkCallback(body) {
  const callback =
    body?.Body?.stkCallback ||
    body?.body?.stkCallback ||
    null;

  if (!callback) {
    return {
      success: false,
      valid: false,
      error: "Invalid M-PESA callback payload."
    };
  }

  const metadata = Array.isArray(callback.CallbackMetadata?.Item)
    ? callback.CallbackMetadata.Item
    : [];

  const values = {};

  for (const item of metadata) {
    if (item?.Name) {
      values[item.Name] = item.Value ?? null;
    }
  }

  const resultCode = Number(callback.ResultCode);

  return {
    success: true,
    valid: Number.isFinite(resultCode),
    result_code: Number.isFinite(resultCode) ? resultCode : null,
    result_description: callback.ResultDesc || null,
    merchant_request_id: callback.MerchantRequestID || null,
    checkout_request_id: callback.CheckoutRequestID || null,
    amount: values.Amount ?? null,
    mpesa_receipt_number: values.MpesaReceiptNumber ?? null,
    transaction_date: values.TransactionDate ?? null,
    phone_number: values.PhoneNumber ?? null,
    metadata: values
  };
}

module.exports = {
  DARAJA_ENVIRONMENT,
  DARAJA_BASE_URL,
  normalizeMpesaPhone,
  getAccessToken,
  initiateStkPush,
  parseStkCallback,
  savePendingPayment,
  getPendingPayment,
  completePendingPayment
};
