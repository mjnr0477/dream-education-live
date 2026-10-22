"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const server = read("server.js");
const app = read("public/app.js");
const parent = read("public/parent-workspace.js");
const css = read("public/meetings-workspace.css");
const pkg = JSON.parse(read("package.json"));

assert.match(server, /agenda: String\(agenda \|\| ""\)\.trim\(\)\.slice\(0, 2000\)/, "Meeting agenda must be bounded and stored.");
assert.match(server, /parsedScheduledDate\.toISOString\(\)\.slice\(0, 10\) === scheduledDateText/, "Meeting creation must reject impossible calendar dates.");
assert.match(server, /timeFormatIsValid/, "Meeting creation must validate 24-hour times server-side.");
assert.match(server, /scheduled_date must be a real date in YYYY-MM-DD format/, "Invalid meeting schedules must return a clear validation error.");
assert.match(server, /app\.post\("\/api\/product\/meetings\/:meeting_id\/follow-up"/, "Shared meeting follow-up route must exist.");
const routeStart = server.indexOf('app.post("/api/product/meetings/:meeting_id/follow-up"');
const routeEnd = server.indexOf('DREAM EDUCATION MEETING JOIN API', routeStart);
const followUpRoute = server.slice(routeStart, routeEnd);
assert.match(followUpRoute, /getAuthenticatedAccount\(req\)/, "Follow-up must require authentication.");
assert.match(followUpRoute, /connection\.status !== "active"/, "Follow-up must reject inactive connections.");
assert.match(followUpRoute, /authorizeAccountForConnection\(auth\.account, connection\)/, "Only authorised meeting participants may save notes.");
assert.match(followUpRoute, /followUp\.length > 4000 \|\| actionItems\.length > 2000/, "Follow-up text must be size-limited.");
assert.match(followUpRoute, /dataEngine\.saveStore\(store\)/, "Follow-up notes must persist.");

assert.match(app, /id="meeting-agenda"/, "Meeting creation must include an optional agenda.");
assert.match(app, /agenda: document\.getElementById\("meeting-agenda"\)/, "Meeting creation must send the agenda.");
assert.match(app, /data-meeting-action="save-follow-up"/, "Past meetings must expose shared follow-up editing.");
assert.match(app, /data-meeting-provider=\"\$\{escapeText\(meeting\.provider \|\| \"dream\"\)\}\"/, "Meeting join buttons must carry the provider so external tabs can be prepared before the request.");
assert.match(app, /window\.open\(\"about:blank\", \"_blank\"\)/, "External meeting tabs must be opened during the user click to reduce popup blocking.");
assert.match(app, /externalMeetingWindow\.location\.replace\(safeMeetingUrl\)/, "The prepared tab must navigate only to the validated meeting URL.");
assert.match(app, /externalMeetingWindow\.close\(\)/, "Unused external tabs must close after failures or internal joins.");
assert.match(app, /supportedMeetingUrl\(button\.dataset\.externalUrl \|\| \"\"\)/, "A popup-blocked meeting URL must be revalidated on a follow-up click.");
assert.match(app, /button\.dataset\.externalUrl = safeMeetingUrl/, "When popups are blocked, the join control must offer a direct follow-up click.");
assert.match(app, /app\.js\?v=20261022b/, "Meeting popup fallback must reference the refreshed app script.");
assert.match(app, /\/api\/product\/meetings\/".*\/follow-up/, "UI must save notes through the authenticated API.");
assert.match(parent, /m\.agenda/, "Parent workspace must show meeting agendas.");
assert.match(parent, /m\.follow_up/, "Parent workspace must show saved meeting notes.");
assert.match(parent, /m\.action_items/, "Parent workspace must show agreed next actions.");
assert.match(css, /\.de-meeting-follow-up/, "Meeting follow-up controls must be styled.");

for (const file of ["server.js", "public/app.js", "public/parent-workspace.js"]) {
  execFileSync(process.execPath, ["--check", path.join(root, file)]);
}
assert.match(pkg.scripts.test, /meeting-collaboration-smoke-test\.js/, "New test must run in npm test.");
console.log("Meeting collaboration smoke test passed.");
