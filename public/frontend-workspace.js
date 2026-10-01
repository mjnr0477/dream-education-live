(function () {
  "use strict";

  const AUTH_KEY = "dream_education_auth";
  const panel = document.getElementById("experience-panel");
  const panelKicker = document.getElementById("panel-kicker");
  const panelTitle = document.getElementById("panel-title");
  const panelDescription = document.getElementById("panel-description");
  const panelBody = document.getElementById("panel-body");

  if (!panel || !panelBody) return;

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function openPanel(kicker, title, description, body) {
    panelKicker.textContent = kicker;
    panelTitle.textContent = title;
    panelDescription.textContent = description;
    panelBody.innerHTML = body;
    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden", "false");
  }

  function closePanel() {
    document.body.classList.remove("panel-open");
    panel.setAttribute("aria-hidden", "true");
  }

  function accountInfo(auth) {
    const account = auth && auth.account ? auth.account : {};
    const profile = auth && (auth.profile || auth.learner) ? (auth.profile || auth.learner) : {};
    const role = String(auth && (auth.role || account.role) || "learner").toLowerCase();
    const id =
      account.learner_id ||
      account.teacher_id ||
      account.parent_id ||
      account.school_id ||
      profile.learner_id ||
      profile.teacher_id ||
      profile.parent_id ||
      profile.school_id ||
      null;
    return {
      account,
      profile,
      role,
      id,
      name: profile.name || account.email || "Dream Education user"
    };
  }

  function headers(auth) {
    const token = auth && auth.session && auth.session.access_token
      ? auth.session.access_token
      : "";
    const result = { Accept: "application/json" };
    if (token) result.Authorization = "Bearer " + token;
    return result;
  }

  async function getJSON(url, auth) {
    const response = await fetch(url, {
      method: "GET",
      headers: headers(auth),
      credentials: "same-origin"
    });
    const data = await response.json().catch(function () {
      return { success: false, error: "Invalid server response." };
    });
    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Request failed.");
    }
    return data;
  }

  function metric(label, value, detail) {
    return (
      '<article class="de-metric">' +
        '<span>' + escapeHTML(label) + '</span>' +
        '<strong>' + escapeHTML(value) + '</strong>' +
        '<small>' + escapeHTML(detail || "") + '</small>' +
      '</article>'
    );
  }

  function action(label, actionName, primary) {
    return (
      '<button type="button" class="de-action' + (primary ? " primary" : "") +
      '" data-de-action="' + escapeHTML(actionName) + '">' +
      escapeHTML(label) +
      '</button>'
    );
  }

  function renderShell(info, body) {
    const roleLabel = info.role.charAt(0).toUpperCase() + info.role.slice(1);
    openPanel(
      "DREAM EDUCATION WORKSPACE",
      info.name,
      roleLabel + " workspace — your connected learning environment.",
      '<div class="de-workspace">' +
        '<div class="de-workspace-head">' +
          '<div>' +
            '<span class="de-eyebrow">' + escapeHTML(roleLabel) + ' ACCOUNT</span>' +
            '<h3>Everything in one place.</h3>' +
            '<p>Learning, intelligence, progress and connections stay connected.</p>' +
          '</div>' +
          '<span class="de-live"><i></i> LIVE</span>' +
        '</div>' +
        body +
      '</div>'
    );
  }

  function renderError(message) {
    panelBody.innerHTML =
      '<div class="de-error">' +
        '<strong>We could not load this workspace.</strong>' +
        '<p>' + escapeHTML(message || "Please try again.") + '</p>' +
        '<div class="de-actions">' +
          action("Try again", "workspace") +
          action("Close", "close") +
        '</div>' +
      '</div>';
  }

  async function loadLearnerWorkspace(info) {
    renderShell(info,
      '<div class="de-loading"><span></span><p>Building your learning picture...</p></div>'
    );

    try {
      const intelligence = await getJSON(
        "/api/intelligence/" + encodeURIComponent(info.id),
        getAuth()
      );

      const profile = intelligence.learning_profile || {};
      const decision = intelligence.decision || {};
      const recommendation = intelligence.recommendation || {};
      const subjects = intelligence.subject_performance || {};
      const recent = Array.isArray(intelligence.recent_learning)
        ? intelligence.recent_learning
        : [];

      const subjectRows = Object.keys(subjects).slice(0, 8).map(function (key) {
        const item = subjects[key] || {};
        const score = Number(item.average_score);
        return (
          '<div class="de-row">' +
            '<span>' + escapeHTML(key) + '</span>' +
            '<b>' + (Number.isFinite(score) ? score : "—") + '</b>' +
          '</div>'
        );
      }).join("");

      const recentRows = recent.length
        ? recent.map(function (item) {
            return (
              '<div class="de-list-item">' +
                '<strong>' + escapeHTML(item.topic || item.subject || "Learning activity") + '</strong>' +
                '<span>' + escapeHTML(item.subject || "") + '</span>' +
              '</div>'
            );
          }).join("")
        : '<p class="de-muted">No recent learning activity recorded yet.</p>';

      panelBody.innerHTML =
        '<div class="de-workspace">' +
          '<div class="de-metrics">' +
            metric("Average score", profile.average_score == null ? "—" : profile.average_score, "Current learning profile") +
            metric("Difficulty", profile.difficulty || "Adaptive", "Current challenge level") +
            metric("Strongest", profile.strongest_subject || "—", "Current evidence") +
            metric("Needs focus", profile.weakest_subject || "—", "Potential next focus") +
          '</div>' +
          '<section class="de-section de-highlight">' +
            '<span class="de-eyebrow">NEXT BEST ACTION</span>' +
            '<h3>' + escapeHTML(recommendation.action || decision.action || "Continue learning") + '</h3>' +
            '<p>' + escapeHTML(recommendation.message || "Continue building understanding.") + '</p>' +
            '<div class="de-actions">' +
              action("Start adaptive learning", "adaptive", true) +
              action("Ask Dream AI", "ask") +
              action("Refresh intelligence", "workspace") +
            '</div>' +
          '</section>' +
          '<div class="de-columns">' +
            '<section class="de-section"><div class="de-section-title"><h3>Subject picture</h3><span>Evidence</span></div>' +
              (subjectRows || '<p class="de-muted">Subject evidence will appear as you learn.</p>') +
            '</section>' +
            '<section class="de-section"><div class="de-section-title"><h3>Recent learning</h3><span>Latest</span></div>' +
              '<div class="de-list">' + recentRows + '</div>' +
            '</section>' +
          '</div>' +
          '<div class="de-actions de-bottom-actions">' +
            action("Learning progress", "progress") +
            action("Learning sessions", "sessions") +
            action("Connections", "connections") +
            action("Account", "account") +
          '</div>' +
        '</div>';
    } catch (error) {
      renderError(error.message);
    }
  }

  async function loadRoleWorkspace(info) {
    renderShell(info,
      '<div class="de-loading"><span></span><p>Loading role intelligence...</p></div>'
    );

    try {
      const data = await getJSON(
        "/api/v1/role/" + encodeURIComponent(info.role) + "/intelligence",
        getAuth()
      );
      const intelligence = data.intelligence || {};
      const entries = Object.entries(intelligence)
        .filter(function (entry) {
          return ["string", "number", "boolean"].includes(typeof entry[1]);
        })
        .slice(0, 12);

      const cards = entries.length
        ? entries.map(function (entry) {
            return metric(
              entry[0].replace(/_/g, " "),
              entry[1],
              "Current evidence"
            );
          }).join("")
        : metric("Connected learners", data.connected_learners || 0, "Active learning relationships");

      panelBody.innerHTML =
        '<div class="de-workspace">' +
          '<div class="de-metrics">' + cards + '</div>' +
          '<section class="de-section de-highlight">' +
            '<span class="de-eyebrow">ROLE INTELLIGENCE</span>' +
            '<h3>Evidence connected to your role.</h3>' +
            '<p>Dream Education is using the existing learning relationships and assessment evidence available to this account.</p>' +
            '<div class="de-actions">' +
              action("Refresh intelligence", "workspace", true) +
              action("Connections", "connections") +
              action("Account", "account") +
            '</div>' +
          '</section>' +
          '<div class="de-actions de-bottom-actions">' +
            (info.role === "school" ? action("School dashboard", "school") : "") +
            action("Open Intelligence", "intelligence") +
            action("Close", "close") +
          '</div>' +
        '</div>';
    } catch (error) {
      renderError(error.message);
    }
  }

  async function openWorkspace() {
    const auth = getAuth();
    if (!auth || !auth.account) {
      const button = document.querySelector('[data-action="open"][data-panel="signin"]');
      if (button) button.click();
      return;
    }

    const info = accountInfo(auth);
    if (!info.id) {
      renderShell(info,
        '<div class="de-error"><strong>Your account is connected.</strong><p>The account profile does not currently expose a role profile ID, so the workspace cannot safely load private intelligence.</p>' +
        '<div class="de-actions">' + action("Account", "account") + action("Close", "close") + '</div></div>'
      );
      return;
    }

    if (info.role === "learner") {
      await loadLearnerWorkspace(info);
    } else {
      await loadRoleWorkspace(info);
    }
  }

  async function loadProgress() {
    const auth = getAuth();
    const info = accountInfo(auth);
    if (!info.id || info.role !== "learner") return openWorkspace();

    openPanel(
      "LEARNING PROGRESS",
      "Your progress",
      "A direct view of your recorded learning progress.",
      '<div class="de-loading"><span></span><p>Loading progress...</p></div>'
    );

    try {
      const data = await getJSON("/api/progress/" + encodeURIComponent(info.id), auth);
      const progress = data.progress || data;
      const keys = Object.keys(progress || {}).filter(function (key) {
        return ["string", "number", "boolean"].includes(typeof progress[key]);
      });
      const cards = keys.slice(0, 16).map(function (key) {
        return metric(key.replace(/_/g, " "), progress[key], "Recorded");
      }).join("");
      panelBody.innerHTML =
        '<div class="de-workspace"><div class="de-metrics">' +
        (cards || metric("Status", "No data yet", "Complete a learning activity to create evidence")) +
        '</div><div class="de-actions">' +
        action("Back to workspace", "workspace", true) +
        action("Start adaptive learning", "adaptive") +
        '</div></div>';
    } catch (error) {
      renderError(error.message);
    }
  }

  async function loadSessions() {
    const auth = getAuth();
    const info = accountInfo(auth);
    if (!info.id || info.role !== "learner") return openWorkspace();

    openPanel(
      "LEARNING SESSIONS",
      "Your sessions",
      "Learning sessions recorded by Dream Education.",
      '<div class="de-loading"><span></span><p>Loading sessions...</p></div>'
    );

    try {
      const data = await getJSON(
        "/api/v1/learner/" + encodeURIComponent(info.id) + "/learning-sessions",
        auth
      );
      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      const rows = sessions.slice(0, 30).map(function (session) {
        return (
          '<div class="de-list-item">' +
            '<strong>' + escapeHTML(session.topic || session.subject || "Learning session") + '</strong>' +
            '<span>' + escapeHTML(session.created_at || session.started_at || "") + '</span>' +
          '</div>'
        );
      }).join("");

      panelBody.innerHTML =
        '<div class="de-workspace"><section class="de-section"><div class="de-section-title"><h3>Recorded sessions</h3><span>' +
        sessions.length + '</span></div><div class="de-list">' +
        (rows || '<p class="de-muted">No learning sessions recorded yet.</p>') +
        '</div></section><div class="de-actions">' +
        action("Back to workspace", "workspace", true) +
        action("Start adaptive learning", "adaptive") +
        '</div></div>';
    } catch (error) {
      renderError(error.message);
    }
  }

  function openConnections() {
    const button = document.querySelector('[data-action="open"][data-panel="connect"]');
    if (button) button.click();
  }

  function openIntelligence() {
    const button = document.querySelector("[data-gli-open]");
    if (button) {
      button.click();
      return;
    }
    openWorkspace();
  }

  function openAdaptive() {
    const body = document.querySelector("#panel-body");
    if (!body) return;
    const button = body.querySelector('[data-panel-action="adaptive-learning"]');
    if (button) {
      button.click();
      return;
    }
    const learnerButton = document.querySelector('[data-action="open"][data-panel="learn"]');
    if (learnerButton) learnerButton.click();
  }

  function openAsk() {
    const body = document.querySelector("#panel-body");
    const button = body && body.querySelector('[data-panel-action="ask-dream"]');
    if (button) {
      button.click();
      return;
    }
    const learn = document.querySelector('[data-action="open"][data-panel="learn"]');
    if (learn) learn.click();
  }

  function openAccount() {
    const auth = getAuth();
    if (!auth) {
      const signIn = document.querySelector('[data-action="open"][data-panel="signin"]');
      if (signIn) signIn.click();
      return;
    }
    const info = accountInfo(auth);
    openPanel(
      "ACCOUNT",
      info.name,
      "Your authenticated Dream Education account.",
      '<div class="de-workspace">' +
        '<div class="de-metrics">' +
          metric("Role", info.role, "Account role") +
          metric("Account ID", info.id || "—", "Profile identifier") +
        '</div>' +
        '<section class="de-section"><h3>Privacy & security</h3><p>Private intelligence is requested with the current authenticated session. No secrets are placed in frontend source code.</p></section>' +
        '<div class="de-actions">' +
          action("Back to workspace", "workspace", true) +
          action("Sign out", "logout") +
        '</div>' +
      '</div>'
    );
  }

  function addWorkspaceButton() {
    const nav = document.querySelector(".nav-center");
    if (!nav || nav.querySelector("[data-de-workspace]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Workspace";
    button.setAttribute("data-de-workspace", "1");
    button.addEventListener("click", openWorkspace);
    nav.appendChild(button);
  }

  document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-de-action]");
    if (!target) return;

    const name = target.getAttribute("data-de-action");
    if (name === "workspace") return openWorkspace();
    if (name === "progress") return loadProgress();
    if (name === "sessions") return loadSessions();
    if (name === "connections") return openConnections();
    if (name === "intelligence") return openIntelligence();
    if (name === "adaptive") return openAdaptive();
    if (name === "ask") return openAsk();
    if (name === "account") return openAccount();
    if (name === "school") {
      const school = document.querySelector('[data-action="open"][data-panel="school"]');
      if (school) school.click();
      return;
    }
    if (name === "logout") {
      try { localStorage.removeItem(AUTH_KEY); } catch (_) {}
      closePanel();
      const signIn = document.querySelector(".nav-login");
      if (signIn) signIn.textContent = "Sign in";
      return;
    }
    if (name === "close") return closePanel();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.body.classList.contains("panel-open")) {
      closePanel();
    }
  });

  document.addEventListener("DOMContentLoaded", addWorkspaceButton);
  addWorkspaceButton();
})();
