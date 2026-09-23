"use strict";

const { Pool } = require("pg");

let pool = null;

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    return url.toString();
  } catch {
    return raw;
  }
}

function getPool() {
  if (!getDatabaseUrl()) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT || 30000),
      connectionTimeoutMillis: Number(
        process.env.DATABASE_CONNECTION_TIMEOUT || 5000
      ),
    });

    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error.message);
    });
  }

  return pool;
}

async function testConnection() {
  const db = getPool();

  if (!db) {
    return {
      success: false,
      connected: false,
      configured: false,
      error: "DATABASE_URL is not configured.",
    };
  }

  const result = await db.query("SELECT NOW() AS now");

  return {
    success: true,
    connected: true,
    configured: true,
    server_time: result.rows[0].now,
  };
}

async function query(text, params = []) {
  const db = getPool();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return db.query(text, params);
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  testConnection,
  query,
  closePool,
};
