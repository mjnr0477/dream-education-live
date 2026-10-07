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
    const controller = new AbortController();
    const timeout = setTimeout(function () {
      controller.abort();
    }, 8000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: headers(auth),
        credentials: "same-origin",
        signal: controller.signal
      });
      const data = await response.json().catch(function () {
        return { success: false, error: "Invalid server response." };
      });
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Request failed.");
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
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

  function resourceTypeLabel(type) {
    return ({
      video: "Video",
      image: "Picture",
      audio: "Audio",
      book: "Book",
      document: "Document",
      article: "Article",
      research: "Research",
      experiment: "Experiment",
      interactive: "Interactive",
      web: "Web"
    })[type] || "Resource";
  }

  function renderResource(resource, index) {
    const type = resource.type || "web";
    const title = resource.title || "Learning resource";
    const description = resource.description || "Open this resource to continue learning.";
    const safeUrl = resource.url || resource.media_url || resource.embed_url || "";
    const mediaUrl = resource.media_url || "";
    const embedUrl = resource.embed_url || "";
    const provider = resource.provider || "Learning source";
    let media = "";

    if (type === "image" && mediaUrl) {
      media = '<a class="de-resource-image-link" href="' + escapeHTML(safeUrl) + '" target="_blank" rel="noopener noreferrer">' +
        '<img class="de-resource-image" src="' + escapeHTML(mediaUrl) + '" alt="' + escapeHTML(title) + '" loading="lazy">' +
      '</a>';
    } else if (type === "video" && embedUrl) {
      media = '<div class="de-resource-video"><iframe src="' + escapeHTML(embedUrl) +
        '" title="' + escapeHTML(title) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    } else if (type === "video" && mediaUrl) {
      media = '<video class="de-resource-video-player" controls preload="metadata" poster="' + escapeHTML(resource.thumbnail || "") + '" src="' + escapeHTML(mediaUrl) + '"></video>';
    } else if (type === "audio" && mediaUrl) {
      media = '<div class="de-resource-audio"><div class="de-resource-audio-title">Listen here</div><audio controls preload="metadata" src="' + escapeHTML(mediaUrl) + '"></audio></div>';
    } else if (resource.thumbnail) {
      media = '<a class="de-resource-image-link" href="' + escapeHTML(safeUrl) + '" target="_blank" rel="noopener noreferrer">' +
        '<img class="de-resource-image de-resource-thumb" src="' + escapeHTML(resource.thumbnail) + '" alt="" loading="lazy">' +
      '</a>';
    }

    const attribution = [resource.creator, resource.license].filter(Boolean).join(" · ");
    return '<article class="de-resource-card" data-resource-index="' + index + '">' +
      media +
      '<div class="de-resource-card-body">' +
        '<div class="de-resource-meta"><span>' + escapeHTML(resourceTypeLabel(type)) + '</span><span>' + escapeHTML(provider) + '</span></div>' +
        '<h4>' + escapeHTML(title) + '</h4>' +
        '<p>' + escapeHTML(description.slice(0, 420)) + '</p>' +
        (attribution ? '<small class="de-muted">' + escapeHTML(attribution) + '</small>' : '') +
        (safeUrl ? '<a class="de-resource-open" href="' + escapeHTML(safeUrl) + '" target="_blank" rel="noopener noreferrer">Open original resource ↗</a>' : '') +
        '<div class="de-resource-actions">' +
          '<button type="button" class="de-action" data-resource-complete="' + index + '">I finished this</button>' +
          '<button type="button" class="de-action" data-resource-check="' + index + '">Check my understanding</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderResourceResults(data) {
    const resources = Array.isArray(data.resources) ? data.resources : [];
    window.__dreamResourceResults = resources;
    const intent = data.intent || {};
    if (!resources.length) {
      return '<div class="de-resource-empty"><strong>No resource was found yet.</strong><p>Try a broader topic or another learning format.</p></div>';
    }

    return '<div class="de-resource-summary"><strong>' + escapeHTML(resources.length) +
      ' learning options found</strong><span>' + escapeHTML(intent.reason || "Dream searched available learning sources.") + '</span></div>' +
      '<div class="de-resource-grid">' +
      resources.map(renderResource).join("") +
      '</div>';
  }

  async function recordResourceProgress(resource, completed) {
    const auth = getAuth();
    const info = accountInfo(auth);
    if (!auth || !info.id || !resource) return;
    try {
      const response = await fetch("/api/v1/learning/resources/progress", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headers(auth)),
        credentials: "same-origin",
        body: JSON.stringify({
          learner_id: info.id,
          completed: completed === true,
          resource: resource
        })
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.success === false) throw new Error(data.error || "Could not record learning progress.");
      return data;
    } catch (error) {
      throw error;
    }
  }

  function openUnderstandingCheck(resource) {
    const auth = getAuth();
    const info = accountInfo(auth);
    const topic = resource && (resource.title || resource.description) || "this learning resource";
    openPanel(
      "UNDERSTANDING CHECK",
      "Show what you learned",
      "Explain the idea in your own words. Dream will use your response as new learning evidence.",
      '<div class="de-workspace">' +
        '<section class="de-section de-highlight">' +
          '<h3>' + escapeHTML(topic) + '</h3>' +
          '<textarea id="de-resource-answer" rows="7" maxlength="4000" placeholder="What did you learn? Explain it in your own words."></textarea>' +
          '<div class="de-actions">' +
            '<button type="button" class="de-action primary" id="de-submit-resource-check">Submit understanding</button>' +
            '<button type="button" class="de-action" data-de-action="resources">Back to resources</button>' +
          '</div>' +
          '<div id="de-resource-check-result" aria-live="polite"></div>' +
        '</section>' +
      '</div>'
    );
    const submit = document.getElementById("de-submit-resource-check");
    if (!submit) return;
    submit.addEventListener("click", async function () {
      const answer = document.getElementById("de-resource-answer").value.trim();
      const result = document.getElementById("de-resource-check-result");
      if (!answer) {
        result.innerHTML = '<p class="de-error">Please explain what you learned first.</p>';
        return;
      }
      submit.disabled = true;
      result.innerHTML = '<div class="de-loading"><span></span><p>Checking your understanding...</p></div>';
      try {
        await recordResourceProgress(resource, true);
        const response = await fetch("/api/learn", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, headers(auth)),
          credentials: "same-origin",
          body: JSON.stringify({
            learner_id: info.id,
            question: "Check my understanding of " + (resource.title || "this learning resource"),
            subject: resource.subject || "General",
            topic: resource.topic || resource.title || "Learning resource",
            learner_answer: answer
          })
        });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok || data.success === false) throw new Error(data.message || data.error || "Understanding check failed.");
        result.innerHTML = '<div class="de-success"><strong>Understanding recorded.</strong><p>' +
          escapeHTML(data.message || data.feedback || "Dream has recorded your learning evidence.") + '</p></div>';
      } catch (error) {
        result.innerHTML = '<div class="de-error"><strong>Could not complete the check.</strong><p>' + escapeHTML(error.message) + '</p></div>';
      } finally {
        submit.disabled = false;
      }
    });
  }

  function openLearningResources(initialQuery) {
    const auth = getAuth();
    const info = accountInfo(auth);
    if (!auth || !auth.account || !info.id) {
      const signIn = document.querySelector('[data-action="open"][data-panel="signin"]');
      if (signIn) signIn.click();
      return;
    }

    openPanel(
      "LEARNING RESOURCES",
      "Learn your way",
      "Find videos, pictures, audio, books, research and interactive experiences for any topic.",
      '<div class="de-resource-workspace">' +
        '<form class="de-resource-form" id="de-resource-form">' +
          '<label for="de-resource-query">What do you want to learn?</label>' +
          '<div class="de-resource-search-row">' +
            '<input id="de-resource-query" name="q" type="search" required maxlength="300" placeholder="e.g. photosynthesis, electricity, Python loops" value="' + escapeHTML(initialQuery || "") + '">' +
            '<select id="de-resource-type" name="type" aria-label="Learning format">' +
              '<option value="any">Anything that helps</option>' +
              '<option value="video">Video</option>' +
              '<option value="image">Pictures / diagrams</option>' +
              '<option value="audio">Audio</option>' +
              '<option value="experiment">Experiment / simulation</option>' +
              '<option value="research">Research / evidence</option>' +
              '<option value="book">Books / documents</option>' +
            '</select>' +
            '<button class="de-action primary" type="submit">Find resources</button>' +
          '</div>' +
        '</form>' +
        '<div id="de-resource-results" aria-live="polite">' +
          (initialQuery ? '<div class="de-loading"><span></span><p>Finding the best learning resources...</p></div>' : '<div class="de-resource-empty"><strong>Start with a topic.</strong><p>Dream will choose useful formats when you do not specify one.</p></div>') +
        '</div>' +
      '</div>'
    );

    const form = document.getElementById("de-resource-form");
    const results = document.getElementById("de-resource-results");
    if (!form || !results) return;

    async function search() {
      const query = form.elements.q.value.trim();
      if (!query) return;
      results.innerHTML = '<div class="de-loading"><span></span><p>Finding learning resources...</p></div>';
      try {
        const type = form.elements.type.value;
        const params = new URLSearchParams({
          q: query,
          type: type,
          learner_id: info.id,
          limit: "12"
        });
        const data = await getJSON("/api/v1/learning/resources?" + params.toString(), auth);
        results.innerHTML = renderResourceResults(data);
      } catch (error) {
        results.innerHTML = '<div class="de-error"><strong>Resource search failed.</strong><p>' +
          escapeHTML(error.message) + '</p></div>';
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      search();
    });
    if (initialQuery) search();
  }

  async function loadLearnerWorkspace(info) {
    renderShell(info,
      '<div class="de-loading"><span></span><p>Building your learning picture...</p></div>'
    );

    try {
      const auth = getAuth();
      const intelligence = await getJSON(
        "/api/intelligence/" + encodeURIComponent(info.id),
        auth
      );
      const nextQuestionData = await getJSON(
        "/api/next-question/" + encodeURIComponent(info.id),
        auth
      );

      const profile = intelligence.learning_profile || {};
      const decision = intelligence.decision || {};
      const recommendation = intelligence.recommendation || {};
      const nextQuestion = nextQuestionData.next_question || {};
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
              action("Learn with video, pictures or audio", "resources") +
              action("Ask Dream AI", "ask") +
              action("Refresh intelligence", "workspace") +
            '</div>' +
          '</section>' +
          '<section class="de-section">' +
            '<div class="de-section-title"><h3>Next learning question</h3><span>' + escapeHTML(nextQuestion.subject || "General") + '</span></div>' +
            '<p>' + escapeHTML(nextQuestion.question || "What would you like to learn today?") + '</p>' +
            '<small class="de-muted">' + escapeHTML(nextQuestionData.based_on ? "Generated from your recorded learning history." : "No previous learning history was available.") + '</small>' +
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
            action("Find learning resources", "resources") +
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

  function roleMetricValue(intelligence, role) {
    if (role === "teacher") {
      const signal = intelligence.class_signal || {};
      return [
        metric("Learners", signal.learners || 0, "Connected learners"),
        metric("Assessments", signal.assessments || 0, "Recorded assessments"),
        metric("Average", signal.average_score || 0, "Class evidence")
      ].join("");
    }

    if (role === "parent") {
      const signal = intelligence.family_signal || {};
      return [
        metric("Children", signal.children || 0, "Connected learners"),
        metric("Average", signal.average_score || 0, "Family evidence"),
        metric("Needs support", signal.children_needing_support || 0, "Current learning signal")
      ].join("");
    }

    const signal = intelligence.institution_signal || {};
    return [
      metric("Learners", signal.learners || 0, "Institutional learning"),
      metric("Teachers", signal.teachers || 0, "Connected educators"),
      metric("Average", signal.average_score || 0, "Assessment evidence"),
      metric("Needs support", signal.learners_needing_support || 0, "Current learning signal")
    ].join("");
  }

  function renderRolePriority(intelligence, role) {
    if (role === "teacher") {
      const rows = Array.isArray(intelligence.teaching_priorities)
        ? intelligence.teaching_priorities
        : [];

      return rows.length
        ? rows.map(function (item) {
            return '<div class="de-list-item">' +
              '<strong>' + escapeHTML(item.name || item.learner_id || "Learner") + '</strong>' +
              '<span>Average ' + escapeHTML(item.average_score) +
              (item.focus_topics && item.focus_topics.length
                ? " · Focus: " + escapeHTML(item.focus_topics.slice(0, 2).join(", "))
                : "") +
              '</span></div>';
          }).join("")
        : '<p class="de-muted">No teaching priority has been identified yet.</p>';
    }

    if (role === "parent") {
      const rows = Array.isArray(intelligence.children)
        ? intelligence.children
        : [];

      return rows.length
        ? rows.map(function (item) {
            return '<div class="de-list-item">' +
              '<strong>' + escapeHTML(item.name || item.learner_id || "Learner") + '</strong>' +
              '<span>Average ' + escapeHTML(item.average_score) +
              (item.focus_topics && item.focus_topics.length
                ? " · Focus: " + escapeHTML(item.focus_topics.slice(0, 2).join(", "))
                : "") +
              '</span></div>';
          }).join("")
        : '<p class="de-muted">No connected children have learning evidence yet.</p>';
    }

    const rows = Array.isArray(intelligence.priority_learners)
      ? intelligence.priority_learners
      : [];

    return rows.length
      ? rows.map(function (item) {
          return '<div class="de-list-item">' +
            '<strong>' + escapeHTML(item.name || item.learner_id || "Learner") + '</strong>' +
            '<span>Average ' + escapeHTML(item.average_score) +
            (item.focus_topics && item.focus_topics.length
              ? " · Focus: " + escapeHTML(item.focus_topics.slice(0, 2).join(", "))
              : "") +
            '</span></div>';
        }).join("")
      : '<p class="de-muted">No priority learner signal is available yet.</p>';
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
      const roleTitle = info.role === "teacher"
        ? "Teaching priorities"
        : info.role === "parent"
          ? "Family learning"
          : "Institution priorities";

      panelBody.innerHTML =
        '<div class="de-workspace">' +
          '<div class="de-metrics">' + roleMetricValue(intelligence, info.role) + '</div>' +
          '<section class="de-section de-highlight">' +
            '<span class="de-eyebrow">ROLE INTELLIGENCE</span>' +
            '<h3>' + escapeHTML(intelligence.headline || "Evidence connected to your role.") + '</h3>' +
            '<p>Use the learning evidence already connected to this account to decide what needs attention next.</p>' +
            '<div class="de-actions">' +
              action("Refresh intelligence", "workspace", true) +
              action("Open Chat", "chat") +
              action("Open Meetings", "meetings") +
              action("Connections", "connections") +
            '</div>' +
          '</section>' +
          '<section class="de-section">' +
            '<div class="de-section-title"><h3>' + escapeHTML(roleTitle) + '</h3><span>' + escapeHTML(data.connected_learners || 0) + ' learners</span></div>' +
            '<div class="de-list">' + renderRolePriority(intelligence, info.role) + '</div>' +
          '</section>' +
          '<div class="de-actions de-bottom-actions">' +
            (info.role === "school" ? action("School dashboard", "school") : "") +
            action("Connections", "connections") +
            action("Account", "account") +
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
    const completeButton = event.target.closest("[data-resource-complete]");
    if (completeButton) {
      const resource = (window.__dreamResourceResults || [])[Number(completeButton.getAttribute("data-resource-complete"))];
      if (!resource) return;
      completeButton.disabled = true;
      recordResourceProgress(resource, true)
        .then(function () {
          completeButton.textContent = "Completed ✓";
        })
        .catch(function (error) {
          completeButton.disabled = false;
          completeButton.textContent = "Try again";
          window.alert(error.message);
        });
      return;
    }
    const checkButton = event.target.closest("[data-resource-check]");
    if (checkButton) {
      const resource = (window.__dreamResourceResults || [])[Number(checkButton.getAttribute("data-resource-check"))];
      if (resource) openUnderstandingCheck(resource);
      return;
    }


    const target = event.target.closest("[data-de-action]");
    if (!target) return;
    if (!target) return;

    const name = target.getAttribute("data-de-action");
    if (name === "workspace") return openWorkspace();
    if (name === "resources") return openLearningResources();
    if (name === "progress") return loadProgress();
    if (name === "sessions") return loadSessions();
    if (name === "connections") return openConnections();
    if (name === "chat") {
      if (window.DreamEducationChat && typeof window.DreamEducationChat.open === "function") {
        window.DreamEducationChat.open();
      }
      return;
    }
    if (name === "meetings") {
      const button = document.querySelector('[data-panel-action="meetings"]');
      if (button) button.click();
      else openConnections();
      return;
    }
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
