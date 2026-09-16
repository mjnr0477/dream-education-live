const MS_DAY = 24 * 60 * 60 * 1000;

// PayPal checkout currency.
// Dream Education prices remain denominated in KES.
// PayPal checkout uses USD because KES is not currently listed
// among PayPal's supported REST API currencies.
const PAYPAL_CURRENCY = "USD";
const KES_PER_USD = 129.61;

function kesToPaypalUsd(kesAmount) {
  const amount = Number(kesAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid KES amount for PayPal conversion.");
  }

  return Number((amount / KES_PER_USD).toFixed(2));
}

const PLANS = {
  daily: {
    id: "daily",
    name: "Daily",
    duration_days: 1,
    price: 30,
    currency: "KES"
  },
  weekly: {
    id: "weekly",
    name: "Weekly",
    duration_days: 7,
    price: 100,
    currency: "KES"
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    duration_days: 30,
    price: 350,
    currency: "KES"
  },
  yearly: {
    id: "yearly",
    name: "Yearly",
    duration_days: 365,
    price: 3000,
    currency: "KES"
  }
};

const OWNER_EMAIL = "mathiassimiyu52@gmail.com";

const REVENUE_CATEGORIES = [
  "subscription_payment"
];

const COST_CATEGORIES = [
  "payment_fee",
  "ai",
  "code_generator",
  "hosting",
  "supabase",
  "refund",
  "tax",
  "other"
];

function isOwnerAccount(account) {
  if (!account) return false;

  const email = String(account.email || "").trim().toLowerCase();

  return (
    account.owner_account === true &&
    account.free_forever === true &&
    account.plan_type === "owner" &&
    email === OWNER_EMAIL
  );
}

function createTrialAccess(account) {
  if (isOwnerAccount(account)) {
    return {
      plan_type: "owner",
      subscription_status: "active",
      free_forever: true,
      trial_started_at: null,
      trial_expires_at: null,
      subscription_started_at: null,
      subscription_expires_at: null
    };
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 7 * MS_DAY);

  return {
    plan_type: "trial",
    subscription_status: "trial",
    free_forever: false,
    trial_started_at: startedAt.toISOString(),
    trial_expires_at: expiresAt.toISOString(),
    subscription_started_at: null,
    subscription_expires_at: null
  };
}

function getAccessStatus(account, now = new Date()) {
  if (!account) {
    return {
      allowed: false,
      status: "no_account",
      reason: "Account not found."
    };
  }

  if (isOwnerAccount(account)) {
    return {
      allowed: true,
      status: "owner",
      plan_type: "owner",
      free_forever: true,
      reason: "Owner account has permanent free access."
    };
  }

  if (
    account.subscription_status === "active" &&
    account.subscription_expires_at
  ) {
    const expiry = new Date(account.subscription_expires_at);

    if (expiry > now) {
      return {
        allowed: true,
        status: "active",
        plan_type: account.plan_type || "paid",
        expires_at: expiry.toISOString()
      };
    }
  }

  if (
    account.subscription_status === "trial" &&
    account.trial_expires_at
  ) {
    const expiry = new Date(account.trial_expires_at);

    if (expiry > now) {
      return {
        allowed: true,
        status: "trial",
        plan_type: "trial",
        expires_at: expiry.toISOString()
      };
    }
  }

  return {
    allowed: false,
    status: "expired",
    plan_type: account.plan_type || null,
    reason: "Trial or subscription has expired."
  };
}

function activatePlan(
  account,
  planId,
  amount,
  currency = "KES",
  paymentDetails = {}
) {
  const plan = PLANS[planId];

  if (!plan) {
    throw new Error("Invalid payment plan.");
  }

  if (isOwnerAccount(account)) {
    return {
      ...account,
      plan_type: "owner",
      subscription_status: "active",
      free_forever: true,
      owner_account: true
    };
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("Invalid payment amount.");
  }

  const startedAt = new Date();
  const expiresAt = new Date(
    startedAt.getTime() + plan.duration_days * MS_DAY
  );

  return {
    ...account,
    plan_type: plan.id,
    subscription_status: "active",
    subscription_started_at: startedAt.toISOString(),
    subscription_expires_at: expiresAt.toISOString(),

    last_payment_amount: numericAmount,
    last_payment_currency: currency,

    last_payment_provider: paymentDetails.provider || null,
    last_payment_transaction_id:
      paymentDetails.transaction_id || null
  };
}

