package com.dreameducation.wifi;

import android.app.Activity;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int VPN_PERMISSION_REQUEST = 1001;
    private final ExecutorService authWorker = Executors.newSingleThreadExecutor();
    private EditText emailInput;
    private EditText passwordInput;
    private Button connectButton;
    private TextView status;
    private String pendingAccessToken;
    private String pendingRefreshToken;
    private String pendingSourceTicket;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(28, 32, 28, 24);

        TextView title = new TextView(this);
        title.setText("Dream Wi-Fi");
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        box.addView(title);

        TextView note = new TextView(this);
        note.setText("Sign in with your existing Dream Education account. Connect to Quant Wi-Fi and complete its own package/payment portal first. This app does not bypass provider access controls.");
        note.setTextSize(15);
        note.setPadding(0, 18, 0, 18);
        box.addView(note);

        emailInput = new EditText(this);
        emailInput.setSingleLine(true);
        emailInput.setHint("Dream Education email");
        emailInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        box.addView(emailInput, new LinearLayout.LayoutParams(-1, -2));

        passwordInput = new EditText(this);
        passwordInput.setSingleLine(true);
        passwordInput.setHint("Password");
        passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        box.addView(passwordInput, new LinearLayout.LayoutParams(-1, -2));

        connectButton = new Button(this);
        connectButton.setText("Sign in and connect");
        connectButton.setOnClickListener(v -> signInAndConnect());
        box.addView(connectButton);

        Button portalButton = new Button(this);
        portalButton.setText("Open Quant Wi-Fi portal");
        portalButton.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("http://quant.com/status")));
            } catch (Exception error) {
                status.setText("Could not open the Quant portal. Connect to Quant Wi-Fi and visit quant.com/status.");
            }
        });
        box.addView(portalButton);

        Button disconnect = new Button(this);
        disconnect.setText("Disconnect Dream VPN");
        disconnect.setOnClickListener(v -> {
            Intent intent = new Intent(this, DreamVpnService.class);
            intent.setAction(DreamVpnService.ACTION_STOP);
            startService(intent);
            status.setText("Disconnect requested.");
        });
        box.addView(disconnect);

        status = new TextView(this);
        status.setText("Ready. Complete Quant's package/login flow before testing internet.");
        status.setTextSize(14);
        status.setPadding(0, 16, 0, 0);
        box.addView(status);
        setContentView(box);
    }

    private void signInAndConnect() {
        String email = emailInput.getText().toString().trim();
        String password = passwordInput.getText().toString();
        if (email.isEmpty() || password.isEmpty()) {
            status.setText("Enter your Dream Education email and password.");
            return;
        }
        connectButton.setEnabled(false);
        status.setText("Signing in securely and requesting a short-lived source ticket…");
        authWorker.execute(() -> {
            try {
                JSONObject credentials = new JSONObject();
                credentials.put("email", email);
                credentials.put("password", password);
                JSONObject login = postJson(DreamWifiRelay.BASE_URL + "/api/auth/login", credentials, null);
                JSONObject session = login.optJSONObject("session");
                String accessToken = session == null ? "" : session.optString("access_token", "");
                String refreshToken = session == null ? "" : session.optString("refresh_token", "");
                if (!login.optBoolean("success") || accessToken.isEmpty() || refreshToken.isEmpty()) {
                    throw new Exception(login.optString("error", "Login did not return a session."));
                }
                JSONObject ticket = postJson(DreamWifiRelay.BASE_URL + "/api/dream-wifi/source-ticket",
                        new JSONObject(), accessToken);
                String sourceTicket = ticket.optString("token", "");
                if (!ticket.optBoolean("success") || sourceTicket.isEmpty()) {
                    throw new Exception(ticket.optString("error", "Could not authorize the source connection."));
                }
                runOnUiThread(() -> {
                    pendingAccessToken = accessToken;
                    pendingRefreshToken = refreshToken;
                    pendingSourceTicket = sourceTicket;
                    passwordInput.setText("");
                    connectButton.setEnabled(true);
                    Intent permission = VpnService.prepare(this);
                    if (permission != null) startActivityForResult(permission, VPN_PERMISSION_REQUEST);
                    else startVpnService();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    connectButton.setEnabled(true);
                    status.setText("Sign-in/connection setup failed: " + safe(error.getMessage()));
                });
            }
        });
    }

    private JSONObject postJson(String endpoint, JSONObject body, String bearer) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(15000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");
        if (bearer != null && !bearer.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + bearer);
        byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
        int code = connection.getResponseCode();
        InputStream stream = code >= 200 && code < 400 ? connection.getInputStream() : connection.getErrorStream();
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        if (stream != null) {
            try (InputStream input = stream) {
                byte[] chunk = new byte[4096];
                int count;
                while ((count = input.read(chunk)) != -1) buffer.write(chunk, 0, count);
            }
        }
        connection.disconnect();
        JSONObject result = new JSONObject(new String(buffer.toByteArray(), StandardCharsets.UTF_8));
        if (code < 200 || code >= 300) throw new Exception(result.optString("error", "Server rejected the request (HTTP " + code + ")."));
        return result;
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == VPN_PERMISSION_REQUEST) {
            if (resultCode == RESULT_OK) startVpnService();
            else status.setText("VPN permission was not granted.");
        }
    }

    private void startVpnService() {
        if (pendingAccessToken == null || pendingRefreshToken == null || pendingSourceTicket == null) {
            status.setText("Sign in again to create a secure tunnel session.");
            return;
        }
        Intent intent = new Intent(this, DreamVpnService.class);
        intent.setAction(DreamVpnService.ACTION_START);
        intent.putExtra(DreamVpnService.EXTRA_ACCESS_TOKEN, pendingAccessToken);
        intent.putExtra(DreamVpnService.EXTRA_REFRESH_TOKEN, pendingRefreshToken);
        intent.putExtra(DreamVpnService.EXTRA_SOURCE_TICKET, pendingSourceTicket);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent);
        else startService(intent);
        status.setText("Connecting to Dream Tunnel and Quant. Internet will work only if the Quant package is active.");
    }

    private String safe(String message) {
        if (message == null || message.trim().isEmpty()) return "unknown error";
        String clean = message.replace('\n', ' ').replace('\r', ' ');
        return clean.substring(0, Math.min(180, clean.length()));
    }

    @Override protected void onDestroy() {
        authWorker.shutdownNow();
        super.onDestroy();
    }
}
