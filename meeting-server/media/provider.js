"use strict";

/**
 * Meeting provider adapter for the current externally hosted room flow.
 *
 * Dream Education currently sends participants to a Jitsi room URL. Jitsi
 * manages its own room access and does not consume an application-generated
 * media token, so this adapter deliberately returns null rather than
 * inventing a token that would imply authentication it does not provide.
 *
 * If a self-hosted Jitsi deployment with JWT authentication is configured in
 * the future, implement token signing here using its configured secret and
 * issuer/audience settings.
 */
function getMediaProvider() {
  return "jitsi";
}

function createRoomToken() {
  return null;
}

module.exports = {
  getMediaProvider,
  createRoomToken
};
