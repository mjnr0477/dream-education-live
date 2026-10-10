'use strict';

const assert = require('assert');
const { buildNativeMessengerConnectors, isValidEmailAddress } = require('../product/native_messenger_connectors');

async function main() {
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

  let resendRequest = null;
  const mockedResend = buildNativeMessengerConnectors({
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'Dream Education <verified@example.com>'
  }, {
    emailRecipients: ['test-recipient@example.org'],
    fetchImpl: async (url, init) => {
      resendRequest = { url, init };
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'email_test_123' })
      };
    }
  });
  const resendSendResult = await mockedResend
    .find((connector) => connector.id === 'email-resend-native')
    .channels[0].send({
      body: 'Dream Education delivery smoke test',
      subject: 'Delivery test',
      recipient: { email: 'test-recipient@example.org' }
    });
  assert.strictEqual(resendSendResult.success, true, 'Resend success response must be treated as delivered');
  assert.strictEqual(resendRequest.url, 'https://api.resend.com/emails');
  assert.strictEqual(resendRequest.init.method, 'POST');
  assert.strictEqual(resendRequest.init.headers.Authorization, 'Bearer re_test_key');
  assert.deepStrictEqual(JSON.parse(resendRequest.init.body), {
    from: 'Dream Education <verified@example.com>',
    to: ['test-recipient@example.org'],
    subject: 'Delivery test',
    text: 'Dream Education delivery smoke test'
  });

  const mockedResendFailure = buildNativeMessengerConnectors({
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'Dream Education <verified@example.com>'
  }, {
    emailRecipients: ['test-recipient@example.org'],
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ name: 'validation_error', message: 'Sender domain is not verified' })
    })
  });
  const resendFailureResult = await mockedResendFailure
    .find((connector) => connector.id === 'email-resend-native')
    .channels[0].send({
      body: 'test',
      recipient: { email: 'test-recipient@example.org' }
    });
  assert.strictEqual(resendFailureResult.success, false, 'Resend API rejection must not be reported as delivered');
  assert.strictEqual(resendFailureResult.status, 403);
  assert.strictEqual(resendFailureResult.data.message, 'Sender domain is not verified');

  let gmailApiCalls = [];
  const gmailApiConfigured = buildNativeMessengerConnectors({
    GMAIL_USER: 'dream.education@gmail.com',
    GMAIL_OAUTH_CLIENT_ID: 'client-id.apps.googleusercontent.com',
    GMAIL_OAUTH_CLIENT_SECRET: 'client-secret',
    GMAIL_OAUTH_REFRESH_TOKEN: 'refresh-token',
    GMAIL_OAUTH_ACCESS_TOKEN: 'expired-access-token',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'Dream Education <unverified@gmail.com>'
  }, {
    emailRecipients: ['test-recipient@example.org'],
    fetchImpl: async (url, init) => {
      gmailApiCalls.push({ url, init });
      if (url === 'https://oauth2.googleapis.com/token') {
        return { ok: true, status: 200, json: async () => ({ access_token: 'fresh-access-token' }) };
      }
      return { ok: true, status: 200, json: async () => ({ id: 'gmail_message_123', threadId: 'gmail_thread_123' }) };
    }
  });
  const gmailApi = gmailApiConfigured.find((connector) => connector.id === 'email-gmail-api-native');
  assert.ok(gmailApi, 'Gmail OAuth API must be selected when OAuth credentials are configured');
  assert.strictEqual(gmailApiConfigured.filter((connector) => connector.platform === 'email').length, 1,
    'Gmail OAuth API must take precedence over unverified Resend and Gmail SMTP');
  const gmailApiResult = await gmailApi.channels[0].send({
    body: 'Dream Education Gmail API test',
    subject: 'Gmail API test',
    recipient: { email: 'test-recipient@example.org' }
  });
  assert.strictEqual(gmailApiResult.success, true, 'Gmail API acceptance must be reported as successful');
  assert.strictEqual(gmailApiResult.data.provider, 'gmail-api');
  assert.strictEqual(gmailApiCalls[0].url, 'https://oauth2.googleapis.com/token');
  assert.strictEqual(gmailApiCalls[0].init.method, 'POST');
  assert.match(gmailApiCalls[0].init.body, /grant_type=refresh_token/);
  assert.strictEqual(gmailApiCalls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.strictEqual(gmailApiCalls[1].init.headers.Authorization, 'Bearer fresh-access-token');
  const gmailApiPayload = JSON.parse(gmailApiCalls[1].init.body);
  assert.ok(gmailApiPayload.raw, 'Gmail API request must include a Base64URL MIME message');
  assert.match(gmailApiPayload.raw, /^[A-Za-z0-9_-]+$/);
  assert.strictEqual(gmailApiResult.data.id, 'gmail_message_123');

  const gmailOAuthInvalid = buildNativeMessengerConnectors({
    GMAIL_USER: 'dream.education@gmail.com',
    GMAIL_OAUTH_CLIENT_ID: 'client-id',
    GMAIL_OAUTH_CLIENT_SECRET: 'client-secret',
    GMAIL_OAUTH_REFRESH_TOKEN: 'bad-refresh-token'
  }, {
    emailRecipients: ['test-recipient@example.org'],
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' })
    })
  });
  const invalidOAuthResult = await gmailOAuthInvalid
    .find((connector) => connector.id === 'email-gmail-api-native')
    .channels[0].send({ body: 'test', recipient: { email: 'test-recipient@example.org' } });
  assert.strictEqual(invalidOAuthResult.success, false, 'Invalid OAuth refresh token must not report delivery');
  assert.strictEqual(invalidOAuthResult.status, 400);
  assert.match(invalidOAuthResult.data.error, /expired or revoked/i);

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
  assert.ok(server.includes('const gmailOAuthConfigured ='),
    'Ad-hoc owner email broadcasts must recognize Gmail OAuth credentials');
  assert.ok(server.includes('GMAIL_OAUTH_REFRESH_TOKEN'),
    'Ad-hoc owner email broadcasts must allow Gmail API configuration without SMTP');
  assert.ok(server.includes('!resendConfigured && !gmailConfigured'),
    'Email broadcast gate must allow either configured Gmail or configured Resend');

  console.log('Universal Connector email provider selection smoke test: PASS');
}

main().catch((error) => {
  console.error('Universal Connector email provider selection smoke test: FAIL');
  console.error(error);
  process.exit(1);
});
