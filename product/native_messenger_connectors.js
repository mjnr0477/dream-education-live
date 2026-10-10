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

function isValidEmailAddress(value) {
  const email = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function splitBlueskyText(text, maxGraphemes = 280) {
  const value = String(text || '');
  const limit = Math.max(1, Math.min(Number(maxGraphemes) || 280, 300));
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const graphemes = Array.from(segmenter.segment(value), (part) => part.segment);
    if (graphemes.length <= limit) return [value];
    const chunks = [];
    while (graphemes.length) {
      if (graphemes.length <= limit) {
        chunks.push(graphemes.splice(0).join(''));
        break;
      }
      let cut = limit;
      // Prefer a whitespace boundary without dropping any original characters.
      for (let i = limit - 1; i >= Math.floor(limit / 2); i -= 1) {
        if (/\s/u.test(graphemes[i])) {
          cut = i + 1;
          break;
        }
      }
      chunks.push(graphemes.splice(0, cut).join(''));
    }
    return chunks;
  }

  // Node versions without Intl.Segmenter still avoid splitting surrogate pairs.
  const characters = Array.from(value);
  const chunks = [];
  while (characters.length) chunks.push(characters.splice(0, limit).join(''));
  return chunks;
}

function buildNativeMessengerConnectors(env = process.env, options = {}) {
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

          const posts = splitBlueskyText(String(body || ''), 280);
          let root = null;
          let parent = null;
          for (let index = 0; index < posts.length; index += 1) {
            const record = {
              '$type': 'app.bsky.feed.post',
              text: posts[index],
              createdAt: new Date().toISOString()
            };
            if (parent) record.reply = { root, parent };

            const response = await fetch(blueskyService + '/xrpc/com.atproto.repo.createRecord', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.accessJwt
              },
              body: JSON.stringify({
                repo: session.did,
                collection: 'app.bsky.feed.post',
                record
              })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.uri || !data.cid) {
              return {
                success: false,
                status: response.status,
                data: {
                  ...data,
                  error: data.message || data.error || 'Bluesky rejected thread post ' + (index + 1) + ' of ' + posts.length + '.',
                  posts_sent: index,
                  posts_total: posts.length,
                  partial: index > 0
                }
              };
            }

            const reference = { uri: data.uri, cid: data.cid };
            if (!root) root = reference;
            parent = reference;
          }

          return {
            success: true,
            status: 200,
            data: {
              uri: root.uri,
              cid: root.cid,
              posts_sent: posts.length,
              posts_total: posts.length,
              threaded: posts.length > 1
            }
          };
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

  // Email broadcast uses Resend so no extra runtime package is required.
  // Credentials are kept in server environment variables, never in the browser.
  const resendApiKey = String(env.RESEND_API_KEY || '').trim();
  const emailFrom = String(env.EMAIL_FROM || '').trim();
  const emailFetch = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetch;
  const configuredEmailRecipients = Array.isArray(options.emailRecipients)
    ? options.emailRecipients
    : splitList(env.EMAIL_BROADCAST_TO);
  const emailRecipients = [...new Set(configuredEmailRecipients
    .map((item) => String(item?.email || item || '').trim().toLowerCase())
    .filter(isValidEmailAddress))];

  const gmailUser = String(env.GMAIL_USER || '').trim();
  const gmailAppPassword = String(env.GMAIL_APP_PASSWORD || '').trim();

  // Prefer the HTTPS Resend API when configured. Render Free web services
  // block outbound SMTP ports 25, 465, and 587, so Gmail SMTP cannot deliver
  // from those instances. Gmail SMTP remains a fallback for hosts that allow it.
  if (gmailUser && gmailAppPassword && emailRecipients.length && !(resendApiKey && emailFrom)) {
    const { sendGmailSmtpEmail } = require('./gmail_smtp_transport');
    connectors.push({
      id: 'email-gmail-smtp-native',
      name: 'Gmail',
      platform: 'email',
      recipients: emailRecipients.map((email) => ({
        type: 'person',
        email,
        address: email,
        platform: 'email',
        channel: 'email'
      })),
      channels: [{
        type: 'email',
        platform: 'email',
        enabled: true,
        authorized: true,
        send: async ({ body, recipient, subject }) => {
          const to = String(recipient?.email || recipient?.address || '').trim();
          if (!isValidEmailAddress(to)) {
            return { success: false, status: 400, data: { error: 'A valid email recipient is required.' } };
          }
          return sendGmailSmtpEmail({
            user: gmailUser,
            appPassword: gmailAppPassword,
            to,
            subject: String(subject || env.EMAIL_DEFAULT_SUBJECT || 'Message from Dream Education').trim().slice(0, 200),
            text: String(body || '')
          });
        }
      }]
    });
  } else if (resendApiKey && emailFrom && emailRecipients.length) {
    connectors.push({
      id: 'email-resend-native',
      name: 'Email',
      platform: 'email',
      recipients: emailRecipients.map((email) => ({
        type: 'person',
        email,
        address: email,
        platform: 'email',
        channel: 'email'
      })),
      channels: [{
        type: 'email',
        platform: 'email',
        enabled: true,
        authorized: true,
        send: async ({ body, recipient, subject }) => {
          const to = String(recipient?.email || recipient?.address || '').trim();
          if (!isValidEmailAddress(to)) {
            return { success: false, status: 400, data: { error: 'A valid email recipient is required.' } };
          }
          const response = await emailFetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + resendApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [to],
              subject: String(subject || env.EMAIL_DEFAULT_SUBJECT || 'Message from Dream Education').trim().slice(0, 200),
              text: String(body || '')
            })
          });
          const data = await response.json().catch(() => ({}));
          return {
            success: response.ok && Boolean(data.id),
            status: response.status,
            data
          };
        }
      }]
    });
  }


  // PostWire publishes one message across connected social networks using one
  // server-side API key. Networks are discovered from the account unless an
  // explicit allow-list is configured, so disconnected networks are not guessed.
  const postWireKey = String(env.POSTWIRE_API_KEY || '').trim();
  const postWireBase = normalizeBaseUrl(env.POSTWIRE_BASE_URL, 'https://postwire.io');
  const postWirePlatforms = splitList(env.POSTWIRE_PLATFORMS)
    .map((platform) => platform.toLowerCase())
    .filter(Boolean);
  const postWireFetch = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetch;

  if (postWireKey) {
    connectors.push({
      id: 'postwire-universal-native',
      name: 'PostWire (connected social networks)',
      platform: 'postwire',
      channels: [{
        type: 'post',
        platform: 'postwire',
        enabled: true,
        authorized: true,
        broadcast: true,
        send: async ({ body, message_id, subject }) => {
          let platforms = postWirePlatforms;
          if (!platforms.length) {
            const connectionsResponse = await postWireFetch(postWireBase + '/api/connections', {
              method: 'GET',
              headers: { 'Authorization': 'Bearer ' + postWireKey }
            });
            const connectionsData = await connectionsResponse.json().catch(() => ({}));
            if (!connectionsResponse.ok) {
              return {
                success: false,
                status: connectionsResponse.status,
                data: {
                  error: connectionsData.error || 'Could not read connected PostWire networks.',
                  code: connectionsData.code || 'postwire_connections_failed'
                }
              };
            }
            const rows = Array.isArray(connectionsData.connections) ? connectionsData.connections : [];
            platforms = [...new Set(rows
              .filter((row) => row && row.connected !== false && row.status !== 'disconnected')
              .map((row) => String(row.platform || row.network || row.provider || '').trim().toLowerCase())
              .filter(Boolean))];
          }

          if (!platforms.length) {
            return {
              success: false,
              status: 400,
              data: {
                error: 'No connected PostWire networks were found. Connect networks in PostWire or set POSTWIRE_PLATFORMS.',
                code: 'postwire_no_connected_networks'
              }
            };
          }

          const response = await postWireFetch(postWireBase + '/api/post', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + postWireKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              platforms,
              text: String(body || ''),
              idempotency_key: String(message_id || ('dream-education-' + Date.now())),
              ...(String(subject || '').trim() ? { per_platform: Object.fromEntries(platforms.map((platform) => [platform, { title: String(subject).trim().slice(0, 200), text: String(body || '') }])) } : {})
            })
          });
          const data = await response.json().catch(() => ({}));
          const results = Array.isArray(data.results) ? data.results : [];
          const actuallyPosted = Number(data.posted) > 0 || results.some((result) => result && result.ok === true);
          const pendingApproval = response.status === 202 || data.status === 'pending_approval';
          return {
            success: response.ok && actuallyPosted,
            status: response.status,
            data: {
              ...data,
              pending_approval: pendingApproval,
              platforms_requested: platforms,
              platforms_posted: results.filter((result) => result && result.ok === true).map((result) => result.platform).filter(Boolean)
            }
          };
        }
      }]
    });
  }

  return connectors;
}

module.exports = { buildNativeMessengerConnectors, getDreamInboxMessages, INBOX_FILE, splitBlueskyText, isValidEmailAddress };
