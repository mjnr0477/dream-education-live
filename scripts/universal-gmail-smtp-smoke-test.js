'use strict';

const assert = require('assert');
const { buildNativeMessengerConnectors, isValidEmailAddress } = require('../product/native_messenger_connectors');

function main() {
  assert.strictEqual(isValidEmailAddress('partnerships@reliafrica.org'), true,
    'Valid recipients containing the letter s must pass validation');
  assert.strictEqual(isValidEmailAddress('tanzania@reliafrica.org'), true,
    'Published organizational email addresses must pass syntax validation');
  assert.strictEqual(isValidEmailAddress('not-an-email'), false,
    'Malformed recipient values must be rejected');

  const recipients = ['buyer@example.org', 'school@example.org', 'buyer@example.org'];
  const bothConfigured = buildNativeMessengerConnectors({
    GMAIL_USER: 'dream.education@gmail.com',
    GMAIL_APP_PASSWORD: 'test-app-password',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'Dream Education <verified@example.com>'
  }, { emailRecipients: recipients });

  const bothEmailConnectors = bothConfigured.filter((connector) => connector.platform === 'email');
  assert.strictEqual(bothEmailConnectors.length, 1, 'Only one primary email connector should be selected');
  const resend = bothEmailConnectors[0];
  assert.strictEqual(resend.id, 'email-resend-native',
    'HTTPS-based Resend must take precedence over SMTP when both providers are configured');
  assert.strictEqual(resend.recipients.length, 2, 'Email recipients must be deduplicated');
  assert.strictEqual(resend.channels[0].authorized, true);
  assert.strictEqual(resend.recipients[0].email, 'buyer@example.org');
  assert.strictEqual(resend.recipients[1].email, 'school@example.org');

  const gmailOnly = buildNativeMessengerConnectors({
    GMAIL_USER: 'dream.education@gmail.com',
    GMAIL_APP_PASSWORD: 'test-app-password',
    RESEND_API_KEY: '',
    EMAIL_FROM: ''
  }, { emailRecipients: recipients });
  const gmail = gmailOnly.find((connector) => connector.id === 'email-gmail-smtp-native');
  assert.ok(gmail, 'Gmail SMTP remains available when no HTTPS email provider is configured');
  assert.strictEqual(gmail.recipients.length, 2, 'Gmail recipients must be deduplicated');

  const noPassword = buildNativeMessengerConnectors({
    GMAIL_USER: 'dream.education@gmail.com',
    RESEND_API_KEY: '',
    EMAIL_FROM: ''
  }, { emailRecipients: recipients });
  assert.ok(!noPassword.some((connector) => connector.id === 'email-gmail-smtp-native'),
    'Gmail must not be exposed as configured without an app password');

  const resendOnly = buildNativeMessengerConnectors({
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'Dream Education <verified@example.com>'
  }, { emailRecipients: recipients });
  assert.ok(resendOnly.some((connector) => connector.id === 'email-resend-native'),
    'Resend delivery must remain available when Gmail is not configured');

  const server = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
  assert.ok(server.includes('const gmailConfigured ='),
    'Ad-hoc owner email broadcasts must recognize Gmail SMTP credentials');
  assert.ok(server.includes('!resendConfigured && !gmailConfigured'),
    'Email broadcast gate must allow either configured Gmail or configured Resend');

  console.log('Universal Connector email provider selection smoke test: PASS');
}

try {
  main();
} catch (error) {
  console.error('Universal Connector email provider selection smoke test: FAIL');
  console.error(error);
  process.exit(1);
}
