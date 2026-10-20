# Dream Wi-Fi / Dream Tunnel control-plane prototype

This milestone implements an authenticated **control-plane reachability check only**. It does not route IP packets, proxy web traffic, create a VPN, bypass a captive portal, or provide internet access by itself.

## How the prototype works

1. Dream Education validates the owner's Supabase access token before allowing the private dashboard's WebSocket session.
2. A source-side agent connects outbound over TLS WebSocket (`wss://`) using a separate high-entropy source token.
3. The owner dashboard can request a short ping and see whether that source agent answers through the relay.
4. Source presence and ping latency are control-plane signals only. Live access and packages remain disabled.

## Configure the source token without paying for a provider

Generate a random token on a trusted device:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set that same value as `DREAM_WIFI_SOURCE_TOKEN` in the Dream Education hosting environment and on the authorized source-side device. Never commit the token to GitHub or put it in the frontend.

On the source-side device, install the project's dependencies and run:

```sh
DREAM_WIFI_TUNNEL_URL=wss://dream-education-live-4.onrender.com/api/dream-education/dream-wifi/tunnel \
DREAM_WIFI_SOURCE_TOKEN='your-generated-token' \
npm run dream-wifi:source
```

Run the agent only on a device/network you are authorized to use. The source agent currently answers reachability pings; it does not yet forward traffic.

## What remains before remote internet can work

- Run the source agent on a device connected to an authorized Quant network and verify it can reach the deployed Dream server.
- Implement and test a real traffic-forwarding data plane with strict authentication, routing rules, DNS handling, timeouts, and abuse controls.
- Provide a remote-device tunnel client. A normal webpage cannot transparently route all Android app traffic; full-device routing requires an Android VPNService-based client or a compatible VPN client.
- Test that traffic exits through the authorized Quant connection and that the phone in another location can browse through it.
- Keep provider access and package sales disabled until the end-to-end tests pass.

A tunnel still needs a real transport path. Mobile data may carry the encrypted tunnel but can incur data charges. This prototype does not create radio coverage or free internet.