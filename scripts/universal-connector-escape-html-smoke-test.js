"use strict";

const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

const helper = 'function escapeHTML(value) {';
const iife = '(function () {';

if (!source.includes(helper)) {
  throw new Error("Shared top-level escapeHTML helper is missing.");
}

if (source.indexOf(helper) > source.indexOf(iife)) {
  throw new Error("escapeHTML helper is not defined before the main frontend IIFE.");
}

const globalFunctionStart = source.indexOf("function renderGeneralConnectionLists(");
const globalFunctionEnd = source.indexOf("\n}\n", globalFunctionStart);
const globalFunction = source.slice(globalFunctionStart, globalFunctionEnd);

if (!globalFunction.includes("escapeHTML(")) {
  throw new Error("General Connections renderer no longer uses escapeHTML.");
}

console.log("Universal Connector escapeHTML scope smoke test passed.");
