package com.dreameducation.wifi;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.wifi.WifiManager;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager.LocalOnlyHotspotCallback;
import android.net.wifi.WifiManager.LocalOnlyHotspotReservation;
import android.net.VpnService;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
  private static final int VPN_REQUEST = 1001;
  private static final int WIFI_PERMISSION_REQUEST = 1002;

  private TextView vpnStatus;
  private TextView hotspotStatus;
  private TextView hotspotDetails;
  private Button startHotspotButton;
  private Button stopHotspotButton;
  private WifiManager wifiManager;
  private LocalOnlyHotspotReservation hotspotReservation;
  private final Handler mainHandler = new Handler(Looper.getMainLooper());

  private final LocalOnlyHotspotCallback hotspotCallback = new LocalOnlyHotspotCallback() {
    @Override public void onStarted(LocalOnlyHotspotReservation reservation) {
      runOnUiThread(() -> {
        hotspotReservation = reservation;
        WifiConfiguration config = reservation.getWifiConfiguration();
        String ssid = config != null && config.SSID != null ? config.SSID.replace("\"", "") : "SSID provided by Android";
        String password = config != null && config.preSharedKey != null ? config.preSharedKey.replace("\"", "") : "Use the credentials provided by Android";
        hotspotStatus.setText("Broadcasting locally");
        hotspotDetails.setText("Wi-Fi name: " + ssid + "\nPassword: " + password + "\n\nThis is a local-only network. Internet sharing is not enabled by this prototype.");
        startHotspotButton.setEnabled(false);
        stopHotspotButton.setEnabled(true);
      });
    }

    @Override public void onStopped() {
      runOnUiThread(() -> clearHotspotUi("Android stopped the local hotspot."));
    }

    @Override public void onFailed(int reason) {
      runOnUiThread(() -> {
        String message;
        switch (reason) {
          case ERROR_INCOMPATIBLE_MODE: message = "Hotspot could not start because this device is in an incompatible Wi-Fi mode."; break;
          case ERROR_NO_CHANNEL: message = "Android could not find an available Wi-Fi channel."; break;
          case ERROR_TETHERING_DISALLOWED: message = "This device or administrator disallows local hotspots."; break;
          default: message = "Android could not start the local hotspot (error " + reason + ").";
        }
        clearHotspotUi(message);
      });
    }
  };

  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    wifiManager = getSystemService(WifiManager.class);

    LinearLayout box = new LinearLayout(this);
    box.setOrientation(1);
    box.setGravity(Gravity.CENTER_HORIZONTAL);
    box.setPadding(28, 28, 28, 28);

    TextView title = new TextView(this);
    title.setText("Dream Education · Dream Wi-Fi");
    title.setTextSize(25);
    box.addView(title);

    TextView broadcastTitle = new TextView(this);
    broadcastTitle.setText("Dream Wi-Fi Connect");
    broadcastTitle.setTextSize(20);
    broadcastTitle.setPadding(0, 24, 0, 4);
    box.addView(broadcastTitle);

    TextView broadcastNote = new TextView(this);
    broadcastNote.setText("Start a Wi-Fi network from inside Dream Education. Android chooses the network name on most devices. This first prototype creates a local-only network; it does not share internet.");
    broadcastNote.setTextSize(14);
    box.addView(broadcastNote);

    hotspotStatus = new TextView(this);
    hotspotStatus.setText("Not broadcasting");
    hotspotStatus.setTextSize(16);
    hotspotStatus.setPadding(0, 16, 0, 4);
    box.addView(hotspotStatus);

    hotspotDetails = new TextView(this);
    hotspotDetails.setText("Tap Start Dream Wi-Fi to request a local hotspot.");
    hotspotDetails.setTextSize(14);
    hotspotDetails.setPadding(0, 4, 0, 8);
    box.addView(hotspotDetails);

    startHotspotButton = new Button(this);
    startHotspotButton.setText("Start Dream Wi-Fi");
    startHotspotButton.setOnClickListener(v -> requestHotspotPermissionAndStart());
    box.addView(startHotspotButton);

    stopHotspotButton = new Button(this);
    stopHotspotButton.setText("Stop Dream Wi-Fi");
    stopHotspotButton.setEnabled(false);
    stopHotspotButton.setOnClickListener(v -> stopHotspot());
    box.addView(stopHotspotButton);

    TextView vpnTitle = new TextView(this);
    vpnTitle.setText("Dream Tunnel VPN");
    vpnTitle.setTextSize(20);
    vpnTitle.setPadding(0, 28, 0, 4);
    box.addView(vpnTitle);

    TextView vpnNote = new TextView(this);
    vpnNote.setText("The owner SOCKS5 proxy must already be running in Termux on 127.0.0.1:1080. This is separate from the Wi-Fi broadcast feature.");
    vpnNote.setTextSize(14);
    box.addView(vpnNote);

    vpnStatus = new TextView(this);
    vpnStatus.setText("Disconnected. Start and verify the owner proxy first.");
    vpnStatus.setPadding(0, 12, 0, 4);
    box.addView(vpnStatus);

    Button vpnOn = new Button(this);
    vpnOn.setText("Connect Dream VPN");
    vpnOn.setOnClickListener(v -> {
      Intent permission = VpnService.prepare(this);
      if (permission != null) startActivityForResult(permission, VPN_REQUEST);
      else startVpn();
    });
    box.addView(vpnOn);

    Button vpnOff = new Button(this);
    vpnOff.setText("Disconnect VPN");
    vpnOff.setOnClickListener(v -> {
      Intent intent = new Intent(this, DreamVpnService.class);
      intent.setAction(DreamVpnService.ACTION_STOP);
      startService(intent);
      vpnStatus.setText("VPN disconnect requested.");
    });
    box.addView(vpnOff);

    setContentView(box);
  }

  private void requestHotspotPermissionAndStart() {
    String permission = Build.VERSION.SDK_INT >= 33
        ? "android.permission.NEARBY_WIFI_DEVICES"
        : Manifest.permission.ACCESS_FINE_LOCATION;
    if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{permission}, WIFI_PERMISSION_REQUEST);
      return;
    }
    if (Build.VERSION.SDK_INT < 33 && checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{permission}, WIFI_PERMISSION_REQUEST);
      return;
    }
    startHotspot();
  }

  @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == WIFI_PERMISSION_REQUEST) {
      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) startHotspot();
      else clearHotspotUi("Nearby Wi-Fi permission is required to start Dream Wi-Fi.");
    }
  }

  private void startHotspot() {
    if (hotspotReservation != null) return;
    try {
      hotspotStatus.setText("Requesting Android Wi-Fi broadcast…");
      hotspotDetails.setText("Waiting for the device to create the network.");
      startHotspotButton.setEnabled(false);
      wifiManager.startLocalOnlyHotspot(hotspotCallback, mainHandler);
    } catch (SecurityException | IllegalStateException error) {
      clearHotspotUi("Could not start Dream Wi-Fi: " + safeMessage(error));
    }
  }

  private void stopHotspot() {
    if (hotspotReservation != null) {
      hotspotReservation.close();
      hotspotReservation = null;
    }
    clearHotspotUi("Dream Wi-Fi is stopped.");
  }

  private void clearHotspotUi(String message) {
    hotspotStatus.setText(message);
    hotspotDetails.setText("No local Wi-Fi broadcast is currently active.");
    startHotspotButton.setEnabled(true);
    stopHotspotButton.setEnabled(false);
  }

  private String safeMessage(Exception error) {
    String message = error.getMessage();
    if (message == null) return error.getClass().getSimpleName();
    message = message.replaceAll("[\\r\\n]", " ");
    return message.substring(0, Math.min(180, message.length()));
  }

  @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode == VPN_REQUEST && resultCode == RESULT_OK) startVpn();
    else if (requestCode == VPN_REQUEST) vpnStatus.setText("VPN permission was not granted.");
  }

  private void startVpn() {
    Intent intent = new Intent(this, DreamVpnService.class);
    intent.setAction(DreamVpnService.ACTION_START);
    if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent);
    else startService(intent);
    vpnStatus.setText("Starting VPN; verify the local relay remains connected.");
  }

  @Override protected void onDestroy() {
    // Releasing the reservation stops the app-owned local-only hotspot.
    if (hotspotReservation != null) {
      hotspotReservation.close();
      hotspotReservation = null;
    }
    super.onDestroy();
  }
}
