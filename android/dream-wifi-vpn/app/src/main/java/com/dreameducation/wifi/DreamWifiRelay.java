package com.dreameducation.wifi;

import android.util.Base64;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * Native owner/source relay. All relay sockets bind to loopback or public destinations only.
 * The hosting provider's captive portal/package authentication is still required for internet access.
 */
final class DreamWifiRelay {
    static final String BASE_URL = "https://dream-education-live-4.onrender.com";
    static final String TUNNEL_URL = "wss://dream-education-live-4.onrender.com/api/dream-education/dream-wifi/tunnel";
    static final int LOCAL_PROXY_PORT = 1080;
    private static final int MAX_CHUNK = 12 * 1024;
    private static final int MAX_UDP_BYTES = 8192;
    private static final int MAX_STREAMS = 8;

    interface Listener {
        void onStatus(String message);
        void onReady();
    }

    private final OkHttpClient http = new OkHttpClient.Builder()
            .pingInterval(25, TimeUnit.SECONDS)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build();
    private final ExecutorService workers = Executors.newCachedThreadPool();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final ConcurrentHashMap<String, Stream> ownerStreams = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Socket> sourceStreams = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UdpAssociation> udpAssociations = new ConcurrentHashMap<>();
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicBoolean readyNotified = new AtomicBoolean(false);
    private final AtomicBoolean ownerRetryScheduled = new AtomicBoolean(false);
    private final AtomicBoolean sourceRetryScheduled = new AtomicBoolean(false);

    private volatile String accessToken;
    private volatile String sourceTicket;
    private volatile WebSocket ownerSocket;
    private volatile WebSocket sourceSocket;
    private volatile boolean ownerReady;
    private volatile boolean sourceReady;
    private volatile ServerSocket proxyServer;
    private volatile Listener listener;
    private volatile int ownerRetrySeconds = 3;
    private volatile int sourceRetrySeconds = 3;

    DreamWifiRelay(String accessToken, String sourceTicket, Listener listener) {
        this.accessToken = accessToken;
        this.sourceTicket = sourceTicket;
        this.listener = listener;
    }

    void start() {
        if (!running.compareAndSet(false, true)) return;
        workers.execute(this::serveSocks);
        connectOwner();
        connectSource();
        status("Connecting to Dream Tunnel and Quant-side source…");
    }

    boolean isReady() {
        return running.get() && ownerReady && sourceReady && proxyServer != null && !proxyServer.isClosed();
    }

    private void status(String message) {
        Listener current = listener;
        if (current != null) current.onStatus(message);
    }

    private void notifyReadyIfPossible() {
        if (isReady() && readyNotified.compareAndSet(false, true)) {
            status("Dream Tunnel connected. Internet access still depends on the Quant package being active.");
            Listener current = listener;
            if (current != null) current.onReady();
        } else if (!isReady()) {
            readyNotified.set(false);
        }
    }

