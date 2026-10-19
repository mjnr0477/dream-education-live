# Dream Wi-Fi: MikroTik + IronWiFi integration

## Integration choice

Dream Wi-Fi targets a compatible MikroTik hotspot/captive portal with IronWiFi handling identity and voucher provisioning, subject to the exact controller configuration supported by the IronWiFi tenant. Dream Education remains the package and payment orchestration layer. This does not create Wi-Fi coverage by itself: an authorized controller/access point and internet uplink are required for a real connection.

## Provider adapter

`product/dream_wifi_ironwifi.js` contains a fail-closed voucher-creation adapter using IronWiFi's documented `POST /api[/:company_id]/vouchers` endpoint and documented voucher fields: `voucher_duration`, `voucher_redemption_limit`, and `voucher_devices`. It requests exactly one device-limited voucher and returns only a minimal code, identifier (if supplied), and duration. It does not expose provider response bodies or API keys.

The adapter is deliberately not wired to customer checkout or a public route. No voucher is created merely by viewing the dashboard or package list.

## Server configuration before a controlled provider test

- `IRONWIFI_API_KEY`: existing server-side IronWiFi API key (never put in frontend code).
- `IRONWIFI_WIFI_API_BASE_URL`: exact API base URL for the tenant's region, ending in `/api`. IronWiFi lists region-specific hosts; select the correct one from the console. Do not guess.
- `IRONWIFI_WIFI_COMPANY_ID`: optional company/tenant ID for parent/MSP accounts. Leave unset for a single-tenant account if the provider docs confirm that applies.

Do not set the voucher base URL from a browser or user request. Keep the existing `IRONWIFI_API_BASE_URL` used by read-only diagnostics unchanged until the provider's region and endpoint are confirmed.

## Current safety gates

- Package listing remains read-only.
- Checkout and live access remain disabled.
- This adapter does not capture payments, store orders, authorize a MikroTik session, or revoke access.
- A successful voucher API response alone is not proof that a phone can connect or reach the internet.
- Before launch, add durable payment/order records, verify PayPal capture server-side, prevent duplicate fulfillment, securely deliver voucher credentials, validate voucher expiry/usage behavior, and perform an authorized end-to-end hotspot test.
- Never test by creating vouchers against the real tenant without an explicit, controlled owner test.

## References

- IronWiFi API endpoint reference: https://help.ironwifi.com/api/endpoints
- IronWiFi REST API and regional base URLs: https://help.ironwifi.com/portal/en/kb/articles/rest-api/
- IronWiFi voucher guide: https://help.ironwifi.com/portal/en/kb/articles/vouchers/
- IronWiFi supported devices: https://help.ironwifi.com/supported-devices
- IronWiFi captive portal setup: https://help.ironwifi.com/user-guide/captive-portals
