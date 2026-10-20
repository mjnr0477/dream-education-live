# Dream Wi-Fi Android VPN prototype

Native Android `VpnService` plus the upstream HevSocks5Tunnel native TUN-to-SOCKS engine. It routes IPv4/IPv6 packets to the local owner SOCKS5 proxy at `127.0.0.1:1080`; the proxy must already be running in Termux on this same phone.

## Current limitations
- The GitHub workflow fetches HevSocks5Tunnel at build time and configures its JNI class for this app. Retain upstream license notices.
- Dream's current relay allows only TCP ports 80 and 443. The client uses mapped DNS. Other TCP ports and arbitrary UDP applications are not supported by the current relay, so this is not yet a validated universal VPN.
- This source has not yet been built, installed, or tested on a physical Android device. Do not distribute or advertise full-device coverage until device tests pass.
- Run the source agent only on a network you are authorized to use. Software cannot create Wi-Fi signal or internet access without a real transport path.
- Never embed owner or source tokens in this app.

## Test
Verify VPN permission, local proxy availability, HTTPS browsing, DNS, disconnect, reconnect after network changes, and traffic leakage. Test non-web TCP and UDP explicitly; they remain limited by the relay.
