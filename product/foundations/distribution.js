"use strict";

const CHANNELS = [
  "web",
  "mobile",
  "api",
  "school",
  "teacher",
  "family",
  "partner"
];

function createDistributionContext(input = {}) {
  return {
    channel: CHANNELS.includes(input.channel) ? input.channel : "web",
    country: input.country || null,
    language: input.language || null,
    version: input.version || null
  };
}

module.exports = { CHANNELS, createDistributionContext };
