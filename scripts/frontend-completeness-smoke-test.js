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
const style = read("public/style.css");
const neon = read("public/dream-neon-refresh.css");
const server = read("server.js");
const manifest = JSON.parse(read("public/manifest.webmanifest"));

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

// Every locally referenced stylesheet and script in the landing HTML must exist.
// This catches broken asset URLs before they reach the deployed page.
const declaredLocalAssets = [...index.matchAll(/(?:src|href)=["'](\/[^"']+\.(?:css|js))(?:\?[^"']*)?["']/g)]
  .map(match => match[1]);
for (const asset of declaredLocalAssets) {
  const localPath = "public/" + asset.slice(1);
  if (!fs.existsSync(localPath)) {
    throw new Error("Landing page references a missing local asset: " + asset);
  }
}
if (!Array.isArray(manifest.icons) || !manifest.icons.some(icon => icon.sizes === "192x192") || !manifest.icons.some(icon => icon.sizes === "512x512")) {
  throw new Error("PWA manifest must declare 192px and 512px install icons.");
}
for (const icon of manifest.icons) {
  const iconPath = icon.src && icon.src.startsWith("/") ? "public/" + icon.src.slice(1) : "";
  if (!icon.src || !icon.src.startsWith("/") || !fs.existsSync(iconPath)) {
    throw new Error("PWA manifest references a missing or unsafe icon asset: " + icon.src);
  }
}
if (!index.includes('rel="icon" href="/icons/favicon.svg"') || !index.includes('rel="apple-touch-icon"')) {
  throw new Error("Browser and Apple touch icon links are missing.");
}
if (declaredLocalAssets.length === 0) {
  throw new Error("No local stylesheet or script assets were discovered in the landing HTML.");
}

const robots = read("public/robots.txt");
const sitemap = read("public/sitemap.xml");
const productionOrigin = "https://dream-education-live-4-spjt.onrender.com";
if (!robots.includes("User-agent: *") || !robots.includes("Sitemap: " + productionOrigin + "/sitemap.xml")) {
  throw new Error("Crawler guidance must advertise the active production sitemap URL.");
}
if (!sitemap.includes("<loc>" + productionOrigin + "/</loc>") || !sitemap.includes("<urlset")) {
  throw new Error("Sitemap must contain the active production landing page.");
}
if (!index.includes('<link rel="canonical" href="' + productionOrigin + '/">') ||
    !index.includes('<meta property="og:url" content="' + productionOrigin + '/">')) {
  throw new Error("Canonical and social-share URLs must match the active production service.");
}
if (!neon.match(/body \.app-shell > main > \.dream-destinations\s*\{\s*display:\s*none\s*!important;/)) {
  throw new Error("Mobile home must use the fixed bottom navigation instead of duplicating the destination-card strip.");
}
if (!index.includes('data-panel="about"><span aria-hidden="true">ⓘ</span><span>About Dream</span>')) {
  throw new Error("The mobile navigation must retain the full About Dream destination label.");
}

const requiredFrontendRoutes = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/adaptive",
  "/api/v1/learning/resources",
  "/api/session",
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
  "/nextgen-visual.js?v=20261011a",
  "/frontend-workspace.js?v=20261111c"
]) {
  if (!index.includes(token)) throw new Error("Required frontend script missing: " + token);
}


for (const [asset, version] of [["style.css", "20261111c"], ["frontend-workspace.js", "20261111c"]]) {
  const assetReference = new RegExp("/" + asset.replace(".", "\\.") + "\\?v=" + version);
  if (!assetReference.test(index)) throw new Error("Updated cache-busting version missing for " + asset);
}

if (!index.includes("/app.js?v=20261111c")) throw new Error("Updated app.js cache-busting version missing.");
for (const [asset, version] of [
  ["school-workspace.js", "20261111a"],
  ["chat-workspace.js", "20261111a"]
]) {
  if (!index.includes("/" + asset + "?v=" + version)) {
    throw new Error("Updated cache-busting version missing for " + asset);
  }
}


for (const token of [
  '<link rel="canonical" href="https://dream-education-live-4-spjt.onrender.com/">',
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="Dream Education">',
  '<meta property="og:title" content="Dream Education — Learn without limits">',
  '<meta property="og:description" content="One intelligent space for learners, teachers, parents and schools. Discover knowledge, build mastery and create your future.">',
  '<meta property="og:url" content="https://dream-education-live-4-spjt.onrender.com/">',
  '<meta name="twitter:card" content="summary">',
  '<meta name="twitter:title" content="Dream Education — Learn without limits">',
  '<meta name="twitter:description" content="One intelligent space for learners, teachers, parents and schools. Discover knowledge, build mastery and create your future.">'
]) {
  if (!index.includes(token)) throw new Error("Social sharing metadata missing: " + token);
}

const requiredCompactDestinations = [
  'data-panel="learn"', 'data-panel="teach"', 'data-panel="connect"',
  'data-panel="tools"', 'data-panel="school"', 'data-panel="about"',
  'id="dream-search-form"', 'id="dream-search-input"', 'id="dream-search-results"',
  'id="experience-panel"', 'id="panel-body"', 'data-panel="signin"', 'data-panel="join"', 'data-panel-action="subscription"'
];
for (const token of requiredCompactDestinations) {
  if (!index.includes(token) && !nextgen.includes(token)) {
    throw new Error("Required compact landing destination or wired interaction missing: " + token);
  }
}
for (const token of [
  'className = "de-landing-destinations"',
  'data-panel="learn"', 'data-panel="teach"', 'data-panel="connect"',
  'data-panel="tools"', 'data-panel="school"', 'data-panel="about"',
  'searchShell.classList.add("de-compact-search")',
  'node.remove()'
]) {
  if (!nextgen.includes(token)) throw new Error("Compact landing behavior missing: " + token);
}
if (index.includes('class="gateway-section"') || index.includes('class="statement-section"') || index.includes('class="cta-section"') || index.includes('class="landing-subscribe"') || index.includes('class="footer"') || index.includes('class="floating-card')) {
  throw new Error("Legacy long-scroll landing sections must not be present in the HTML.");
}
if (!css.includes(".de-landing-destinations") || !css.includes("height: 100svh")) {
  throw new Error("Compact one-screen landing layout rules are missing.");
}
if (index.includes("across Dream Education's connected sources,\\n            across Dream Education's connected public sources.")) {
  throw new Error("Duplicate Dream Search description remains.");
}

if (!app.includes('if (action === "signin") {') || !app.includes('openPanel("signin")')) {
  throw new Error("Dynamically rendered sign-in actions must open the shared sign-in panel.");
}

if (!app.includes('if (action === "close") {') || !app.includes("closePanel();")) {
  throw new Error("Dynamically rendered close actions must close the shared panel.");
}

const primaryDispatcherCount = app.split('if (action === "primary")').length - 1;
if (primaryDispatcherCount !== 1 ||
    !app.includes('currentTitle.trim() === "Education, together."') ||
    !app.includes('currentTitle.trim().toLowerCase() === "stay connected."')) {
  throw new Error("Primary panel actions must route both school-dashboard and teacher-connections actions.");
}

if (!index.includes('data-panel-action="subscription"') || !app.includes("function openSubscription") || !app.includes("handlePayPalReturn")) {
  throw new Error("Subscription/PayPal flow is missing.");
}

if (/Test Learner View/.test(app)) {
  throw new Error("Non-functional teacher test control remains.");
}

// Audit statically declared panel actions against the shared dispatcher so a new
// dynamically rendered button cannot silently become inert without a regression failure.
const declaredPanelActions = new Set(
  [...app.matchAll(/data-panel-action=["']([^"'$]+)["']/g)].map(match => match[1])
);
for (const action of declaredPanelActions) {
  if (!app.includes('action === "' + action + '"')) {
    throw new Error("Panel action has no matching dispatcher branch: " + action);
  }
}

const declaredWorkspaceActions = new Set(
  [...workspace.matchAll(/data-de-action=["']([^"'$]+)["']/g)].map(match => match[1])
);
for (const action of declaredWorkspaceActions) {
  if (!workspace.includes('name === "' + action + '"')) {
    throw new Error("Workspace action has no matching dispatcher branch: " + action);
  }
}

const declaredPrimaryActions = new Set(
  [...(index + app).matchAll(/data-action=["']([^"'$]+)["']/g)].map(match => match[1])
);
for (const action of declaredPrimaryActions) {
  if (!app.includes('action === "' + action + '"')) {
    throw new Error("Primary navigation action has no matching dispatcher branch: " + action);
  }
}

for (const [name, source] of [["public/index.html", index], ["public/app.js", app], ["public/frontend-workspace.js", workspace]]) {
  // Dream Wi-Fi is a direct navigation destination, not a learner-facing material link.
  const auditedSource = name === "public/index.html"
    ? source.replace(/<a\s+class="dream-wifi-nav-link[^"]*"\s+href="\/dream-wifi\.html">[\s\S]*?<\/a>/g, "").replace(/<a\s+class="drawer-wifi"\s+href="\/dream-wifi\.html">[\s\S]*?<\/a>/g, "")
    : source;
  if (/<a\b/i.test(auditedSource) || /target\s*=\s*["\']_blank/i.test(auditedSource)) {
    throw new Error("Learner-facing frontend must not render material links: " + name);
  }
}

if (!workspace.includes("<video") || !workspace.includes("de-feed-image") || !workspace.includes("de-feed-experiment") || !app.includes("<audio")) {
  throw new Error("Inline video/photo/experiment feed or existing audio learning experience is incomplete.");
}

if (app.includes('data-answer-resource-type="image"') || app.includes('data-answer-resource-type="experiment"')) {
  throw new Error("Learner resource choices must be limited to video, text and audio.");
}
if (app.includes("<a ") || workspace.includes("<a ")) {
  throw new Error("Learner-facing frontend must not render anchor links.");
}



for (const token of [
  ":focus-visible",
  "prefers-reduced-motion: reduce",
  "min-height: 44px",
  "panel-card-action:focus-visible"
]) {
  if (!style.includes(token)) {
    throw new Error("Accessible frontend polish is missing: " + token);
  }
}
if (!index.includes("/style.css?v=20261111c")) {
  throw new Error("Frontend polish stylesheet cache-busting version is missing.");
}

console.log("Frontend completeness smoke test passed.");