    private void connectOwner() {
        if (!running.get()) return;
        Request request = new Request.Builder().url(TUNNEL_URL).build();
        ownerSocket = http.newWebSocket(request, new WebSocketListener() {
            @Override public void onOpen(WebSocket webSocket, Response response) {
                if (!running.get()) { webSocket.close(1000, "stopped"); return; }
                ownerSocket = webSocket;
                webSocket.send(new SafeJson().putSafe("type", "register")
                        .putSafe("role", "owner").putSafe("accessToken", accessToken).toString());
                status("Authenticating owner control channel…");
            }
            @Override public void onMessage(WebSocket webSocket, String text) {
                if (webSocket != ownerSocket) return;
                JSONObject message;
                try { message = new JSONObject(text); } catch (Exception ignored) { return; }
                String type = message.optString("type", "");
                if ("registered".equals(type) && "owner".equals(message.optString("role"))) {
                    ownerReady = true;
                    ownerRetrySeconds = 3;
                    status("Owner authenticated; waiting for Quant source…");
                    notifyReadyIfPossible();
                } else if ("tcp-opened".equals(type)) {
                    Stream stream = ownerStreams.get(message.optString("id", ""));
                    if (stream != null) { stream.openedSuccessfully = true; stream.opened.countDown(); }
                } else if ("tcp-error".equals(type)) {
                    Stream stream = ownerStreams.get(message.optString("id", ""));
                    if (stream != null) {
                        stream.error = message.optString("error", "Destination connection failed");
                        stream.opened.countDown();
                    }
                } else if ("tcp-data".equals(type)) {
                    Stream stream = ownerStreams.get(message.optString("id", ""));
                    if (stream != null) {
                        try {
                            byte[] data = Base64.decode(message.optString("data", ""), Base64.DEFAULT);
                            if (data.length <= MAX_CHUNK && stream.socket != null && !stream.socket.isClosed()) {
                                synchronized (stream.output) { stream.output.write(data); stream.output.flush(); }
                            } else closeOwnerStream(message.optString("id", ""), true);
                        } catch (Exception error) { closeOwnerStream(message.optString("id", ""), true); }
                    }
                } else if ("tcp-close".equals(type)) {
                    closeOwnerStream(message.optString("id", ""), false);
                } else if ("udp-data".equals(type)) {
                    handleUdpResponse(message);
                } else if ("udp-error".equals(type) || "udp-close".equals(type)) {
                    UdpAssociation association = udpAssociations.get(message.optString("id", ""));
                    if (association != null && "udp-error".equals(type)) status("DNS/UDP relay error: " + message.optString("error", "unknown error"));
                } else if ("source-state".equals(type)) {
                    status(message.optBoolean("connected") ? "Quant source is connected; checking relay…" : "Quant source is disconnected.");
                } else if ("error".equals(type)) {
                    status("Owner channel rejected: " + message.optString("error", "authorization failed"));
                    webSocket.close(1008, "owner authorization rejected");
                }
            }
            @Override public void onClosed(WebSocket webSocket, int code, String reason) {
                if (webSocket != ownerSocket) return;
                ownerSocket = null;
                ownerReady = false;
                closeAllOwnerStreams();
                status("Owner channel closed (" + code + "): " + safeReason(reason));
                scheduleOwnerReconnect();
            }
            @Override public void onFailure(WebSocket webSocket, Throwable error, Response response) {
                if (webSocket != ownerSocket) return;
                ownerSocket = null;
                ownerReady = false;
                closeAllOwnerStreams();
                status("Owner channel failed: " + safeReason(error.getMessage()));
                scheduleOwnerReconnect();
            }
        });
    }

