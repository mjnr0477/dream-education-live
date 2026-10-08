'use strict';

const PRIVATE_MARKERS = ['private', 'authorized', 'owner-authorized', 'owner authoritative'];

function textOf(item) {
  return String(item?.extract || item?.excerpt || item?.content || item?.snippet || '').replace(/\s+/g, ' ').trim();
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function validateSearchItem(item, mode = 'public') {
  const text = textOf(item);
  const source = String(item?.source || item?.provider || '').trim();
  const title = String(item?.title || '').trim();
  const valid = Boolean(title && source && text.length >= (mode === 'public' ? 30 : 1));
  const publicSafe = mode !== 'public' || (
    item?.private !== true &&
    item?.authorized !== true &&
    !PRIVATE_MARKERS.some(marker => JSON.stringify(item).toLowerCase().includes(marker))
  );
  const evidence = Array.isArray(item?.evidence) ? item.evidence : [];
  const media = Array.isArray(item?.media) ? item.media : [];
  const usableMedia = media.filter(asset => asset && isHttpUrl(asset.url));
  const usableEvidence = evidence.filter(asset => {
    if (!asset || typeof asset !== 'object') return false;
    return String(asset.content || asset.text || '').trim().length >= 20 || isHttpUrl(asset.url);
  });

  return {
    valid: valid && publicSafe,
    title,
    source,
    content_length: text.length,
    public_safe: publicSafe,
    evidence_count: usableEvidence.length,
    media_count: usableMedia.length,
    has_evidence: usableEvidence.length > 0 || text.length >= 30
  };
}

function filterSearchResults(results, mode = 'public') {
  const accepted = [];
  const rejected = [];
  for (const item of Array.isArray(results) ? results : []) {
    const check = validateSearchItem(item, mode);
    if (check.valid) accepted.push(item);
    else rejected.push({ item, reason: check });
  }
  return { accepted, rejected };
}

function buildSearchQuality(results, mode = 'public') {
  const { accepted, rejected } = filterSearchResults(results, mode);
  const corroborated = accepted.filter(item => /corroborated|consistent/i.test(String(item?.cross_source_status || ''))).length;
  const conflicts = accepted.filter(item => /conflict/i.test(String(item?.cross_source_status || ''))).length;
  const withMedia = accepted.filter(item => Array.isArray(item?.media) && item.media.some(asset => isHttpUrl(asset?.url))).length;
  return {
    mode,
    total: accepted.length + rejected.length,
    accepted: accepted.length,
    rejected: rejected.length,
    corroborated,
    conflicts,
    with_media: withMedia,
    evidence_ready: accepted.filter(item => validateSearchItem(item, mode).has_evidence).length
  };
}

module.exports = { validateSearchItem, filterSearchResults, buildSearchQuality, isHttpUrl };
