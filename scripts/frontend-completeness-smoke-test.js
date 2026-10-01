"use strict";

const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const index = read("public/index.html");
const app = read("public/app.js");
const workspace = read("public/frontend-workspace.js");
const nextgen = read("public/nextgen-visual.js");
const css = read("public/nextgen-visual.css");
const server = read("server.js");

const requiredFiles = [
  "public/index.html",
  "public/style.css",
  "public/app.js",
  "public/frontend-workspace.js",
  "public/nextgen-visual.js",
  "public/nextgen-visual.css"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error("Missing frontend file: " + file);
}

const requiredFrontendRoutes = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/adaptive",
  "/api/next-question",
  "/api/session",
  "/api/learning-cycle",
  "/api/product/teacher",
  "/api/product/parent",
  "/api/product/school",
  "/api/paypal/create-order",
  "/api/paypal/capture-order"
];

for (const route of requiredFrontendRoutes) {
  if (!app.includes(route) && !workspace.includes(route)) {
    throw new Error("Required frontend integration missing: " + route);
  }
}

const requiredServerRoutes = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/paypal/create-order",
  "/api/paypal/capture-order",
  "/api/product/teacher",
  "/api/product/parent",
  "/api/product/school",
  "/api/adaptive",
  "/api/learning-cycle"
];

for (const route of requiredServerRoutes) {
  if (!server.includes(route)) {
    throw new Error("Required server route missing: " + route);
  }
}

for (const token of [
  "/nextgen-visual.js?v=20261001",
  "/frontend-workspace.js?v=20261001",
  'card("LEARNER", "Learn", "Adaptive learning built around your progress.", "learn"',
  'card("TEACHER", "Teach", "See learning evidence and guide learners.", "teach"',
  'card("PARENT", "Support", "Stay connected to meaningful learning progress.", "connect"',
  'card("SCHOOL", "Scale", "Bring your learning community together.", "school"'
]) {
  if (!index.includes(token) && !nextgen.includes(token)) {
    throw new Error("Required frontend surface missing: " + token);
  }
}

if (!nextgen.includes("de-legacy-landing-hidden")) {
  throw new Error("Legacy landing deduplication is missing.");
}

if (!css.includes(".de-nextgen-visual .de-legacy-landing-hidden")) {
  throw new Error("Legacy landing hide rule is missing.");
}

if (!app.includes("function openSubscription") || !app.includes("handlePayPalReturn")) {
  throw new Error("Subscription/PayPal flow is missing.");
}

if (/Test Learner View/.test(app)) {
  throw new Error("Non-functional teacher test control remains.");
}

console.log("Frontend completeness smoke test passed.");
