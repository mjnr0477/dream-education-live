"use strict";

const lastCall = new Map();

async function waitFor(key, minimumMs = 250) {
  const now = Date.now();
  const previous = lastCall.get(key) || 0;
  const wait = Math.max(0, minimumMs - (now - previous));

  if (wait) {
    await new Promise(resolve => setTimeout(resolve, wait));
  }

  lastCall.set(key, Date.now());
}

module.exports = {waitFor};
