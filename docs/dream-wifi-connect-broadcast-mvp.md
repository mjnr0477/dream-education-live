# Dream Wi-Fi Connect: first broadcast prototype

This milestone adds an Android-owned **local-only Wi-Fi hotspot** to the existing Dream Wi-Fi Android prototype. The app requests Android's `WifiManager.startLocalOnlyHotspot` API when the user taps **Start Dream Wi-Fi**, then displays the SSID and password returned by Android and releases the reservation when the user taps Stop.

## What this proves

- Dream Education's Android app can request a nearby Wi-Fi network from inside its own interface, without sending the user to the ordinary hotspot settings screen.
- The app can show the credentials needed for another nearby device to join.
- Start/stop and Android failure states are surfaced in the app.

## What it does not do yet

- This is a **local-only** network. It does not share mobile data or upstream Wi-Fi internet.
- Android chooses the SSID and security credentials on this API. The app cannot reliably force the network name to `DREAM_WIFI` on every supported Android version/device.
- The website cannot transmit Wi-Fi radio. It can provide a control panel and account/session management, but radio broadcasting must be done by a compatible Android device or dedicated access point.
- This prototype has not been built or tested on a physical phone yet. Device manufacturers and Wi-Fi modes may prevent hotspot startup.

## Permissions and device test

The app declares `CHANGE_WIFI_STATE`, `NEARBY_WIFI_DEVICES` for Android 13+, and location permission for older Android versions. The app asks for the relevant runtime permission before requesting the hotspot.

Test on a physical Android device:
1. Install the debug APK from the Android build workflow.
2. Open Dream Wi-Fi and tap **Start Dream Wi-Fi**.
3. Grant the nearby Wi-Fi/location permission if prompted.
4. Confirm the screen says **Broadcasting locally** and shows the SSID/password.
5. From a second device, find that SSID in Wi-Fi settings and join with the displayed password.
6. Verify that the second device can reach the first device on the local network if a test service is added; do not expect internet access.
7. Tap **Stop Dream Wi-Fi** and verify that the network disappears.

## Next milestone

After the local-only broadcast works on the target phone, decide whether the next goal is:
- internet sharing through a supported Android tethering/hotspot implementation, or
- a dedicated Dream Wi-Fi access point/router controlled by Dream Education's backend.

A long-distance tunnel still needs an authorized source network and a real transport path. The website and app alone cannot create radio coverage or internet access.
