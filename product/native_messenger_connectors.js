'use strict';

const fs = require('fs');
const path = require('path');

const INBOX_FILE = path.join(__dirname, '..', 'data', 'universal_delivery_inbox.json');
let inboxWrite = Promise.resolve();

function ensureInboxFile() {
  const directory = path.dirname(INBOX_FILE);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(INBOX_FILE)) fs.writeFileSync(INBOX_FILE, '[]', 'utf8');
}

function readInbox() {
  try {
    ensureInboxFile();
    const parsed = JSON.parse(fs.readFileSync(INBOX_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInboxMessage(message) {
  inboxWrite = inboxWrite.then(async () => {
    ensureInboxFile();
    const messages = readInbox();
    messages.push(message);
    const retained = messages.slice(-500);
    const temporary = INBOX_FILE + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(retained, null, 2), 'utf8');
    fs.renameSync(temporary, INBOX_FILE);
  });
  return inboxWrite;
}

function getDreamInboxMessages(limit = 50) {
  return readInbox().slice(-Math.max(1, Math.min(Number(limit) || 50, 500))).reverse();
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(value, fallback) {
  const raw = String(value || fallback || '').trim().replace(/\/$/, '');
  return raw;
}

function buildNativeMessengerConnectors(env = process.env) {
  const connectors = [];

  // Guaranteed first-party delivery destination. This is a real persistent
  // Dream Education inbox, not a fake external connector. External connectors
  // remain credential-gated below.
  connectors.push({
    id: 'dream-inbox-native',
    name: 'Dream Education Inbox',
    platform: 'dream_inbox',
    default_recipient: {
      type: 'owner',
      name: 'Dream Education Inbox',
      platform: 'dream_inbox',
      channel: 'inbox',
      address: 'owner'
    },
    channels: [{
      type: 'inbox',
      platform: 'dream_inbox',
      enabled: true,
      authorized: true,
      default_delivery: true,
      broadcast: true,
      send: async ({ body, recipient, message_id, broadcast }) => {
        const record = {
          message_id: String(message_id || ''),
          body: String(body || ''),
          recipient: recipient || null,
          broadcast: broadcast === true,
          delivered_at: new Date().toISOString()
        };
        await writeInboxMessage(record);
        return { success: true, status: 201, data: { stored: true, destination: 'dream_inbox', message_id: record.message_id } };
      }
    }]
  });

  const matrixToken = String(env.MATRIX_ACCESS_TOKEN || '').trim();
  const matrixRooms = splitList(env.MATRIX_BROADCAST_ROOM_IDS);
  const matrixHomeserver = normalizeBaseUrl(env.MATRIX_HOMESERVER_URL, 'https://matrix.org');

  if (matrixToken && matrixRooms.length) {
    connectors.push({
      id: 'matrix-native',
      name: 'Matrix',
      platform: 'matrix',
      recipients: matrixRooms.map((roomId) => ({
        type: 'group',
        address: roomId,
        platform: 'matrix',
        channel: 'room_message'
      })),
      channels: [{
        type: 'room_message',
        platform: 'matrix',
        enabled: true,
        authorized: true,
        send: async ({ body, recipient, message_id }) => {
          const roomId = String(recipient?.address || '').trim();
          if (!roomId) return { success: false, status: 400, data: { error: 'Matrix room ID is not configured.' } };
          const txn = encodeURIComponent(String(message_id || Date.now()));
          const encodedRoom = encodeURIComponent(roomId);
          const response = await fetch(
            matrixHomeserver + '/_matrix/client/v3/rooms/' + encodedRoom + '/send/m.room.message/' + txn,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + matrixToken
              },
              body: JSON.stringify({ msgtype: 'm.text', body: String(body || '') })
            }
          );
          const data = await response.json().catch(() => ({}));
          return { success: response.ok && Boolean(data.event_id), status: response.status, data };
        }
      }]
    });
  }

  const mastodonToken = String(env.MASTODON_ACCESS_TOKEN || '').trim();
  const mastodonBase = normalizeBaseUrl(env.MASTODON_BASE_URL, 'https://mastodon.social');

  if (mastodonToken) {
    connectors.push({
      id: 'mastodon-native',
      name: 'Mastodon',
      platform: 'mastodon',
      channels: [{
        type: 'post',
        platform: 'mastodon',
        enabled: true,
        authorized: true,
        broadcast: true,
        send: async ({ body, message_id }) => {
          const response = await fetch(mastodonBase + '/api/v1/statuses', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + mastodonToken,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Idempotency-Key': String(message_id || Date.now())
            },
            body: new URLSearchParams({ status: String(body || '') })
          });
          const data = await response.json().catch(() => ({}));
          return { success: response.ok && Boolean(data.id), status: response.status, data };
        }
      }]
    });
  }

  // Accept either a Bluesky handle or the same handle prefixed with @.
  const blueskyIdentifier = String(env.BLUESKY_IDENTIFIER || '').trim().replace(/^@+/, '');
  const blueskyPassword = String(env.BLUESKY_APP_PASSWORD || '').trim();
  const blueskyService = normalizeBaseUrl(env.BLUESKY_SERVICE_URL, 'https://bsky.social');

  if (blueskyIdentifier && blueskyPassword) {
    connectors.push({
      id: 'bluesky-native',
      name: 'Bluesky',
      platform: 'bluesky',
      channels: [{
        type: 'post',
        platform: 'bluesky',
        enabled: true,
        authorized: true,
        broadcast: true,
        send: async ({ body }) => {
          const sessionResponse = await fetch(blueskyService + '/xrpc/com.atproto.server.createSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: blueskyIdentifier,
              password: blueskyPassword
            })
          });
          const session = await sessionResponse.json().catch(() => ({}));
          if (!sessionResponse.ok || !session.accessJwt || !session.did) {
            return { success: false, status: sessionResponse.status, data: session };
          }

          const response = await fetch(blueskyService + '/xrpc/com.atproto.repo.createRecord', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + session.accessJwt
            },
            body: JSON.stringify({
              repo: session.did,
              collection: 'app.bsky.feed.post',
              record: {
                '$type': 'app.bsky.feed.post',
                text: String(body || ''),
                createdAt: new Date().toISOString()
              }
            })
          });
          const data = await response.json().catch(() => ({}));
          return { success: response.ok && Boolean(data.uri || data.cid), status: response.status, data };
        }
      }]
    });
  }

  const discordWebhooks = splitList(env.DISCORD_BROADCAST_WEBHOOK_URLS);
  if (discordWebhooks.length) {
    connectors.push({
      id: 'discord-native',
      name: 'Discord',
      platform: 'discord',
      recipients: discordWebhooks.map((url) => ({
        type: 'group',
        address: url,
        platform: 'discord',
        channel: 'webhook'
      })),
      channels: [{
        type: 'webhook',
        platform: 'discord',
        enabled: true,
        authorized: true,
        send: async ({ body, recipient }) => {
          const webhookUrl = String(recipient?.address || '').trim();
          if (!webhookUrl) return { success: false, status: 400, data: { error: 'Discord webhook is not configured.' } };
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: String(body || '') })
          });
          const data = await response.text().catch(() => '');
          return { success: response.ok, status: response.status, data };
        }
      }]
    });
  }

  return connectors;
}

module.exports = { buildNativeMessengerConnectors, getDreamInboxMessages, INBOX_FILE };
