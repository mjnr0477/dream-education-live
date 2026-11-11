# Dream Wi-Fi product separation

## Goal

Make Dream Wi-Fi a standalone product and keep Dream Education independently usable. Do not merge the older `dream-wifi-standalone-page` branch wholesale: it has diverged from `main` (6 commits ahead, 60 behind at the time this work began).

## Current coupling verified on `main`

- `package.json` includes Dream Wi-Fi source/proxy commands and Dream Wi-Fi smoke tests in the main test chain.
- `server.js` imports `./product/dream_wifi_source_registry` and registers Dream Wi-Fi backend functionality in the Dream Education server.
- `public/index.html` loads `/dream-wifi.css` and includes a Dream Wi-Fi navigation link to `/dream-wifi.html`.
- Dream Wi-Fi's web page and source/tunnel scripts currently live in the Dream Education repository.
- An Android client exists under `android/dream-wifi-vpn`, with an Android build workflow in this repository.

## Safe migration sequence

1. Preserve this branch from current `main`; do not overwrite or force-push `main`.
2. Create a dedicated Dream Wi-Fi repository from the current, relevant source files and history where possible. The GitHub connector available for this task does not expose repository-creation, local checkout, or CI execution actions, so repository creation and full source migration cannot be completed safely through this connector alone.
3. Move the Dream Wi-Fi server routes, source registry, source agent, proxy/tunnel protocol, web UI/assets, Android app, workflows, and dedicated tests to the new repository. Replace references to Dream Education paths with Dream Wi-Fi-owned paths and environment configuration.
4. Deploy Dream Wi-Fi separately and verify its health, authentication, tunnel handshake, Quant source connectivity, and Android build before removing anything from Dream Education.
5. In Dream Education, remove the Wi-Fi navigation and assets, server import/routes, scripts, tests, and package scripts only after the standalone deployment is verified. Keep education authentication, learning routes, and unrelated server behavior unchanged.
6. Run the full Dream Education test suite and the standalone Dream Wi-Fi test suite in CI. Check both production deployments independently.
7. Open a reviewed pull request; do not merge until CI and independent product smoke tests pass.

## Safety and acceptance criteria

- Dream Education starts and passes its existing tests without any Dream Wi-Fi files, scripts, imports, routes, or assets.
- Dream Wi-Fi builds and deploys without depending on Dream Education's server or repository.
- Stopping, deploying, or updating either product does not interrupt the other.
- Existing source code and working tunnel behavior are preserved during migration; secrets are not copied into source control.
- Rollback is possible by reverting the migration PR without rewriting history.

## Work performed in this branch

This branch starts from current `main` and adds this verified migration plan only. No production code, routes, deployments, or default-branch files have been changed. The GitHub connector cannot run the repository's tests or create a new repository, so those operations remain explicit blockers rather than being reported as completed.
