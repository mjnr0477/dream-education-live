"use strict";

const db = require("./postgres");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/[\s()-]/g, "");
}

function toNullable(value) {
  return value === undefined || value === "" ? null : value;
}

function toAccountRow(account) {
  const knownFields = new Set([
    "account_id",
    "role",
    "email",
    "phone",
    "learner_id",
    "teacher_id",
    "parent_id",
    "school_id",
    "plan_type",
    "subscription_status",
    "free_forever",
    "trial_started_at",
    "trial_expires_at",
    "subscription_started_at",
    "subscription_expires_at",
    "created_at",
    "updated_at",
  ]);

  const data = {};

  for (const [key, value] of Object.entries(account || {})) {
    if (!knownFields.has(key)) {
      data[key] = value;
    }
  }

  return {
    account_id: account.account_id,
    role: account.role,
    email: toNullable(normalizeEmail(account.email)),
    phone: toNullable(normalizePhone(account.phone)),
    learner_id: toNullable(account.learner_id),
    teacher_id: toNullable(account.teacher_id),
    parent_id: toNullable(account.parent_id),
    school_id: toNullable(account.school_id),
    plan_type: toNullable(account.plan_type),
    subscription_status: toNullable(account.subscription_status),
    free_forever: account.free_forever === true,
    trial_started_at: toNullable(account.trial_started_at),
    trial_expires_at: toNullable(account.trial_expires_at),
    subscription_started_at: toNullable(account.subscription_started_at),
    subscription_expires_at: toNullable(account.subscription_expires_at),
    data,
    created_at: toNullable(account.created_at),
    updated_at: toNullable(account.updated_at) || new Date().toISOString(),
  };
}

function fromAccountRow(row) {
  return {
    ...row.data,
    account_id: row.account_id,
    role: row.role,
    email: row.email,
    phone: row.phone,
    learner_id: row.learner_id,
    teacher_id: row.teacher_id,
    parent_id: row.parent_id,
    school_id: row.school_id,
    plan_type: row.plan_type,
    subscription_status: row.subscription_status,
    free_forever: row.free_forever,
    trial_started_at: row.trial_started_at,
    trial_expires_at: row.trial_expires_at,
    subscription_started_at: row.subscription_started_at,
    subscription_expires_at: row.subscription_expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function saveAccount(account) {
  const row = toAccountRow(account);

  const result = await db.query(
    `INSERT INTO accounts (
      account_id,
      role,
      email,
      phone,
      learner_id,
      teacher_id,
      parent_id,
      school_id,
      plan_type,
      subscription_status,
      free_forever,
      trial_started_at,
      trial_expires_at,
      subscription_started_at,
      subscription_expires_at,
      data,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, $16, $17, $18
    )
    ON CONFLICT (account_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      learner_id = EXCLUDED.learner_id,
      teacher_id = EXCLUDED.teacher_id,
      parent_id = EXCLUDED.parent_id,
      school_id = EXCLUDED.school_id,
      plan_type = EXCLUDED.plan_type,
      subscription_status = EXCLUDED.subscription_status,
      free_forever = EXCLUDED.free_forever,
      trial_started_at = EXCLUDED.trial_started_at,
      trial_expires_at = EXCLUDED.trial_expires_at,
      subscription_started_at = EXCLUDED.subscription_started_at,
      subscription_expires_at = EXCLUDED.subscription_expires_at,
      data = EXCLUDED.data,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at
    RETURNING *`,
    [
      row.account_id,
      row.role,
      row.email,
      row.phone,
      row.learner_id,
      row.teacher_id,
      row.parent_id,
      row.school_id,
      row.plan_type,
      row.subscription_status,
      row.free_forever,
      row.trial_started_at,
      row.trial_expires_at,
      row.subscription_started_at,
      row.subscription_expires_at,
      row.data,
      row.created_at,
      row.updated_at,
    ]
  );

  return fromAccountRow(result.rows[0]);
}

async function getAccount(accountId) {
  const result = await db.query(
    `SELECT * FROM accounts WHERE account_id = $1`,
    [accountId]
  );

  return result.rows.length ? fromAccountRow(result.rows[0]) : null;
}

async function getAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const result = await db.query(
    `SELECT * FROM accounts WHERE LOWER(TRIM(email)) = $1 LIMIT 1`,
    [normalizedEmail]
  );

  return result.rows.length ? fromAccountRow(result.rows[0]) : null;
}

async function getAccountByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  const result = await db.query(
    `SELECT * FROM accounts
     WHERE regexp_replace(phone, '[[:space:]()-]', '', 'g') = $1
     LIMIT 1`,
    [normalizedPhone]
  );

  return result.rows.length ? fromAccountRow(result.rows[0]) : null;
}

module.exports = {
  saveAccount,
  getAccount,
  getAccountByEmail,
  getAccountByPhone,
  normalizeEmail,
  normalizePhone,
};