    private void connectSource() {
        if (!running.get()) return;
        Request request = new Request.Builder().url(TUNNEL_URL).build();
        sourceSocket = http.newWebSocket(request, new WebSocketListener() {
            @Override public void onOpen(WebSocket webSocket, Response response) {
                if (!running.get()) { webSocket.close(1000, "stopped"); return; }
                sourceSocket = webSocket;
                webSocket.send(new SafeJson().putSafe("type", "register")
                        .putSafe("role", "source").putSafe("sourceToken", sourceTicket).toString());
                status("Authenticating Quant-side source…");
            }
            @Override public void onMessage(WebSocket webSocket, String text) {
                if (webSocket != sourceSocket) return;
                JSONObject message;
                try { message = new JSONObject(text); } catch (Exception ignored) { return; }
                String type = message.optString("type", "");
                if ("registered".equals(type) && "source".equals(message.optString("role"))) {
                    sourceReady = true;
                    sourceRetrySeconds = 3;
                    status("Quant source authenticated; waiting for owner channel…");
                    notifyReadyIfPossible();
                } else if ("ping".equals(type)) {
                    sendSource(new SafeJson().putSafe("type", "pong").putSafe("id", message.optString("id", "")).toString());
                } else if ("tcp-open".equals(type)) {
                    workers.execute(() -> openSourceStream(message));
                } else if ("tcp-data".equals(type)) {
                    Socket socket = sourceStreams.get(message.optString("id", ""));
                    if (socket != null) {
                        try {
                            byte[] data = Base64.decode(message.optString("data", ""), Base64.DEFAULT);
                            if (data.length > MAX_CHUNK) { closeSourceStream(message.optString("id", ""), true); return; }
                            synchronized (socket) { socket.getOutputStream().write(data); socket.getOutputStream().flush(); }
                        } catch (Exception error) { closeSourceStream(message.optString("id", ""), true); }
                    }
                } else if ("tcp-close".equals(type)) {
                    closeSourceStream(message.optString("id", ""), false);
                } else if ("udp-send".equals(type)) {
                    workers.execute(() -> relayUdp(message));
                } else if ("error".equals(type)) {
                    status("Source channel rejected: " + message.optString("error", "authorization failed"));
                    webSocket.close(1008, "source authorization rejected");
                }
            }
            @Override public void onClosed(WebSocket webSocket, int code, String reason) {
                if (webSocket != sourceSocket) return;
                sourceSocket = null;
                sourceReady = false;
                closeAllSourceStreams();
                status("Quant source disconnected (" + code + "): " + safeReason(reason));
                scheduleSourceReconnect();
            }
            @Override public void onFailure(WebSocket webSocket, Throwable error, Response response) {
                if (webSocket != sourceSocket) return;
                sourceSocket = null;
                sourceReady = false;
                closeAllSourceStreams();
                status("Quant source connection failed: " + safeReason(error.getMessage()));
                scheduleSourceReconnect();
            }
        });
    }

    private void scheduleOwnerReconnect() {
        if (!running.get() || !ownerRetryScheduled.compareAndSet(false, true)) return;
        int delay = ownerRetrySeconds;
        ownerRetrySeconds = Math.min(ownerRetrySeconds * 2, 60);
        scheduler.schedule(() -> {
            ownerRetryScheduled.set(false);
            if (running.get() && !ownerReady) connectOwner();
        }, delay, TimeUnit.SECONDS);
    }

    private void scheduleSourceReconnect() {
        if (!running.get() || !sourceRetryScheduled.compareAndSet(false, true)) return;
        int delay = sourceRetrySeconds;
        sourceRetrySeconds = Math.min(sourceRetrySeconds * 2, 60);
        scheduler.schedule(() -> {
            sourceRetryScheduled.set(false);
            if (running.get() && !sourceReady) connectSource();
        }, delay, TimeUnit.SECONDS);
    }

