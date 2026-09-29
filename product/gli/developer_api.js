"use strict";

const crypto = require("crypto");
const gliPostgres = require("../../infrastructure/database/postgres");

function hashKey(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
}

function generateKey() {
  return "dream_live_" + crypto.randomBytes(32).toString("base64url");
}

async function createApiKey({ tenantId, scopes = ["learner:intelligence"] }) {
  if (!gliPostgres.getPool()) throw new Error("Postgres is required for developer API keys.");

  const rawKey = generateKey();
  const keyId = "key_" + crypto.randomUUID();
  const prefix = rawKey.slice(0, 16);

  const result = await gliPostgres.query(
    `INSERT INTO dream_developer_api_keys
      (key_id, tenant_id, key_prefix, key_hash, scopes)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING key_id, tenant_id, key_prefix, scopes, status, created_at`,
    [keyId, String(tenantId), prefix, hashKey(rawKey), JSON.stringify(scopes)]
  );

  return { ...result.rows[0], api_key: rawKey };
}

async function authenticateApiKey(rawKey) {
  const normalized = String(rawKey || "").trim();
  if (!normalized) return null;

  const result = await gliPostgres.query(
    `SELECT key_id, tenant_id, scopes, status
     FROM dream_developer_api_keys
     WHERE key_hash = $1 AND status = 'active'
     LIMIT 1`,
    [hashKey(normalized)]
  );

  if (!result.rows.length) return null;

  await gliPostgres.query(
    `UPDATE dream_developer_api_keys SET last_used_at = NOW() WHERE key_id = $1`,
    [result.rows[0].key_id]
  );

  return result.rows[0];
}

async function revokeApiKey(keyId) {
  if (!gliPostgres.getPool()) throw new Error("Postgres is required for developer API keys.");

  const result = await gliPostgres.query(
    `UPDATE dream_developer_api_keys
     SET status = 'revoked'
     WHERE key_id = $1
     RETURNING key_id, tenant_id, status`,
    [String(keyId || "").trim()]
  );

  return result.rows[0] || null;
}

module.exports = { createApiKey, authenticateApiKey, revokeApiKey };
