# PostWire universal broadcast connector

Dream Education's Universal Connector can publish one message through PostWire to the social networks connected to the PostWire account.

## Server configuration

Set these environment variables on the Dream Education server (for example, Render → service → Environment):

- `POSTWIRE_API_KEY` — required; store the secret here, never in browser code or Git.
- `POSTWIRE_BASE_URL` — optional; defaults to `https://postwire.io`.
- `POSTWIRE_PLATFORMS` — optional comma-separated allow-list such as `bluesky,telegram`. When omitted, Dream Education reads `GET /api/connections` and uses the connected platform names returned by PostWire.

If you add or change environment variables on Render, save them and redeploy/restart the service. Keep the API key server-side.

## What delivery means

The connector sends a single `POST /api/post` request with the message, selected platforms and an idempotency key. It reports success only if PostWire confirms at least one network published. A PostWire response with `202 pending_approval` is deliberately not reported as published; approval must happen in PostWire before the post goes out. Per-network failures are preserved in the returned result.

This connector does not create social accounts or authorize networks on your behalf. Connect and authorize the desired accounts in PostWire first. The Free plan may limit the number of networks per post and total monthly posts; check PostWire's current usage/plan response.

## Verification

Run:

```sh
node scripts/postwire-universal-broadcast-smoke-test.js
node scripts/native-free-messenger-connectors-smoke-test.js
node scripts/universal-connector-broadcast-smoke-test.js
```

The PostWire smoke test uses a mocked HTTP transport and does not publish a real social post. A real delivery test must be run after setting a valid API key and connecting a destination network.
