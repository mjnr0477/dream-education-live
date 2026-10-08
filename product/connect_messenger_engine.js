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
    address: normalizeText(recipient.address, 1000)
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
    if (candidateText.includes(token) && String(candidate.name || candidate.display_name || '').toLowerCase() === token) score += 100;
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
  const resolved = resolveRecipient(recipient, connectors.flatMap(c => Array.isArray(c.recipients) ? c.recipients : []));
  const channels = [];
  for (const connector of Array.isArray(connectors) ? connectors : []) {
    for (const channel of Array.isArray(connector.channels) ? connector.channels : []) {
      if (channel.enabled !== false && channel.authorized !== false) {
        channels.push({ ...channel, connector_id: connector.id, connector_name: connector.name });
      }
    }
  }
  const eligible = channelOrder(channels).filter(channel => {
    if (!resolved.selected) return false;
    const platform = normalizeChannel(channel.platform);
    return !platform || !resolved.selected.platform || platform === normalizeChannel(resolved.selected.platform);
  });
  return {
    ...resolved,
    channels: eligible,
    delivery_ready: Boolean(resolved.selected && eligible.length)
  };
}

async function deliverMessage(message, connectors = []) {
  const body = normalizeText(message?.body);
  if (!body) return { success: false, error: 'Message body is required.' };
  const delivery = await resolveDelivery(message.recipient, connectors);
  if (!delivery.delivery_ready) {
    return {
      success: false,
      status: delivery.requires_confirmation ? 'recipient_confirmation_required' : 'no_authorized_channel',
      message_id: message.message_id || makeMessageId(),
      delivery
    };
  }

  const attempts = [];
  for (const channel of delivery.channels) {
    if (typeof channel.send !== 'function') continue;
    try {
      const result = await channel.send({
        message_id: message.message_id || makeMessageId(),
        body,
        recipient: delivery.selected,
        channel
      });
      attempts.push({ channel: channel.type, connector_id: channel.connector_id, success: result?.success !== false, result });
      if (result?.success !== false) {
        return {
          success: true,
          status: 'delivered',
          message_id: message.message_id || makeMessageId(),
          recipient: delivery.selected,
          channel,
          attempts
        };
      }
    } catch (error) {
      attempts.push({ channel: channel.type, connector_id: channel.connector_id, success: false, error: error.message });
    }
  }

  return {
    success: false,
    status: 'delivery_failed',
    message_id: message.message_id || makeMessageId(),
    recipient: delivery.selected,
    attempts
  };
}

function createUniversalMessage(input = {}) {
  const body = normalizeText(input.body);
  if (!body) throw new Error('Message body is required.');
  return {
    message_id: input.message_id || makeMessageId(),
    body,
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
  createUniversalMessage
};