function createPaymentRecord({
  account,
  planId,
  amount,
  currency = "KES",
  provider = null,
  transactionId = null,
  status = "successful",
  providerFee = 0,
  tax = 0,
  otherCharges = 0,
  refundAmount = 0,
  webhookEventId = null,
  paymentDate = new Date().toISOString()
}) {
  const plan = PLANS[planId];

  if (!plan) {
    throw new Error("Invalid payment plan.");
  }

  const numericAmount = Number(amount);
  const numericFee = Number(providerFee || 0);
  const numericTax = Number(tax || 0);
  const numericOther = Number(otherCharges || 0);
  const numericRefund = Number(refundAmount || 0);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 0 ||
    !Number.isFinite(numericFee) ||
    numericFee < 0 ||
    !Number.isFinite(numericTax) ||
    numericTax < 0 ||
    !Number.isFinite(numericOther) ||
    numericOther < 0 ||
    !Number.isFinite(numericRefund) ||
    numericRefund < 0
  ) {
    throw new Error("Invalid financial amount.");
  }

  const netRevenue =
    numericAmount -
    numericFee -
    numericTax -
    numericOther -
    numericRefund;

  return {
    payment_id:
      "payment_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 10),

    account_id: account?.account_id || null,
    learner_id: account?.learner_id || null,

    plan_id: plan.id,
    plan_name: plan.name,

    billing_period_days: plan.duration_days,

    amount: numericAmount,
    currency,

    provider,
    transaction_id: transactionId,
    status,

    provider_fee: numericFee,
    tax: numericTax,
    other_charges: numericOther,
    refund_amount: numericRefund,

    net_revenue: netRevenue,

    payment_date: paymentDate,

    subscription_started_at: null,
    subscription_expires_at: null,

    refund_status: numericRefund > 0 ? "refunded" : "none",

    webhook_event_id: webhookEventId,

    created_at: new Date().toISOString()
  };
}

function createCostRecord({
  category,
  amount,
  currency = "KES",
  description = "",
  provider = null,
  reference = null,
  costDate = new Date().toISOString()
}) {
  if (!COST_CATEGORIES.includes(category)) {
    throw new Error("Invalid cost category.");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("Invalid cost amount.");
  }

  return {
    cost_id:
      "cost_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 10),

    category,

    amount: numericAmount,
    currency,

    description,

    provider,
    reference,

    cost_date: costDate,

    created_at: new Date().toISOString()
  };
}

function calculateFinancialSummary(financialData = {}) {
  const payments = Array.isArray(financialData.payments)
    ? financialData.payments
    : [];

  const costs = Array.isArray(financialData.costs)
    ? financialData.costs
    : [];

  const successfulPayments = payments.filter(
    payment =>
      payment.status === "successful" ||
      payment.status === "completed"
  );

  const totalRevenue = successfulPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalPaymentFees = successfulPayments.reduce(
    (sum, payment) => sum + Number(payment.provider_fee || 0),
    0
  );

  const totalTaxes = successfulPayments.reduce(
    (sum, payment) => sum + Number(payment.tax || 0),
    0
  );

  const totalOtherCharges = successfulPayments.reduce(
    (sum, payment) => sum + Number(payment.other_charges || 0),
    0
  );

  const totalRefunds = successfulPayments.reduce(
    (sum, payment) => sum + Number(payment.refund_amount || 0),
    0
  );

  const operatingCosts = costs.reduce(
    (sum, cost) => sum + Number(cost.amount || 0),
    0
  );

  const totalCosts =
    totalPaymentFees +
    totalTaxes +
    totalOtherCharges +
    totalRefunds +
    operatingCosts;

  const netRevenue = totalRevenue - totalCosts;

  const costsByCategory = {};

  for (const cost of costs) {
    const category = cost.category || "other";

    costsByCategory[category] =
      (costsByCategory[category] || 0) +
      Number(cost.amount || 0);
  }

  return {
    currency: "KES",

    total_revenue: totalRevenue,

    payment_fees: totalPaymentFees,
    taxes: totalTaxes,
    other_payment_charges: totalOtherCharges,
    refunds: totalRefunds,

    operating_costs: operatingCosts,

    total_costs: totalCosts,

    net_revenue: netRevenue,

    costs_by_category: costsByCategory,

    payment_count: successfulPayments.length,
    cost_record_count: costs.length
  };
}

module.exports = {
  PLANS,
  OWNER_EMAIL,
  PAYPAL_CURRENCY,
  KES_PER_USD,
  kesToPaypalUsd,

  REVENUE_CATEGORIES,
  COST_CATEGORIES,

  isOwnerAccount,
  createTrialAccess,
  getAccessStatus,
  activatePlan,

  createPaymentRecord,
  createCostRecord,
  calculateFinancialSummary
};