    private void serveSocks() {
        try {
            ServerSocket server = new ServerSocket();
            server.setReuseAddress(true);
            server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), LOCAL_PROXY_PORT), 32);
            proxyServer = server;
            status("Local SOCKS5 relay is listening.");
            notifyReadyIfPossible();
            while (running.get() && !server.isClosed()) {
                Socket client = server.accept();
                client.setTcpNoDelay(true);
                workers.execute(() -> handleSocksClient(client));
            }
        } catch (IOException error) {
            if (running.get()) status("Local relay could not bind port " + LOCAL_PROXY_PORT + ": " + safeReason(error.getMessage()));
        }
    }

    private void handleSocksClient(Socket client) {
        String streamId = null;
        UdpAssociation udp = null;
        try {
            client.setSoTimeout(20000);
            InputStream input = client.getInputStream();
            OutputStream output = client.getOutputStream();
            int version = input.read();
            int methods = input.read();
            if (version != 5 || methods < 1) return;
            byte[] methodList = readExactly(input, methods);
            boolean noAuth = false;
            for (byte method : methodList) if ((method & 0xff) == 0) noAuth = true;
            output.write(new byte[]{5, (byte) (noAuth ? 0 : 0xff)}); output.flush();
            if (!noAuth) return;

            byte[] header = readExactly(input, 4);
            if ((header[0] & 0xff) != 5 || header[2] != 0) { socksReply(output, 1); return; }
            int command = header[1] & 0xff;
            int atyp = header[3] & 0xff;
            String host = readSocksHost(input, atyp);
            byte[] portBytes = readExactly(input, 2);
            int port = ((portBytes[0] & 0xff) << 8) | (portBytes[1] & 0xff);

            if (command == 3) {
                udp = createUdpAssociation(client, output);
                if (udp == null) socksReply(output, 1);
                else {
                    client.setSoTimeout(0);
                    while (running.get() && input.read() != -1) { /* keep the SOCKS UDP control connection open */ }
                }
                return;
            }
            if (command != 1 || port != 80 && port != 443 || host.isEmpty()) { socksReply(output, 2); return; }
            if (!ownerReady || ownerSocket == null) { socksReply(output, 1); return; }
            if (ownerStreams.size() >= MAX_STREAMS) { socksReply(output, 1); return; }

            streamId = UUID.randomUUID().toString().replace("-", "");
            Stream stream = new Stream(client, output);
            ownerStreams.put(streamId, stream);
            JSONObject open = new SafeJson().putSafe("type", "tcp-open").putSafe("id", streamId)
                    .putSafe("host", host).putSafe("port", port);
            if (!sendOwner(open.toString())) { ownerStreams.remove(streamId); socksReply(output, 1); return; }
            if (!stream.opened.await(15, TimeUnit.SECONDS) || !stream.openedSuccessfully) {
                ownerStreams.remove(streamId);
                socksReply(output, 5);
                return;
            }
            client.setSoTimeout(0);
            socksReply(output, 0);
            byte[] buffer = new byte[MAX_CHUNK];
            int count;
            while (running.get() && (count = input.read(buffer)) != -1) {
                if (count == 0) continue;
                byte[] chunk = Arrays.copyOf(buffer, count);
                if (!sendOwner(new SafeJson().putSafe("type", "tcp-data").putSafe("id", streamId)
                        .putSafe("data", Base64.encodeToString(chunk, Base64.NO_WRAP)).toString())) break;
            }
        } catch (Exception ignored) {
            // Socket disconnects are expected when browsers cancel requests or the tunnel reconnects.
        } finally {
            if (streamId != null) closeOwnerStream(streamId, true);
            if (udp != null) closeUdpAssociation(udp.id, true);
            try { client.close(); } catch (Exception ignored) {}
        }
    }

    private UdpAssociation createUdpAssociation(Socket control, OutputStream output) throws IOException {
        if (!ownerReady || ownerSocket == null) return null;
        DatagramSocket datagram = new DatagramSocket(null);
        datagram.setReuseAddress(true);
        datagram.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0));
        String id = UUID.randomUUID().toString().replace("-", "");
        UdpAssociation association = new UdpAssociation(id, datagram);
        udpAssociations.put(id, association);
        int port = datagram.getLocalPort();
        output.write(new byte[]{5, 0, 0, 1, 127, 0, 0, 1, (byte) (port >> 8), (byte) port});
        output.flush();
        workers.execute(() -> receiveUdp(association));
        return association;
    }

    private void receiveUdp(UdpAssociation association) {
        byte[] buffer = new byte[65535];
        while (running.get() && !association.socket.isClosed()) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                association.socket.receive(packet);
                if (!packet.getAddress().isLoopbackAddress()) continue;
                ParsedUdp parsed = parseUdp(packet.getData(), packet.getLength());
                if (parsed == null || parsed.port != 53 || !ownerReady) continue;
                association.endpoint = new InetSocketAddress(packet.getAddress(), packet.getPort());
                sendOwner(new SafeJson().putSafe("type", "udp-send").putSafe("id", association.id)
                        .putSafe("host", parsed.host).putSafe("port", parsed.port)
                        .putSafe("data", Base64.encodeToString(parsed.data, Base64.NO_WRAP)).toString());
            } catch (IOException error) {
                if (!association.socket.isClosed()) status("Local DNS relay error: " + safeReason(error.getMessage()));
                break;
            }
        }
    }

    private void handleUdpResponse(JSONObject message) {
        UdpAssociation association = udpAssociations.get(message.optString("id", ""));
        if (association == null || association.endpoint == null || association.socket.isClosed()) return;
        try {
            byte[] data = Base64.decode(message.optString("data", ""), Base64.DEFAULT);
            if (data.length > MAX_UDP_BYTES) return;
            byte[] packet = buildUdpPacket(message.optString("host", ""), message.optInt("port", 53), data);
            if (packet != null) association.socket.send(new DatagramPacket(packet, packet.length, association.endpoint));
        } catch (Exception ignored) {}
    }

    private void openSourceStream(JSONObject message) {
        String id = message.optString("id", "");
        String host = message.optString("host", "").trim();
        int port = message.optInt("port", 0);
        Socket socket = null;
        try {
            if (id.isEmpty() || host.isEmpty() || host.length() > 253 || (port != 80 && port != 443)) {
                sendSourceError(id, "Invalid or unsupported destination."); return;
            }
            if (sourceStreams.size() >= MAX_STREAMS) { sendSourceError(id, "Source stream limit reached."); return; }
            InetAddress target = resolvePublicAddress(host);
            socket = new Socket();
            socket.connect(new InetSocketAddress(target, port), 12000);
            socket.setSoTimeout(5 * 60 * 1000);
            socket.setTcpNoDelay(true);
            if (!running.get() || !sourceReady) { socket.close(); return; }
            sourceStreams.put(id, socket);
            sendSource(new SafeJson().putSafe("type", "tcp-opened").putSafe("id", id).toString());
            InputStream input = socket.getInputStream();
            byte[] buffer = new byte[MAX_CHUNK];
            int count;
            while (running.get() && (count = input.read(buffer)) != -1) {
                if (count == 0) continue;
                byte[] chunk = Arrays.copyOf(buffer, count);
                if (!sendSource(new SafeJson().putSafe("type", "tcp-data").putSafe("id", id)
                        .putSafe("data", Base64.encodeToString(chunk, Base64.NO_WRAP)).toString())) break;
            }
        } catch (SocketTimeoutException error) {
            sendSourceError(id, "TCP destination timed out.");
        } catch (Exception error) {
            sendSourceError(id, safeReason(error.getMessage()));
        } finally {
            if (socket != null) {
                sourceStreams.remove(id, socket);
                try { socket.close(); } catch (Exception ignored) {}
            }
            if (running.get() && sourceReady) sendSource(new SafeJson().putSafe("type", "tcp-close").putSafe("id", id).toString());
        }
    }

    private void relayUdp(JSONObject message) {
        String id = message.optString("id", "");
        String host = message.optString("host", "").trim();
        int port = message.optInt("port", 0);
        try {
            if (port != 53 || host.isEmpty()) throw new IOException("Only DNS UDP on port 53 is supported.");
            InetAddress target = resolvePublicAddress(host);
            byte[] data = Base64.decode(message.optString("data", ""), Base64.DEFAULT);
            if (data.length == 0 || data.length > MAX_UDP_BYTES) throw new IOException("DNS datagram size is not supported.");
            try (DatagramSocket socket = new DatagramSocket()) {
                socket.setSoTimeout(3500);
                socket.send(new DatagramPacket(data, data.length, target, port));
                byte[] buffer = new byte[MAX_UDP_BYTES];
                DatagramPacket response = new DatagramPacket(buffer, buffer.length);
                socket.receive(response);
                byte[] result = Arrays.copyOf(response.getData(), response.getLength());
                sendSource(new SafeJson().putSafe("type", "udp-data").putSafe("id", id)
                        .putSafe("host", host).putSafe("port", port)
                        .putSafe("data", Base64.encodeToString(result, Base64.NO_WRAP)).toString());
            }
        } catch (Exception error) {
            sendSource(new SafeJson().putSafe("type", "udp-error").putSafe("id", id)
                    .putSafe("error", safeReason(error.getMessage())).toString());
        }
    }

    private InetAddress resolvePublicAddress(String host) throws IOException {
        InetAddress[] answers = InetAddress.getAllByName(host);
        if (answers.length == 0) throw new IOException("Destination did not resolve.");
        for (InetAddress answer : answers) if (!isPublicAddress(answer)) throw new IOException("Private or reserved destination is blocked.");
        return answers[0];
    }

    private boolean isPublicAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
        byte[] b = address.getAddress();
        if (b.length == 4) {
            int a = b[0] & 255, second = b[1] & 255, third = b[2] & 255;
            if (a == 0 || a >= 224 || (a == 100 && second >= 64 && second <= 127)
                    || (a == 192 && second == 0 && (third == 0 || third == 2))
                    || (a == 192 && second == 168) || (a == 198 && (second == 18 || second == 19 || second == 51))
                    || (a == 203 && second == 0 && third == 113)) return false;
        } else if (b.length == 16) {
            if ((b[0] & 0xfe) == 0xfc || (b[0] == 0x20 && (b[1] & 0xff) == 0x01
                    && (b[2] & 0xff) == 0x0d && (b[3] & 0xff) == 0xb8)) return false;
            boolean mapped = true;
            for (int i = 0; i < 10; i++) if (b[i] != 0) mapped = false;
            if (mapped && (b[10] & 255) == 255 && (b[11] & 255) == 255) return false;
        }
        return true;
    }

    private ParsedUdp parseUdp(byte[] packet, int length) {
        try {
            if (length < 10 || packet[0] != 0 || packet[1] != 0 || packet[2] != 0) return null;
            int atyp = packet[3] & 255, offset;
            String host;
            if (atyp == 1) {
                if (length < 10) return null;
                host = (packet[4] & 255) + "." + (packet[5] & 255) + "." + (packet[6] & 255) + "." + (packet[7] & 255);
                offset = 8;
            } else if (atyp == 3) {
                int n = packet[4] & 255;
                if (n == 0 || length < 7 + n) return null;
                host = new String(packet, 5, n, StandardCharsets.UTF_8);
                offset = 5 + n;
            } else if (atyp == 4) {
                if (length < 22) return null;
                byte[] raw = Arrays.copyOfRange(packet, 4, 20);
                host = InetAddress.getByAddress(raw).getHostAddress();
                offset = 20;
            } else return null;
            int port = ((packet[offset] & 255) << 8) | (packet[offset + 1] & 255);
            byte[] data = Arrays.copyOfRange(packet, offset + 2, length);
            if (port < 1 || data.length == 0 || data.length > MAX_UDP_BYTES) return null;
            return new ParsedUdp(host, port, data);
        } catch (Exception ignored) { return null; }
    }

    private byte[] buildUdpPacket(String host, int port, byte[] data) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            out.write(new byte[]{0, 0, 0});
            InetAddress address = InetAddress.getByName(host);
            byte[] bytes = address.getAddress();
            if (bytes.length == 4) { out.write(1); out.write(bytes); }
            else { byte[] name = host.getBytes(StandardCharsets.UTF_8); if (name.length > 255) return null; out.write(3); out.write(name.length); out.write(name); }
            out.write((port >> 8) & 255); out.write(port & 255); out.write(data);
            return out.toByteArray();
        } catch (Exception ignored) { return null; }
    }

    private String readSocksHost(InputStream input, int atyp) throws IOException {
        if (atyp == 1) {
            byte[] b = readExactly(input, 4);
            return (b[0] & 255) + "." + (b[1] & 255) + "." + (b[2] & 255) + "." + (b[3] & 255);
        }
        if (atyp == 3) {
            int length = input.read();
            if (length <= 0) throw new IOException("Invalid SOCKS domain name.");
            return new String(readExactly(input, length), StandardCharsets.UTF_8);
        }
        if (atyp == 4) return InetAddress.getByAddress(readExactly(input, 16)).getHostAddress();
        throw new IOException("Unsupported SOCKS address type.");
    }

    private byte[] readExactly(InputStream input, int length) throws IOException {
        byte[] data = new byte[length];
        int offset = 0;
        while (offset < length) {
            int count = input.read(data, offset, length - offset);
            if (count < 0) throw new EOFException("Unexpected end of SOCKS request.");
            offset += count;
        }
        return data;
    }

    private void socksReply(OutputStream output, int code) throws IOException {
        output.write(new byte[]{5, (byte) code, 0, 1, 0, 0, 0, 0, 0, 0});
        output.flush();
    }

    private void sendSourceError(String id, String error) {
        sendSource(new SafeJson().putSafe("type", "tcp-error").putSafe("id", id)
                .putSafe("error", safeReason(error)).toString());
    }

    private boolean sendOwner(String text) {
        WebSocket socket = ownerSocket;
        return ownerReady && socket != null && socket.send(text);
    }

    private boolean sendSource(String text) {
        WebSocket socket = sourceSocket;
        return sourceReady && socket != null && socket.send(text);
    }

    private void closeOwnerStream(String id, boolean notify) {
        Stream stream = ownerStreams.remove(id);
        if (stream == null) return;
        stream.opened.countDown();
        if (notify) sendOwner(new SafeJson().putSafe("type", "tcp-close").putSafe("id", id).toString());
        try { stream.socket.close(); } catch (Exception ignored) {}
    }

    private void closeAllOwnerStreams() {
        for (String id : ownerStreams.keySet()) closeOwnerStream(id, false);
    }

    private void closeSourceStream(String id, boolean notify) {
        Socket socket = sourceStreams.remove(id);
        if (notify) sendSource(new SafeJson().putSafe("type", "tcp-close").putSafe("id", id).toString());
        if (socket != null) try { socket.close(); } catch (Exception ignored) {}
    }

    private void closeAllSourceStreams() {
        for (String id : sourceStreams.keySet()) closeSourceStream(id, false);
    }

    private void closeUdpAssociation(String id, boolean notify) {
        UdpAssociation association = udpAssociations.remove(id);
        if (association == null) return;
        try { association.socket.close(); } catch (Exception ignored) {}
        if (notify) sendOwner(new SafeJson().putSafe("type", "udp-close").putSafe("id", id).toString());
    }

    private String safeReason(String value) {
        if (value == null || value.trim().isEmpty()) return "no details";
        String clean = value.replaceAll("[\\r\\n]", " ");
        return clean.substring(0, Math.min(180, clean.length()));
    }

    void stop() {
        if (!running.compareAndSet(true, false)) return;
        readyNotified.set(false);
        ownerReady = false;
        sourceReady = false;
        WebSocket owner = ownerSocket; ownerSocket = null;
        WebSocket source = sourceSocket; sourceSocket = null;
        if (owner != null) owner.close(1000, "stopped");
        if (source != null) source.close(1000, "stopped");
        ServerSocket server = proxyServer; proxyServer = null;
        if (server != null) try { server.close(); } catch (Exception ignored) {}
        closeAllOwnerStreams();
        closeAllSourceStreams();
        for (String id : udpAssociations.keySet()) closeUdpAssociation(id, false);
        workers.shutdownNow();
        scheduler.shutdownNow();
        http.dispatcher().executorService().shutdown();
        http.connectionPool().evictAll();
        listener = null;
    }

    private static final class SafeJson extends JSONObject {
        SafeJson putSafe(String key, Object value) {
            try { super.put(key, value); } catch (Exception ignored) {}
            return this;
        }
    }

    private static final class Stream {
        final Socket socket;
        final OutputStream output;
        final CountDownLatch opened = new CountDownLatch(1);
        volatile boolean openedSuccessfully;
        volatile String error;
        Stream(Socket socket, OutputStream output) { this.socket = socket; this.output = output; }
    }

    private static final class UdpAssociation {
        final String id;
        final DatagramSocket socket;
        volatile InetSocketAddress endpoint;
        UdpAssociation(String id, DatagramSocket socket) { this.id = id; this.socket = socket; }
    }

    private static final class ParsedUdp {
        final String host; final int port; final byte[] data;
        ParsedUdp(String host, int port, byte[] data) { this.host = host; this.port = port; this.data = data; }
    }
}
