const fs = require("fs");
const assert = require("assert");

const server = fs.readFileSync("server.js", "utf8");
const workspace = fs.readFileSync("public/frontend-workspace.js", "utf8");
const app = fs.readFileSync("public/app.js", "utf8");

assert(server.includes('app.get("/api/chat/users"'));
assert(server.includes('app.get("/api/chat/messages"'));
assert(server.includes("hydrateChatStore(store)"));
assert(server.includes("persistChatState(store)"));
assert(server.includes("activeChatConnection("));

assert(app.includes('"/api/product/meetings"'));
assert(app.includes('"/api/product/meetings/"'));
assert(app.includes('function openMeetings()'));
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
