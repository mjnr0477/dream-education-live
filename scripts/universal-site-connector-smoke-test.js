'use strict';

const assert = require('assert');
const { normalizeSiteUrl, isPrivateHostname, discoverSiteApis, buildSiteConnector } = require('../product/universal_site_connector');

(async () => {
  assert.strictEqual(normalizeSiteUrl('https://example.com/').origin, 'https://example.com');
  assert.strictEqual(isPrivateHostname('localhost'), true);
  assert.strictEqual(isPrivateHostname('127.0.0.1'), true);
  assert.strictEqual(isPrivateHostname('10.0.0.4'), true);
  assert.strictEqual(isPrivateHostname('172.16.0.2'), true);
  assert.strictEqual(isPrivateHostname('192.168.1.5'), true);
  const connector = await buildSiteConnector({
    endpoint: 'https://example.com/api/messages',
    token: 'test-token'
  });
  assert.strictEqual(connector.platform, 'website');
  assert.strictEqual(connector.channels[0].authorized, true);
  assert.strictEqual(connector.channels[0].type, 'website_contact');
  let rejected = false;
  try { await discoverSiteApis('http://127.0.0.1:3000'); } catch { rejected = true; }
  assert.strictEqual(rejected, true);
  console.log('Universal site connector smoke test passed.');
})();
