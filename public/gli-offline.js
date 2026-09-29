(function () {
  "use strict";

  const QUEUE_KEY = "dream_education_gli_offline_events";

  function readQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function writeQueue(events) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-1000)));
  }

  async function queueEvents(learnerId, events, clientVersion = "web") {
    const normalized = (Array.isArray(events) ? events : []).map(event => ({
      event_id: event.event_id || crypto.randomUUID(),
      learner_id: learnerId,
      type: event.type || "learning_event",
      payload: event.payload || {},
      occurred_at: event.occurred_at || new Date().toISOString(),
      client_version: clientVersion
    }));
    writeQueue(readQueue().concat(normalized));
    return normalized;
  }

  async function flush(learnerId) {
    const queue = readQueue().filter(event => event.learner_id === learnerId);
    if (!queue.length) return { sent: 0, remaining: readQueue().length };

    const response = await fetch("/api/v1/learner/" + encodeURIComponent(learnerId) + "/offline-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: queue.slice(0, 100) })
    });

    if (!response.ok) throw new Error("Offline synchronization failed.");
    const result = await response.json();
    const accepted = new Set(result.event_ids || []);
    writeQueue(readQueue().filter(event => !accepted.has(event.event_id)));
    return { sent: accepted.size, remaining: readQueue().length };
  }

  async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("/sw.js"); } catch (_) {}
    }
  }

  window.DreamGLIOffline = { queueEvents, flush, registerServiceWorker, readQueue };
  registerServiceWorker();
})();
