# Dream Wi-Fi: MikroTik + IronWiFi integration

## Integration choice

Dream Wi-Fi will use a compatible MikroTik hotspot/captive portal with IronWiFi handling identity and voucher provisioning (subject to the exact controller configuration supported by the IronWiFi tenant). Dream Education remains the package and payment orchestration layer. This does not create Wi-Fi coverage by itself: an authorized MikroTik controller/access point and internet uplink are required for a real connection.

## Provider adapter added

`product/dream_wifi_ironwifi.js` contains a fail-closed voucher-creation adapter based on IronWiFi's documented `POST /vouchers` request. It requests exactly one voucher for a duration in seconds and returns only the voucher code, identifier (if supplied), and duration. It does not expose provider response bodies or API keys.

The adapter is deliberately not wired to customer checkout yet. No voucher is created merely by viewing the dashboard or package list.

## Server configuration needed before a controlled provider test

- `IRONWIFI_API_KEY`: existing server-side IronWiFi API key (never put in frontend code).
- `IRONWIFI_WIFI_API_BASE_URL`: the exact API base URL for the IronWiFi tenant/region; select it from the IronWiFi console/documentation. Do not guess the region.
- `IRONWIFI_WIFI_TABLE_ID`: the table/group ID that the tenant's voucher API requires.

Do not set the voucher base URL from a browser or user request. Keep the existing `IRONWIFI_API_BASE_URL` used by read-only diagnostics unchanged until the provider's region and endpoint are confirmed.

## Current safety gates

- Package listing remains read-only.
- Checkout and live access remain disabled.
- This adapter does not capture payments, store orders, authorize a MikroTik session, or revoke access.
- A successful voucher API response alone is not proof that a phone can connect or reach the internet.
- Before launch, add durable payment/order records, verify PayPal capture server-side, prevent duplicate fulfillment, securely deliver voucher credentials, validate voucher expiry/usage behavior, and perform an authorized end-to-end hotspot test.
- Never test by creating vouchers against the real tenant without an explicit, controlled owner test.

## References

- IronWiFi REST API: https://www.ironwifi.com/api/
- IronWiFi REST API help article: https://help.ironwifi.com/portal/en/kb/articles/rest-api/
- IronWiFi supported devices: https://help.ironwifi.com/supported-devices
- IronWiFi captive portal setup: https://help.ironwifi.com/user-guide/captive-portals
