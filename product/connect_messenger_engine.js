'use strict';

const crypto = require('crypto');

function normalizeText(value, max = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeChannel(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function makeMessageId() {
  return 'msg_' + crypto.randomBytes(10).toString('hex');
}

function inferRecipientIntent(input) {
  const text = normalizeText(input);
  const lower = text.toLowerCase();
  const groups = [];
  if (/\b(group|community|subreddit|forum)\b/.test(lower)) groups.push('group');
  if (/\b(organization|organisation|company|school|university|office|team)\b/.test(lower)) groups.push('organization');
  if (/\b(email|mail)\b/.test(lower) || /\S+@\S+\.\S+/.test(text)) groups.push('email');
  if (/\b(person|user|individual|account|profile)\b/.test(lower)) groups.push('person');
  return {
    raw: text,
    recipient_types: [...new Set(groups)],
    requires_resolution: true
  };
}

function normalizeRecipient(recipient = {}) {
  return {
    type: String(recipient.type || 'person').trim(),
    name: normalizeText(recipient.name, 300),
    organization: normalizeText(recipient.organization, 300),
    email: normalizeText(recipient.email, 320),
    handle: normalizeText(recipient.handle, 300),
    group: normalizeText(recipient.group, 300),
    platform: normalizeChannel(recipient.platform),
    channel: normalizeChannel(recipient.channel),
    address: normalizeText(recipient.address || recipient.chat_id || recipient.recipient_id, 1000)
  };
}

function scoreCandidate(recipient, candidate = {}) {
  const r = normalizeRecipient(recipient);
  let score = 0;
  const candidateText = normalizeText([
    candidate.name, candidate.display_name, candidate.organization, candidate.email,
    candidate.handle, candidate.group, candidate.platform
  ].filter(Boolean).join(' '), 2000).toLowerCase();
  for (const value of [r.name, r.organization, r.email, r.handle, r.group]) {
    const token = String(value || '').toLowerCase();
    if (!token) continue;
    if (String(candidate.name || candidate.display_name || '').toLowerCase() === token) score += 100;
    else if (candidateText.includes(token)) score += 30;
  }
  if (r.platform && normalizeChannel(candidate.platform) === r.platform) score += 20;
  return score;
}

function resolveRecipient(recipient, candidates = []) {
  const normalized = normalizeRecipient(recipient);
  const ranked = (Array.isArray(candidates) ? candidates : [])
    .map(candidate => ({ ...candidate, resolution_score: scoreCandidate(normalized, candidate) }))
    .filter(candidate => candidate.resolution_score > 0)
    .sort((a, b) => b.resolution_score - a.resolution_score);
  const top = ranked[0] || null;
  const second = ranked[1] || null;
  const confident = Boolean(top && top.resolution_score >= 80 && (!second || top.resolution_score > second.resolution_score));
  return {
    recipient: normalized,
    candidates: ranked.slice(0, 10),
    selected: confident ? top : null,
    confidence: top ? Math.min(1, top.resolution_score / 100) : 0,
    requires_confirmation: Boolean(top && !confident),
    resolved: confident
  };
}

function channelOrder(channels = []) {
  const priority = { email: 100, direct_message: 90, website_contact: 70, group: 60, webhook: 50 };
  return [...(Array.isArray(channels) ? channels : [])]
    .filter(channel => channel && channel.enabled !== false && channel.authorized !== false)
    .sort((a, b) => (priority[normalizeChannel(b.type)] || 0) - (priority[normalizeChannel(a.type)] || 0));
}

async function resolveDelivery(recipient, connectors = []) {
  const normalizedInput = normalizeRecipient(recipient || {});
  const hasExplicitDestination = Boolean(
    normalizedInput.name ||
    normalizedInput.organization ||
    normalizedInput.email ||
    normalizedInput.handle ||
    normalizedInput.group ||
    normalizedInput.platform ||
    normalizedInput.channel ||
    normalizedInput.address ||
    String(recipient?.description || '').trim()
  );

  let resolved = resolveRecipient(
    normalizedInput,
    connectors.flatMap(c => Array.isArray(c.recipients) ? c.recipients : [])
  );

  // Only use Dream Education's own inbox as the automatic fallback when the
  // caller did not specify any destination. Never silently redirect an
  // explicitly requested external recipient to the inbox.
  if (!resolved.selected && !hasExplicitDestination) {
    for (const connector of Array.isArray(connectors) ? connectors : []) {
      const defaultRecipient = connector?.default_recipient;
      const defaultChannel = (Array.isArray(connector?.channels) ? connector.channels : [])
        .find(channel =>
          channel &&
          channel.default_delivery === true &&
          channel.enabled !== false &&
          channel.authorized !== false
        );

      if (defaultRecipient && defaultChannel) {
        resolved = {
          recipient: normalizedInput,
          candidates: [normalizeRecipient(defaultRecipient)],
          selected: normalizeRecipient(defaultRecipient),
          confidence: 1,
          requires_confirmation: false,
          resolved: true,
          default_destination: true
        };
        break;
      }
    }
  }

  const channels = [];
  for (const connector of Array.isArray(connectors) ? connectors : []) {
    for (const channel of Array.isArray(connector.channels) ? connector.channels : []) {
      if (channel.enabled !== false && channel.authorized !== false) {
        channels.push({
          ...channel,
          connector_id: connector.id,
          connector_name: connector.name,
          connector
        });
      }
    }
  }

  const automaticFanout = !hasExplicitDestination && Boolean(resolved.default_destination);

  const eligible = channelOrder(channels).filter(channel => {
    if (!resolved.selected || automaticFanout) return false;
    const platform = normalizeChannel(channel.platform);
    return !platform ||
      !resolved.selected.platform ||
      platform === normalizeChannel(resolved.selected.platform);
  });

  return {
    ...resolved,
    channels: eligible,
    delivery_ready: Boolean(resolved.selected && eligible.length),
    automatic_fanout: automaticFanout
  };
}

async function deliverMessage(message, connectors = []) {
  const body = normalizeText(message?.body);
  const messageId = message?.message_id || makeMessageId();
  if (!body) return { success: false, error: 'Message body is required.', message_id: messageId };

  const delivery = await resolveDelivery(message.recipient, connectors);

  // A blank destination means "send everywhere that is actually configured
  // and authorized". This is the one-box/one-send fan-out path.
  if (delivery.automatic_fanout) {
    return broadcastMessage({ ...message, message_id: messageId, body }, connectors);
  }

  if (!delivery.delivery_ready) {
    return {
      success: false,
      status: delivery.requires_confirmation ? 'recipient_confirmation_required' : 'no_authorized_channel',
      message_id: messageId,
      delivery
    };
  }

  const attempts = [];
  for (const channel of delivery.channels) {
    if (typeof channel.send !== 'function') continue;
    try {
      const result = await channel.send({
        message_id: messageId,
        body,
        recipient: delivery.selected,
        channel,
        subject: normalizeText(message?.subject, 200)
      });
      const success = result?.success === true;
      attempts.push({ channel: channel.type, connector_id: channel.connector_id, success, result });
    } catch (error) {
      attempts.push({ channel: channel.type, connector_id: channel.connector_id, success: false, error: error.message });
    }
  }

  const delivered = attempts.filter(attempt => attempt.success).length;
  return {
    success: delivered > 0,
    status: delivered > 0
      ? delivered === attempts.length ? 'delivered' : 'partially_delivered'
      : 'delivery_failed',
    message_id: messageId,
    recipient: delivery.selected,
    channel: attempts.length === 1
      ? delivery.channels.find(channel => channel.connector_id === attempts[0].connector_id) || null
      : null,
    attempts
  };
}


function normalizeBroadcastTargets(connector, channel) {
  const candidates = [
    ...(Array.isArray(channel?.recipients) ? channel.recipients : []),
    ...(Array.isArray(connector?.recipients) ? connector.recipients : [])
  ];

  const seen = new Set();
  return candidates.filter((recipient) => {
    if (!recipient || typeof recipient !== "object") return false;
    const key = JSON.stringify({
      id: recipient.id || recipient.recipient_id || "",
      address: recipient.address || recipient.email || recipient.handle || recipient.chat_id || "",
      platform: recipient.platform || channel?.platform || connector?.platform || ""
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function broadcastMessage(message, connectors = []) {
  const body = normalizeText(message?.body, 10000);
  const messageId = message?.message_id || makeMessageId();
  const subject = normalizeText(message?.subject, 200);

  if (!body) {
    return {
      success: false,
      status: 'message_required',
      message_id: messageId,
      attempted: 0,
      delivered: 0,
      failed: 0,
      receipts: []
    };
  }

  const targets = [];
  for (const connector of Array.isArray(connectors) ? connectors : []) {
    for (const channel of Array.isArray(connector?.channels) ? connector.channels : []) {
      if (!channel || channel.enabled === false || channel.authorized === false) continue;
      if (typeof channel.send !== 'function') continue;

      const configuredRecipients = normalizeBroadcastTargets(connector, channel);
      if (configuredRecipients.length) {
        for (const recipient of configuredRecipients) {
          targets.push({
            connector,
            channel,
            recipient: normalizeRecipient({
              ...recipient,
              platform: recipient.platform || channel.platform || connector.platform,
              channel: recipient.channel || channel.type
            })
          });
        }
      } else if (channel.broadcast === true) {
        targets.push({
          connector,
          channel,
          recipient: null
        });
      }
    }
  }

  const dedupedTargets = [];
  const seen = new Set();
  for (const target of targets) {
    const key = [
      target.connector.id || target.connector.name || 'connector',
      target.channel.type || 'channel',
      target.recipient
        ? JSON.stringify(target.recipient)
        : 'connector-broadcast'
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedTargets.push(target);
  }

  if (!dedupedTargets.length) {
    return {
      success: false,
      status: 'no_authorized_broadcast_target',
      message_id: messageId,
      attempted: 0,
      delivered: 0,
      failed: 0,
      receipts: []
    };
  }

  const receipts = await Promise.all(dedupedTargets.map(async (target) => {
    try {
      const result = await target.channel.send({
        message_id: messageId,
        body,
        recipient: target.recipient,
        channel: target.channel,
        broadcast: true,
        subject
      });

      const delivered = result?.success === true;
      return {
        connector_id: target.connector.id || null,
        connector_name: target.connector.name || target.connector.id || 'Connector',
        platform: target.channel.platform || target.connector.platform || null,
        channel: target.channel.type || null,
        recipient: target.recipient,
        success: delivered,
        status: delivered ? 'delivered' : 'failed',
        result: result || null
      };
    } catch (error) {
      return {
        connector_id: target.connector.id || null,
        connector_name: target.connector.name || target.connector.id || 'Connector',
        platform: target.channel.platform || target.connector.platform || null,
        channel: target.channel.type || null,
        recipient: target.recipient,
        success: false,
        status: 'failed',
        error: error.message || 'Connector delivery failed.'
      };
    }
  }));

  const delivered = receipts.filter((receipt) => receipt.success).length;
  const failed = receipts.length - delivered;

  return {
    success: delivered > 0,
    status: delivered > 0 && failed === 0 ? 'delivered_everywhere_configured' : delivered > 0 ? 'partially_delivered' : 'delivery_failed',
    message_id: messageId,
    attempted: receipts.length,
    delivered,
    failed,
    receipts
  };
}

function createUniversalMessage(input = {}) {
  const body = normalizeText(input.body);
  if (!body) throw new Error('Message body is required.');
  return {
    message_id: input.message_id || makeMessageId(),
    body,
    subject: normalizeText(input.subject, 200),
    recipient: normalizeRecipient(input.recipient),
    intent: inferRecipientIntent(input.recipient?.description || input.recipient?.name),
    created_at: new Date().toISOString()
  };
}

module.exports = {
  normalizeText,
  inferRecipientIntent,
  normalizeRecipient,
  resolveRecipient,
  resolveDelivery,
  deliverMessage,
  broadcastMessage,
  createUniversalMessage
};
