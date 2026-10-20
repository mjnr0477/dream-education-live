# Dream Wi-Fi Android VPN prototype

Native Android `VpnService` plus the upstream HevSocks5Tunnel native TUN-to-SOCKS engine. It routes IPv4/IPv6 packets to the local owner SOCKS5 proxy at `127.0.0.1:1080`; the proxy must already be running in Termux on this same phone. The app excludes the Termux package from VPN routing so the source agent's WebSocket cannot recurse back into the tunnel.

## Current limitations
- The GitHub workflow fetches HevSocks5Tunnel at build time and configures its JNI class for this app. Retain upstream license notices.
- The relay includes authenticated, size-limited UDP datagram forwarding for public destinations, used by SOCKS5 UDP ASSOCIATE and mapped DNS. TCP remains limited to ports 80 and 443. The owner dashboard includes HTTP and DNS/UDP source-path probes; these verify the relay path, not complete phone routing. UDP support has protocol smoke coverage but is not yet validated on a physical device; compatibility with arbitrary apps is not guaranteed.
- This source has not yet been built, installed, or tested on a physical Android device. Do not distribute or advertise full-device coverage until device tests pass.
- Run the source agent only on a network you are authorized to use. Software cannot create Wi-Fi signal or internet access without a real transport path.
- Never embed owner or source tokens in this app.

## Test
Verify VPN permission, local proxy availability, HTTPS browsing, DNS, disconnect, reconnect after network changes, and traffic leakage. Test DNS, UDP, HTTPS, non-web TCP, disconnect/reconnect, and traffic leakage explicitly. TCP ports other than 80/443 remain blocked.
