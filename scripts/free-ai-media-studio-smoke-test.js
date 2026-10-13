"use strict";

const assert = require("node:assert/strict");
const { registerFreeAiMediaRoutes } = require("../product/free_ai_media_engine");

async function main() {
  const routes = { get: {}, post: {} };
  const app = {
    get(path, handler) { routes.get[path] = handler; },
    post(path, handler) { routes.post[path] = handler; }
  };

  const previousKey = process.env.FREE_AI_API_KEY;
  const previousFetch = global.fetch;
  process.env.FREE_AI_API_KEY = "media-studio-test-key";

  let capturedUrl = "";
  let capturedOptions = null;
  global.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [{ url: "https://media.example/generated.png" }] })
    };
  };

  registerFreeAiMediaRoutes(app, {
    getAuthenticatedAccount: async () => ({ success: true, account: { id: "media-test-user" } })
  });

  assert.equal(typeof routes.get["/api/media-studio/status"], "function");
  assert.equal(typeof routes.post["/api/media-studio/generate"], "function");

  const response = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; }
  };

  await routes.get["/api/media-studio/status"]({ headers: { authorization: "Bearer test" } }, response);
  assert.equal(response.body.success, true);
  assert.equal(response.body.configured, true);
  assert.deepEqual(response.body.supportedActions, ["chat", "image", "tts", "translate", "freetts"]);

  response.statusCode = 200;
  response.body = null;
  await routes.post["/api/media-studio/generate"]({
    headers: { authorization: "Bearer test" },
    body: { action: "image", prompt: "A labelled diagram of the water cycle" }
  }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(capturedUrl, "https://api.free.ai/v1/image/generate/");
  assert.equal(capturedOptions.headers.Authorization, "Bearer media-studio-test-key");
  assert.equal(JSON.parse(capturedOptions.body).model, "sdxl");
  assert.equal(JSON.stringify(response.body).includes("media-studio-test-key"), false);

  process.env.FREETTS_API_KEY = "freetts-test-key";
  response.statusCode = 200;
  response.body = null;
  global.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return { ok: true, status: 200, text: async () => JSON.stringify({ file_id: "a3f7c012-58b4-4e2a-9d1c-0f83abc12345" }) };
  };
  await routes.post["/api/media-studio/generate"]({
    headers: { authorization: "Bearer test" },
    body: { action: "freetts", text: "A short lesson to read aloud.", rate: "+15%" }
  }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(capturedUrl, "https://freetts.org/api/v1/tts");
  assert.equal(capturedOptions.headers["x-api-key"], "freetts-test-key");
  assert.equal(JSON.parse(capturedOptions.body).rate, "+15%");
  assert.equal(response.body.result.audio_url, "https://freetts.org/api/audio/a3f7c012-58b4-4e2a-9d1c-0f83abc12345");
  assert.equal(JSON.stringify(response.body).includes("freetts-test-key"), false);

  response.statusCode = 200;
  response.body = null;
  await routes.post["/api/media-studio/generate"]({
    headers: { authorization: "Bearer test" },
    body: { action: "unsupported", text: "test" }
  }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);

  const authRoutes = { get() {}, post(path, handler) { authRoutes.handler = handler; } };
  registerFreeAiMediaRoutes(authRoutes, {
    getAuthenticatedAccount: async () => ({ success: false, status: 401, error: "Authentication required." })
  });
  response.statusCode = 200;
  response.body = null;
  await authRoutes.handler({ headers: {}, body: { action: "chat", text: "hello" } }, response);
  assert.equal(response.statusCode, 401);

  if (previousKey === undefined) delete process.env.FREE_AI_API_KEY;
  else process.env.FREE_AI_API_KEY = previousKey;
  delete process.env.FREETTS_API_KEY;
  global.fetch = previousFetch;
  console.log("Free.ai Media Studio smoke test passed");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
