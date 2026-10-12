(function () {
  "use strict";

  const AUTH_KEY = "dream_education_auth";
  const panel = document.getElementById("experience-panel");
  const panelBody = document.getElementById("panel-body");
  const panelTitle = document.getElementById("panel-title");
  const panelKicker = document.getElementById("panel-kicker");
  const panelDescription = document.getElementById("panel-description");
  if (!panel || !panelBody) return;

  let selectedUser = null;
  let currentAuth = null;
  let currentInfo = null;
  let requestSequence = 0;
  let pollTimer = null;

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function getAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); }
    catch (_) { return null; }
  }

  function accountInfo(auth) {
    const account = auth && auth.account ? auth.account : {};
    const profile = auth && (auth.profile || auth.learner) ? (auth.profile || auth.learner) : {};
    const role = String(auth && (auth.role || account.role) || "learner").toLowerCase();
    const id = account.learner_id || account.teacher_id || account.parent_id || account.school_id ||
      profile.learner_id || profile.teacher_id || profile.parent_id || profile.school_id || null;
    return { account, profile, role, id, name: profile.name || account.name || account.email || "Dream Education user" };
  }

  function authHeaders(json) {
    const token = currentAuth && currentAuth.session && currentAuth.session.access_token
      ? currentAuth.session.access_token : "";
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }

  async function api(url, options) {
    const response = await fetch(url, Object.assign({
      credentials: "same-origin",
      headers: authHeaders(Boolean(options && options.body))
    }, options || {}));
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.success === false) throw new Error(data.message || data.error || "Chat request failed.");
    return data;
  }

  function showPanel() {
    panelKicker.textContent = "DREAM EDUCATION · COMMUNICATION";
    panelTitle.textContent = "Chat";
    panelDescription.textContent = "Find any registered Dream Education user and start a conversation.";
    panelBody.innerHTML =
      '<section class="de-chat-workspace" id="de-chat-workspace">' +
        '<aside class="de-chat-sidebar">' +
          '<form id="de-chat-search-form" class="de-chat-search">' +
            '<label for="de-chat-search">Find people</label>' +
            '<div class="de-chat-search-row"><input id="de-chat-search" type="search" maxlength="160" autocomplete="off" placeholder="Name, username, or email"><button type="submit">Search</button></div>' +
          '</form>' +
          '<div class="de-chat-sidebar-heading"><strong>Conversations</strong><button type="button" id="de-chat-refresh">Refresh</button></div>' +
          '<div id="de-chat-people" class="de-chat-people" aria-live="polite"><p class="de-chat-muted">Loading conversations…</p></div>' +
          '<div class="de-chat-privacy">Search only returns registered accounts. Email addresses and phone numbers are not shown to other users.</div>' +
        '</aside>' +
        '<section class="de-chat-thread">' +
          '<header class="de-chat-thread-head"><div><span class="de-chat-status-dot"></span><strong id="de-chat-recipient">Choose someone to chat with</strong><small id="de-chat-recipient-role"></small></div><div class="de-chat-safety"><button type="button" id="de-chat-block" disabled>Block</button><button type="button" id="de-chat-report" disabled>Report</button></div></header>' +
          '<div id="de-chat-messages" class="de-chat-messages" aria-live="polite"><div class="de-chat-empty"><strong>Your conversations live here.</strong><span>Search for a registered person to send your first message.</span></div></div>' +
          '<form id="de-chat-send-form" class="de-chat-compose"><textarea id="de-chat-message" rows="2" maxlength="4000" placeholder="Write a message…" aria-label="Message" disabled></textarea><button id="de-chat-send" type="submit" disabled>Send <span aria-hidden="true">➤</span></button></form>' +
          '<p id="de-chat-status" class="de-chat-status" role="status" aria-live="polite"></p>' +
        '</section>' +
      '</section>';
    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden", "false");
  }

  function conversationId(user) {
    return [String(currentInfo.role) + ":" + String(currentInfo.id), String(user.role) + ":" + String(user.user_id)]
      .sort().join("__");
  }

  function isCurrentChat() {
    return Boolean(document.getElementById("de-chat-workspace")) &&
      document.body.classList.contains("panel-open");
  }

  function status(message, error) {
    const node = document.getElementById("de-chat-status");
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("is-error", Boolean(error));
  }

  function personButton(user, selected) {
    return '<button type="button" class="de-chat-person' + (selected ? ' is-selected' : '') +
      '" data-de-chat-person="' + escapeHTML(user.user_id) + '" data-de-chat-role="' + escapeHTML(user.role) + '">' +
      '<span class="de-chat-avatar" aria-hidden="true">' + escapeHTML((user.display_name || "?").trim().slice(0, 1).toUpperCase()) + '</span>' +
      '<span class="de-chat-person-copy"><strong>' + escapeHTML(user.display_name || "Dream Education user") + '</strong><small>' + escapeHTML(user.role) + '</small></span>' +
      '<span class="de-chat-person-arrow" aria-hidden="true">›</span></button>';
  }

  function renderPeople(users, heading) {
    const box = document.getElementById("de-chat-people");
    if (!box) return;
    const list = Array.isArray(users) ? users : [];
    window.__dreamChatLastUsers = list;
    if (!list.length) {
      box.innerHTML = '<p class="de-chat-muted">' + escapeHTML(heading || "No people found. Try a name or exact email address.") + '</p>';
      return;
    }
    box.innerHTML = list.map(function (user) {
      return personButton(user, selectedUser && selectedUser.user_id === user.user_id && selectedUser.role === user.role);
    }).join("");
  }

  async function loadRecent() {
    const data = await api("/api/chat/users");
    renderPeople(data.users || [], "No conversations yet. Search for any registered person above.");
  }

  async function searchPeople(query) {
    const term = String(query || "").trim();
    if (term.length < 2) {
      status("Enter at least two characters to search.");
      return;
    }
    status("Searching registered users…");
    const data = await api("/api/chat/users/search?q=" + encodeURIComponent(term));
    renderPeople(data.users || [], "No matching registered users. Check the spelling or email address.");
    status((data.users || []).length + " matching user(s). Select someone to open a chat.");
  }

  function renderMessages(messages) {
    const box = document.getElementById("de-chat-messages");
    if (!box) return;
    const list = Array.isArray(messages) ? messages : [];
    if (!list.length) {
      box.innerHTML = '<div class="de-chat-empty"><strong>Start the conversation.</strong><span>Your message will be sent securely over the HTTPS connection.</span></div>';
      return;
    }
    box.innerHTML = "";
    list.forEach(function (message) {
      const mine = message.sender_role === currentInfo.role && message.sender_id === currentInfo.id;
      const item = document.createElement("article");
      item.className = "de-chat-bubble" + (mine ? " is-mine" : "");
      const meta = document.createElement("div");
      meta.className = "de-chat-bubble-meta";
      const stamp = message.created_at ? new Date(message.created_at) : null;
      meta.textContent = (mine ? "You" : selectedUser.display_name) +
        (stamp && !Number.isNaN(stamp.getTime()) ? " · " + stamp.toLocaleString() : "");
      const body = document.createElement("p");
      body.textContent = message.content || "";
      item.appendChild(meta);
      item.appendChild(body);
      box.appendChild(item);
    });
    box.scrollTop = box.scrollHeight;
  }

  async function loadMessages() {
    if (!selectedUser || !isCurrentChat()) return;
    const seq = ++requestSequence;
    const query = new URLSearchParams({
      conversation_id: conversationId(selectedUser),
      recipient_id: selectedUser.user_id,
      recipient_role: selectedUser.role
    });
    const data = await api("/api/chat/messages?" + query.toString());
    if (seq !== requestSequence || !selectedUser) return;
    renderMessages(data.messages || []);
  }

  async function chooseUser(user) {
    selectedUser = user;
    const title = document.getElementById("de-chat-recipient");
    const role = document.getElementById("de-chat-recipient-role");
    const message = document.getElementById("de-chat-message");
    const send = document.getElementById("de-chat-send");
    const block = document.getElementById("de-chat-block");
    const report = document.getElementById("de-chat-report");
    if (title) title.textContent = user.display_name;
    if (role) role.textContent = user.role + " · registered Dream Education user";
    if (message) message.disabled = false;
    if (send) send.disabled = false;
    if (block) block.disabled = false;
    if (report) report.disabled = false;
    renderPeople(window.__dreamChatLastUsers || [user], "");
    status("Loading conversation…");
    try {
      await loadMessages();
      status("Messages refresh automatically while this conversation is open.");
    } catch (error) {
      status(error.message, true);
    }
    if (message) message.focus();
  }

  async function refreshPeople() {
    try {
      await loadRecent();
    } catch (error) {
      status(error.message, true);
    }
  }

  async function blockSelected() {
    if (!selectedUser) return;
    const user = selectedUser;
    if (!window.confirm("Block " + user.display_name + "? They will no longer be able to message you, and this conversation will be unavailable.")) return;
    try {
      await api("/api/chat/blocks", { method: "POST", body: JSON.stringify({ user_id: user.user_id, user_role: user.role, blocked: true }) });
      selectedUser = null;
      document.getElementById("de-chat-recipient").textContent = "User blocked";
      document.getElementById("de-chat-recipient-role").textContent = "";
      document.getElementById("de-chat-message").disabled = true;
      document.getElementById("de-chat-send").disabled = true;
      document.getElementById("de-chat-block").disabled = true;
      document.getElementById("de-chat-report").disabled = true;
      document.getElementById("de-chat-messages").innerHTML = '<div class="de-chat-empty"><strong>Conversation blocked.</strong><span>You can manage blocked users in Chat settings in a future update.</span></div>';
      status("This user is blocked.");
      await loadRecent();
    } catch (error) {
      status(error.message, true);
    }
  }

  async function reportSelected() {
    if (!selectedUser) return;
    const reason = window.prompt("Briefly describe the concern to report:", "Inappropriate or unwanted messages");
    if (reason === null) return;
    try {
      await api("/api/chat/reports", { method: "POST", body: JSON.stringify({ user_id: selectedUser.user_id, user_role: selectedUser.role, reason: reason.slice(0, 500) }) });
      status("Report submitted. Thank you for helping keep Chat safe.");
    } catch (error) {
      status(error.message, true);
    }
  }

  function wire() {
    const searchForm = document.getElementById("de-chat-search-form");
    const sendForm = document.getElementById("de-chat-send-form");
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      searchPeople(document.getElementById("de-chat-search").value).catch(function (error) { status(error.message, true); });
    });
    document.getElementById("de-chat-refresh").addEventListener("click", refreshPeople);
    document.getElementById("de-chat-people").addEventListener("click", function (event) {
      const button = event.target.closest("[data-de-chat-person]");
      if (!button) return;
      const user = { user_id: button.getAttribute("data-de-chat-person"), role: button.getAttribute("data-de-chat-role") };
      const cached = (window.__dreamChatLastUsers || []).find(function (candidate) {
        return candidate.user_id === user.user_id && candidate.role === user.role;
      });
      const selected = cached || { ...user, display_name: button.querySelector("strong")?.textContent || "Dream Education user" };
      chooseUser(selected);
    });
    sendForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!selectedUser) return;
      const input = document.getElementById("de-chat-message");
      const send = document.getElementById("de-chat-send");
      const content = input.value.trim();
      if (!content) return;
      if (content.length > 4000) { status("Messages can contain at most 4,000 characters.", true); return; }
      send.disabled = true;
      try {
        await api("/api/chat/messages", {
          method: "POST",
          body: JSON.stringify({
            conversation_id: conversationId(selectedUser),
            recipient_id: selectedUser.user_id,
            recipient_role: selectedUser.role,
            content
          })
        });
        input.value = "";
        await loadMessages();
        status("Message sent.");
      } catch (error) {
        status(error.message, true);
      } finally {
        send.disabled = false;
        input.focus();
      }
    });
    document.getElementById("de-chat-block").addEventListener("click", blockSelected);
    document.getElementById("de-chat-report").addEventListener("click", reportSelected);
  }

  async function open() {
    currentAuth = getAuth();
    currentInfo = accountInfo(currentAuth);
    if (!currentAuth || !currentAuth.session || !currentAuth.session.access_token || !currentInfo.id) {
      const signIn = document.querySelector('[data-action="open"][data-panel="signin"]');
      if (signIn) signIn.click();
      else window.alert("Please sign in to Dream Education before opening Chat.");
      return;
    }
    if (pollTimer) clearInterval(pollTimer);
    selectedUser = null;
    showPanel();
    wire();
    try {
      await api("/api/chat/users", { method: "POST", body: JSON.stringify({ display_name: currentInfo.name }) });
      await loadRecent();
    } catch (error) {
      status(error.message, true);
    }
    pollTimer = setInterval(function () {
      if (!isCurrentChat()) return;
      if (selectedUser) loadMessages().catch(function (error) { status(error.message, true); });
    }, 3500);
  }

  window.DreamEducationChat = { open };
  if (new URLSearchParams(window.location.search).get("open") === "chat") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { open().catch(function () {}); }, { once: true });
    } else {
      open().catch(function () {});
    }
  }
})();