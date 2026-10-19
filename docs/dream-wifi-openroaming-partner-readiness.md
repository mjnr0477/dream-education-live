# Dream Wi-Fi: OpenRoaming and existing-network partner readiness

## Purpose

Dream Education wants to offer users a way to connect through existing, authorized Wi-Fi networks without buying access points or prepaying individual users' connectivity. This document defines the next integration path while preserving the current Dream Wi-Fi implementation.

## Verified current blocker

The owner-only IronWiFi diagnostic currently reports the provider API as reachable and a network/captive portal as configured, but reports zero discovered access points. The voucher adapter exists but is not connected to checkout. Therefore, no live user access or paid package fulfillment should be represented as available.

A configured cloud RADIUS tenant or captive portal does not itself broadcast a Wi-Fi signal. A participating access-network provider must have compatible, online access points and explicitly authorize the service.

## Recommended route

Pursue an existing-network partner first, and evaluate OpenRoaming/Passpoint as a roaming option with IronWiFi. Do not assume global coverage, free wholesale access, or revenue-sharing terms until the relevant providers confirm them in writing.

Potential roles:
- **Access network provider (ANP):** owns or operates participating hotspots, provides internet uplink, broadcasts the SSID/Passpoint network, and authorizes roaming.
- **Identity provider (IdP):** authenticates Dream users and provisions credentials or profiles, subject to IronWiFi and federation requirements.
- **Dream Education:** provides the user-facing discovery/onboarding experience and, only after commercial and technical approval, package/payment orchestration.

## Questions for IronWiFi

Before implementing another integration, obtain written answers to these questions from IronWiFi support or its Wi-Fi identity team:

1. Is this tenant eligible for OpenRoaming, and is federation enrollment already active?
2. Can Dream Education act as an identity provider for users roaming onto third-party networks, or does the tenant only support access-network services?
3. What access-network/roaming partner or WBA membership arrangements are required?
4. Is there a settlement-free option appropriate for education, and what limits, fees, minimum commitments, or conditions apply?
5. Can IronWiFi introduce an existing access-network partner willing to authorize a small controlled pilot in Kenya and then expand internationally?
6. Which exact API region/base URL and supported authentication/provisioning endpoints should Dream use?
7. What is the supported way to provision Android devices for Passpoint/OpenRoaming, and how is enrollment revoked when access expires?
8. Can the existing tenant and current plan support this pilot without a paid upgrade or new commitment?

## Pilot acceptance criteria

Do not enable checkout until all of the following are demonstrated with an authorized partner:

- A named partner confirms in writing that Dream users may use its network.
- The partner's compatible APs are online and correctly configured for IronWiFi/RADIUS or the agreed roaming federation.
- IronWiFi discovers the real AP and logs a successful authentication from a test device.
- A test Android phone discovers/connects to the partner's actual network and reaches the internet.
- The package duration is enforced by the provider/controller, not only displayed by Dream.
- Payment capture is verified server-side before access is issued; duplicate callbacks cannot issue duplicate entitlements.
- Expiry/revocation is tested, and support/refund responsibilities are agreed.
- Fees, wholesale costs, revenue share, geographic coverage, and privacy obligations are documented.

## Implementation guardrails

- Keep the existing adaptive learning system and unrelated Dream routes untouched.
- Keep IronWiFi secrets server-side; never return keys, shared secrets, or raw provider responses to the browser.
- Keep package listing read-only and checkout/live access disabled until the pilot passes.
- Do not create real vouchers during diagnostics or page views.
- Do not equate a successful API response or a configured portal with an operating hotspot.
- Prefer a small, reversible pilot and a separate provider adapter over rewriting the current Wi-Fi integration.

## Official starting points

- IronWiFi OpenRoaming guide: https://help.ironwifi.com/openroaming
- IronWiFi integration matrix: https://help.ironwifi.com/integration-matrix
- IronWiFi quick start and access-point prerequisites: https://help.ironwifi.com/getting-started/quick-start
- IronWiFi support: support@ironwifi.com
