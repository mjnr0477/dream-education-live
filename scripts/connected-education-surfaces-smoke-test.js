const fs = require("fs");
const assert = require("assert");

const server = fs.readFileSync("server.js", "utf8");
const workspace = fs.readFileSync("public/frontend-workspace.js", "utf8");
const app = fs.readFileSync("public/app.js", "utf8");

assert(server.includes('app.get("/api/chat/users"'));
assert(server.includes('app.get("/api/chat/messages"'));
assert(server.includes("hydrateChatStore(store)"));
assert(server.includes("persistChatState(store)"));
assert(server.includes('app.get("/api/chat/users/search"'));
assert(server.includes("chatAccountExists(store, recipientRole, recipientId)"));
assert(!server.includes("activeChatConnection("), "Open chat must not require an active education connection.");

assert(app.includes('"/api/product/meetings"'));
assert(app.includes('"/api/product/meetings/"'));
assert(app.includes('function openMeetings()'));
assert.match(app, /if \(typeof openMeetings === "function"\)\s*\{\s*openMeetings\(\);/,
  "Meetings action must call the actual top-level workspace function.");
assert.match(app, /if \(typeof openGeneralConnections === "function"\)\s*\{\s*openGeneralConnections\(\);/,
  "General Connections action must call the actual top-level workspace function.");
assert.doesNotMatch(app, /window\.DreamEducationMeetings\.open/,
  "Meetings routing must not depend on an unregistered window export.");
assert.doesNotMatch(app, /window\.DreamEducationConnections\.open/,
  "General Connections routing must not depend on an unregistered window export.");
assert(app.includes('function openParentSpace()'));
assert(app.includes('function openTeacherDashboard()'));
assert(app.includes('function openSchoolDashboard()'));

assert(workspace.includes("/api/v1/role/"));
assert(workspace.includes("teaching_priorities"));
assert(workspace.includes("family_signal"));
assert(workspace.includes("priority_learners"));
assert(workspace.includes('data-de-action="chat"') || workspace.includes('action("Open Chat", "chat")'));
assert(workspace.includes('action("Open Meetings", "meetings")'));

const parentOverview = server.indexOf('app.get("/api/product/parent/:parent_id/child/:learner_id/overview"');
assert(parentOverview >= 0);
assert(server.slice(parentOverview, parentOverview + 2500).includes("getAuthenticatedAccount"));

console.log("Connected education surfaces smoke test passed.");
