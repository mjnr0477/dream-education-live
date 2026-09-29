"use strict";

const gliPostgres = require("../../infrastructure/database/postgres");

function accountId(account) {
  return String(
    account?.account_id ||
    account?.id ||
    account?.user_id ||
    account?.learner_id ||
    ""
  ).trim();
}

async function getMembership(tenantId, account) {
  const id = accountId(account);
  if (!id || !tenantId || !gliPostgres.getPool()) return null;

  const result = await gliPostgres.query(
    `SELECT tenant_id, account_id, role, status
     FROM dream_tenant_memberships
     WHERE tenant_id = $1 AND account_id = $2
     LIMIT 1`,
    [String(tenantId), id]
  );
  return result.rows[0] || null;
}

async function requireTenantRole(tenantId, account, roles = []) {
  if (account?.owner_account === true || account?.role === "owner") {
    return { allowed: true, membership: null, reason: "platform_owner" };
  }

  const membership = await getMembership(tenantId, account);
  if (!membership || membership.status !== "active") {
    return { allowed: false, membership: null, reason: "tenant_membership_required" };
  }

  if (roles.length && !roles.includes(membership.role)) {
    return { allowed: false, membership, reason: "tenant_role_required" };
  }

  return { allowed: true, membership, reason: "tenant_membership" };
}

module.exports = { accountId, getMembership, requireTenantRole };
