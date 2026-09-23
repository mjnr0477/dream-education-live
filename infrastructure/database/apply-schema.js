"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const db = require("./postgres");

async function main() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  if (!schema.trim()) {
    throw new Error("Schema file is empty.");
  }

  const result = await db.query(schema);

  console.log("POSTGRES_SCHEMA_APPLIED");
  console.log("COMMANDS=" + result.command);
}

main()
  .catch((error) => {
    console.error("POSTGRES_SCHEMA_FAILED=" + error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.closePool();
  });
