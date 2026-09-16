"use strict";

const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "..", "cache");

function safeName(key) {
  return Buffer.from(String(key))
    .toString("base64")
    .replace(/[/+=]/g, "_")
    .slice(0, 180);
}

function read(key, maxAgeMs = 86400000) {
  try {
    const file = path.join(CACHE_DIR, safeName(key) + ".json");
    const item = JSON.parse(fs.readFileSync(file, "utf8"));

    if (Date.now() - Number(item.time || 0) > maxAgeMs) {
      return null;
    }

    return item.value;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    fs.mkdirSync(CACHE_DIR, {recursive:true});
    const file = path.join(CACHE_DIR, safeName(key) + ".json");
    fs.writeFileSync(
      file,
      JSON.stringify({time:Date.now(), value}, null, 2)
    );
  } catch {}
}

module.exports = {read, write};
