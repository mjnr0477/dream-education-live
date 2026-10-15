(function () {
  "use strict";
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const authKey = "dream_education_auth";
  let state = { info: null, intelligence: null, children: [], selected: "", tab: "overview", resources: [], lessons: [], connections: [], meetings: [], attendance: [], attendanceAvailable: false, attendanceChildren: [], notice: "" };
  const body = () => document.getElementById("panel-body");
  const getAuth = () => { try { return JSON.parse(localStorage.getItem(authKey) || "null"); } catch (_) { return null; } };
  const tokenHeaders = () => {
    const auth = getAuth(), token = auth && auth.session && auth.session.access_token;
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  };
  async function request(url, options) {
    const response = await fetch(url, Object.assign({ credentials: "same-origin", headers: Object.assign({ Accept: "application/json" }, tokenHeaders()) }, options || {}));
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.error || data.message || "The requested information could not be loaded.");
    return data;
  }
  function selectedChild() { return state.children.find(child => String(child.learner_id) === String(state.selected)) || state.children[0] || null; }
  function safeUrl(value) { try { const url = new URL(String(value || ""), window.location.origin); return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""; } catch (_) { return ""; } }
  function childOptions() {
    if (!state.children.length) return '<option value="">No connected children</option>';
    return state.children.map(child => '<option value="' + esc(child.learner_id) + '"' + (String(child.learner_id) === String(state.selected) ? " selected" : "") + '>' + esc(child.name || child.learner_id) + '</option>').join("");
  }
  function button(label, action, primary) { return '<button type="button" class="de-action' + (primary ? " primary" : "") + '" data-parent-action="' + esc(action) + '">' + esc(label) + '</button>'; }
  function metric(label, value, detail) { return '<article class="de-metric"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(detail || "") + '</small></article>'; }
  function empty(title, detail) { return '<div class="parent-empty"><strong>' + esc(title) + '</strong><p>' + esc(detail) + '</p></div>'; }
  function scoreLabel(child) { return child && child.assessments ? String(child.average_score) + "%" : "No score yet"; }
  function childCard(child) {
    const support = (child.focus_topics || []).slice(0, 2);
    const strengths = (child.strengths || []).slice(0, 2);
    return '<article class="parent-child-card"><div class="parent-child-card-head"><span class="parent-child-avatar" aria-hidden="true">' + esc(String(child.name || "L").trim().charAt(0).toUpperCase()) + '</span><div><h4>' + esc(child.name || "Learner") + '</h4><small>' + esc(child.level || "Learning profile") + (child.learner_id ? " · " + esc(child.learner_id) : "") + '</small></div><span class="parent-score">' + esc(scoreLabel(child)) + '</span></div>' +
      '<div class="parent-child-details"><div><small>Strengths in recorded evidence</small><p>' + esc(strengths.join(", ") || "More learning evidence needed") + '</p></div><div><small>Topics to practise</small><p>' + esc(support.join(", ") || "No current focus topics recorded") + '</p></div></div>' +
      '<div class="parent-card-actions">' + button("View progress", "progress:" + child.learner_id, true) + button("Home learning", "lessons:" + child.learner_id) + '</div></article>';
  }
  function overview() {
    const signal = state.intelligence.family_signal || {};
    const needing = state.children.filter(child => child.assessments && child.average_score < 70);
    return '<div class="parent-hero"><div><span class="parent-kicker">FAMILY LEARNING &amp; SUPPORT CENTRE</span><h3>Be part of your child’s learning journey.</h3><p>Understand what the recorded evidence shows, find reliable practice materials, and stay connected with the people teaching your child.</p></div><div class="parent-hero-mark" aria-hidden="true">✦</div></div>' +
      '<div class="de-metrics parent-metrics">' + metric("My children", signal.children || state.children.length, "Profiles connected to this account") + metric("Family average", state.children.some(c => c.assessments) ? (signal.average_score || 0) + "%" : "Not yet available", "From recorded assessments only") + metric("May need support", needing.length, "Below 70% in recorded assessments") + metric("Teacher lessons", state.lessons.length ? state.lessons.length : "Open to load", "Authorised assignments for selected child") + '</div>' +
      '<section class="de-section"><div class="de-section-title"><h3>My children</h3><span>' + state.children.length + ' profiles</span></div>' +
      (state.children.length ? '<div class="parent-children-grid">' + state.children.map(childCard).join("") + '</div>' : empty("No child profile is connected yet", "Use Connections to connect with your child’s learner account. Private lesson and progress details should only appear after the relationship is authorised.")) + '</section>' +
      '<div class="parent-two-column"><section class="de-section"><div class="de-section-title"><h3>What needs attention?</h3><span>Evidence-led</span></div>' +
      (needing.length ? '<div class="parent-priority-list">' + needing.map(c => '<div class="parent-priority-item"><strong>' + esc(c.name || c.learner_id) + '</strong><p>Recorded average: ' + esc(c.average_score) + '%. Start with ' + esc((c.focus_topics || [])[0] || "a short review of recent lessons") + ' and discuss progress with the teacher if the difficulty continues.</p>' + button("Find practice material", "practice:" + c.learner_id) + '</div>').join("") + '</div>' : empty("No current support alert from available scores", "This does not mean every topic is mastered. New assessment evidence helps Dream identify useful next steps.")) + '</section>' +
      '<section class="de-section"><div class="de-section-title"><h3>Ways to support at home</h3></div><ul class="parent-support-list"><li>Ask your child to explain an idea in their own words.</li><li>Use short, regular practice sessions rather than pressure or punishment.</li><li>Celebrate effort, questions, progress and persistence.</li><li>Discuss repeated difficulties with the connected teacher.</li></ul><div class="de-actions">' + button("Open AI Parent Guide", "guide", true) + button("Find learning sources", "sources") + '</div></section></div>';
  }
  function progress() {
    const child = selectedChild();
    if (!child) return empty("No child progress to show", "Connect a learner account to see authorised progress.");
    const scores = Array.isArray(child.recent_scores) ? child.recent_scores : [];
    const scoreBars = scores.length ? '<div class="parent-score-strip">' + scores.slice(0, 8).map((score, i) => '<div class="parent-score-point"><strong>' + esc(score) + '%</strong><span>Recent ' + (i + 1) + '</span><i style="height:' + Math.max(5, Math.min(100, Number(score) || 0)) + '%"></i></div>').join("") + '</div>' : empty("No assessment history recorded yet", "Scores and trends will appear after assessments are saved in Dream Education.");
    return '<div class="parent-child-selector"><label for="parent-child-select">Child profile</label><select id="parent-child-select">' + childOptions() + '</select></div><div class="de-metrics">' + metric("Recorded average", child.assessments ? child.average_score + "%" : "Not available", child.assessments + " recorded assessments") + metric("Learning evidence", child.evidence && child.evidence.count || 0, "Recorded observations") + metric("Adaptive decisions", child.adaptive_decisions && child.adaptive_decisions.count || 0, "Existing learning engine") + '</div><section class="de-section"><div class="de-section-title"><h3>Recent assessment evidence</h3><span>Most recent first</span></div>' + scoreBars + '</section><div class="parent-two-column"><section class="de-section"><h3>Topics to practise</h3>' + ((child.focus_topics || []).length ? '<ul class="parent-topic-list">' + child.focus_topics.map(t => '<li>' + esc(t) + ' ' + button("Find material", "practice-topic:" + child.learner_id + ":" + t) + '</li>').join("") + '</ul>' : empty("No focus topics recorded", "The system will show topics when assessment evidence identifies them.")) + '</section><section class="de-section"><h3>Strengths observed</h3>' + ((child.strengths || []).length ? '<ul class="parent-topic-list">' + child.strengths.map(t => '<li>' + esc(t) + '</li>').join("") + '</ul>' : empty("Strengths not yet recorded", "Keep encouraging learning while more evidence is collected.")) + '</section></div><p class="parent-disclaimer">These are learning signals, not a diagnosis or a complete measure of your child. They reflect only the records currently available to Dream Education.</p>';
  }
  function lessonCards(lessons) {
    if (!lessons.length) return empty("No assigned lessons are available here yet", "When a connected teacher assigns a lesson, its notes, objectives, assessment questions and submission status can appear here. If your child is connected only through a profile entry, complete the authorised connection first.");
    return '<div class="parent-lesson-list">' + lessons.map(lesson => {
      const objectives = lesson.lesson_plan && Array.isArray(lesson.lesson_plan.objectives) ? lesson.lesson_plan.objectives : [];
      const notes = lesson.notes || lesson.lesson_notes || (lesson.lesson_plan && (lesson.lesson_plan.notes || lesson.lesson_plan.teacher_notes)) || "";
      const questions = Array.isArray(lesson.assessment_questions) ? lesson.assessment_questions : [];
      const submission = lesson.submission || {};
      return '<article class="parent-lesson-card"><div class="de-section-title"><h4>' + esc(lesson.topic || "Assigned lesson") + '</h4><span>' + esc(submission.status || (submission.submitted_at ? "Submitted" : "Not submitted")) + '</span></div><p class="de-muted">' + esc(lesson.subject || "Subject") + ' · ' + esc(lesson.level || "Level") + (lesson.duration_minutes ? ' · ' + esc(lesson.duration_minutes) + ' min' : "") + '</p>' +
        (objectives.length ? '<strong>Learning goals</strong><ul>' + objectives.map(x => '<li>' + esc(x) + '</li>').join("") + '</ul>' : "") +
        (notes ? '<details><summary>Read teacher notes</summary><div class="parent-notes-text">' + esc(typeof notes === "string" ? notes : JSON.stringify(notes, null, 2)) + '</div></details>' : '<p class="parent-muted">Teacher notes are not included in this lesson record.</p>') +
        (questions.length ? '<details><summary>Assessment questions (' + questions.length + ')</summary><ol>' + questions.map(q => '<li>' + esc(typeof q === "string" ? q : q.question || q.prompt || JSON.stringify(q)) + '</li>').join("") + '</ol></details>' : "") +
        (submission.feedback ? '<div class="parent-feedback"><strong>Teacher feedback</strong><p>' + esc(submission.feedback) + '</p></div>' : "") + '</article>';
    }).join("") + '</div>';
  }
  async function loadLessons() {
    const child = selectedChild();
    if (!child) { state.lessons = []; return; }
    const data = await request("/api/v1/parent/children/" + encodeURIComponent(child.learner_id) + "/assigned-lessons");
    state.lessons = Array.isArray(data.lessons) ? data.lessons : [];
  }
  function learning() {
    const child = selectedChild();
    return '<div class="parent-child-selector"><label for="parent-child-select">Child profile</label><select id="parent-child-select">' + childOptions() + '</select></div>' +
      '<section class="de-section"><div class="de-section-title"><h3>Teacher-assigned lessons &amp; homework</h3><span>' + state.lessons.length + ' lessons</span></div><div id="parent-lessons-content">' + lessonCards(state.lessons) + '</div></section>' +
      '<section class="de-section"><div class="de-section-title"><h3>Find trustworthy home practice</h3><span>Connected learning sources</span></div><form class="parent-source-form" id="parent-source-form"><label for="parent-source-query">Topic or question</label><div class="parent-source-controls"><input id="parent-source-query" name="q" required maxlength="180" placeholder="e.g. equivalent fractions, photosynthesis"><button class="de-action primary" type="submit">Find materials</button></div><label for="parent-source-subject">Subject (optional)</label><input id="parent-source-subject" name="subject" maxlength="80" placeholder="Mathematics, science…"><div id="parent-source-results" aria-live="polite"></div></form></section>';
  }
  function sourceCards(resources) {
    if (!resources.length) return empty("No playable source matched this search", "Try a shorter topic or a different subject. The source service may be temporarily unavailable.");
    return '<div class="parent-source-list">' + resources.map(item => { const url = safeUrl(item.url || item.source_url || item.page_url); return '<article class="parent-source-card"><span class="parent-source-provider">' + esc(item.source || item.provider || "Connected source") + '</span><h4>' + esc(item.title || "Learning material") + '</h4><p>' + esc(item.description || "") + '</p>' + (item.creator ? '<small>Creator: ' + esc(item.creator) + '</small>' : '') + (url ? '<p><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open source ↗</a></p>' : '') + '</article>'; }).join("") + '</div>';
  }
  function guide() {
    const child = selectedChild();
    const topics = child ? (child.focus_topics || []).slice(0, 4) : [];
    return '<section class="de-section parent-guide-intro"><span class="parent-kicker">AI PARENT GUIDE</span><h3>Practical support grounded in learning evidence</h3><p>Use recorded focus topics to find level-appropriate notes and source material. Dream will not invent a diagnosis or pretend to know what has not been recorded.</p>' +
      (child ? '<div class="parent-guide-child"><strong>Selected child: ' + esc(child.name || child.learner_id) + '</strong><p>' + (topics.length ? 'Recorded topics to consider: ' + esc(topics.join(", ")) : 'No current focus topics are recorded. You can choose a topic below.') + '</p></div>' : "") +
      '<form id="parent-guide-form" class="parent-source-form"><label for="parent-guide-topic">What would you like help supporting?</label><input id="parent-guide-topic" name="topic" required maxlength="160" value="' + esc(topics[0] || "") + '" placeholder="Enter a topic or learning difficulty"><label for="parent-guide-subject">Subject</label><input id="parent-guide-subject" name="subject" maxlength="80" placeholder="Subject"><label for="parent-guide-level">Child’s education level</label><input id="parent-guide-level" name="level" maxlength="100" value="' + esc(child && child.level || "") + '" placeholder="e.g. Grade 6 / Junior Secondary"><button class="de-action primary" type="submit">Generate source-backed study notes</button><div id="parent-guide-result" aria-live="polite"></div></form></section>' +
      '<section class="de-section"><h3>Helpful ways to respond</h3><ul class="parent-support-list"><li>Ask what part makes sense and where the confusion begins.</li><li>Work through one example together, then let your child try independently.</li><li>Ask the teacher for clarification if the same difficulty persists.</li><li>Use encouragement and curiosity; never use a score alone to label a child.</li></ul></section>';
  }
  async function loadConnectionsAndMeetings() {
    const [connections, meetings, attendance] = await Promise.all([
      request("/api/product/connections?status=active").catch(() => ({ connections: [] })),
      request("/api/product/meetings").catch(() => ({ meetings: [] })),
      request("/api/v1/parent/attendance").catch(() => ({ success: false, attendance: [], children: [] }))
    ]);
    state.connections = Array.isArray(connections.connections) ? connections.connections : Array.isArray(connections.results) ? connections.results : [];
    state.meetings = Array.isArray(meetings.meetings) ? meetings.meetings : [];
    state.attendanceAvailable = attendance.success === true && Array.isArray(attendance.attendance);
    state.attendance = state.attendanceAvailable ? attendance.attendance : [];
    state.attendanceChildren = Array.isArray(attendance.children) ? attendance.children : [];
  }
  function community() {
    const connections = state.connections.length ? '<div class="parent-contact-list">' + state.connections.map(c => '<article><strong>' + esc(c.name || c.to_name || c.from_name || c.connection_id || "Active connection") + '</strong><span>' + esc(c.type || c.to_role || c.from_role || "Connected") + '</span></article>').join("") + '</div>' : empty("No active connections returned", "Use Connections to request a connection with your child’s teacher or school.");
    const meetings = state.meetings.length ? '<div class="parent-contact-list">' + state.meetings.map(m => '<article><strong>' + esc(m.title || "Meeting") + '</strong><span>' + esc([m.scheduled_date, m.scheduled_time, m.status].filter(Boolean).join(" · ") || "Scheduled meeting") + '</span>' + (m.agenda ? '<p><b>Agenda:</b> ' + esc(m.agenda) + '</p>' : '') + (m.follow_up ? '<p><b>Notes:</b> ' + esc(m.follow_up) + '</p>' : '') + (m.action_items ? '<p><b>Next actions:</b> ' + esc(m.action_items) + '</p>' : '') + '</article>').join("") + '</div>' : empty("No meetings found", "Meetings linked to authorised connections will appear here when available.");
    return '<div class="parent-two-column"><section class="de-section"><div class="de-section-title"><h3>Teachers &amp; school connections</h3></div>' + connections + '<div class="de-actions">' + button("Manage connections", "connections", true) + button("Open messages", "chat") + '</div></section><section class="de-section"><div class="de-section-title"><h3>Meetings &amp; calendar</h3></div>' + meetings + '<div class="de-actions">' + button("Open meetings", "meetings", true) + '</div></section></div><section class="de-section"><h3>Attendance &amp; school notices</h3>' + (state.attendanceAvailable
      ? (state.attendance.length
        ? '<div class="parent-contact-list">' + state.attendance.slice(0, 60).map(item => '<article><strong>' + esc(item.learner_name || "Learner") + ' · ' + esc(item.status) + '</strong><span>' + esc([item.date, item.school_name].filter(Boolean).join(" · ")) + '</span></article>').join("") + '</div><p class="parent-disclaimer">Only attendance status and date from saved school registers are shown. Staff notes and other learners’ records are not shared here.</p>'
        : empty(state.attendanceChildren.length ? "No attendance records have been saved yet" : "No connected child attendance is available", state.attendanceChildren.length ? "When the connected school records attendance, the latest verified entries will appear here." : "Connect your parent account to your child’s learner account first."))
      : empty("Attendance could not be loaded", "The parent attendance service is temporarily unavailable. Refresh to try again; no attendance has been guessed.")) + '</section>';
  }
  function achievements() {
    const child = selectedChild();
    if (!child) return empty("No child selected", "Connect a child profile to see recorded milestones.");
    const evidence = child.evidence || {};
    const decisions = child.adaptive_decisions || {};
    return '<div class="de-metrics">' + metric("Learning evidence", evidence.count || 0, "Recorded observations") + metric("Evidence types", Object.keys(evidence.by_type || {}).length, "Types present in the record") + metric("Adaptive learning decisions", decisions.count || 0, "Existing adaptive engine") + '</div><section class="de-section"><h3>Encouragement &amp; milestones</h3><p>Celebrate effort and progress shown by recorded evidence. Dream only displays the milestones it can verify from saved activity.</p>' + ((child.strengths || []).length ? '<ul class="parent-topic-list">' + child.strengths.map(x => '<li>Strength observed: ' + esc(x) + '</li>').join("") + '</ul>' : empty("No verified achievement summary yet", "As the learner completes activities and assessments, recorded strengths can appear here.")) + '</section><p class="parent-disclaimer">A missing record is not proof that learning did not happen. It means this workspace has no verified record to display.</p>';
  }
  function tabs() {
    const entries = [["overview","Overview"],["children","My children"],["progress","Progress"],["learning","Lessons & home learning"],["community","Teachers & meetings"],["guide","AI Parent Guide"],["achievements","Achievements"]];
    return '<nav class="parent-workspace-nav" aria-label="Parent workspace sections">' + entries.map(([id,label]) => '<button type="button" data-parent-tab="' + id + '"' + (state.tab === id ? ' class="active" aria-current="page"' : "") + '>' + label + '</button>').join("") + '</nav>';
  }
  function render() {
    const root = body();
    if (!root) return;
    const content = state.tab === "overview" ? overview() : state.tab === "children" ? (state.children.length ? '<div class="parent-children-grid">' + state.children.map(childCard).join("") + '</div>' : empty("No connected children yet", "Connect the learner account first.")) :
      state.tab === "progress" ? progress() : state.tab === "learning" ? learning() : state.tab === "community" ? community() : state.tab === "guide" ? guide() : achievements();
    root.innerHTML = '<div class="de-workspace parent-workspace"><div class="parent-workspace-heading"><div><span class="parent-kicker">DREAM EDUCATION · FAMILY CENTRE</span><h3>' + esc(state.info.name || "Parent") + '</h3><p>One place to understand progress, support learning and work with teachers.</p></div><div class="parent-heading-actions">' + button("Refresh", "refresh") + button("Media Studio", "media-studio") + button("Messages", "chat") + '</div></div>' + tabs() + (state.notice ? '<div class="parent-notice" role="status">' + esc(state.notice) + '</div>' : "") + '<div class="parent-workspace-content">' + content + '</div><div class="de-actions de-bottom-actions">' + button("Connections", "connections") + button("Account", "account") + button("Close", "close") + '</div></div>';
  }
  async function switchTab(tab) {
    state.tab = tab;
    state.notice = "";
    if (tab === "learning") {
      render();
      try { await loadLessons(); } catch (error) { state.notice = error.message; }
      render();
    } else if (tab === "community") {
      render();
      await loadConnectionsAndMeetings();
      render();
    } else render();
  }
  async function findSources(query, subject, target) {
    target.innerHTML = '<div class="de-loading"><span></span><p>Searching connected learning sources…</p></div>';
    try {
      const params = new URLSearchParams({ q: query, subject: subject || "", level: (selectedChild() && selectedChild().level) || "", limit: "6" });
      const data = await request("/api/v1/learning/resources?" + params.toString());
      state.resources = Array.isArray(data.resources) ? data.resources : [];
      target.innerHTML = (Array.isArray(data.providers) && data.providers.length ? '<p class="parent-source-health">' + esc(data.providers.filter(p => p && p.success && Number(p.count) > 0).length) + ' source provider(s) returned material. Results are source discovery, not school-assigned work.</p>' : "") + sourceCards(state.resources);
    } catch (error) { target.innerHTML = '<div class="parent-error">' + esc(error.message) + '</div>'; }
  }
  async function generateNotes(form) {
    const data = new FormData(form), result = document.getElementById("parent-guide-result");
    const topic = String(data.get("topic") || "").trim();
    if (!topic || !result) return;
    result.innerHTML = '<div class="de-loading"><span></span><p>Preparing study notes from connected knowledge sources…</p></div>';
    try {
      const response = await request("/api/v1/learning/notes", { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, tokenHeaders()), body: JSON.stringify({ topic, subject: data.get("subject") || "", level: data.get("level") || "", notes_type: "parent_support" }) });
      const notes = response.notes || response.content || response.study_notes || response.summary || "";
      const sources = Array.isArray(response.sources) ? response.sources : [];
      result.innerHTML = '<article class="parent-notes-result"><div class="de-section-title"><h4>' + esc(response.topic || topic) + '</h4><span>' + esc(response.evidence_status || "Source status returned by Dream") + '</span></div><div class="parent-notes-text">' + esc(typeof notes === "string" ? notes : JSON.stringify(notes, null, 2)) + '</div>' + (sources.length ? '<h5>Sources returned</h5><ul>' + sources.map(s => '<li>' + esc(s.title || s.name || s.url || s.source || "Source") + (s.url ? ' — <a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">open</a>' : "") + '</li>').join("") + '</ul>' : '<p class="parent-muted">The notes service did not return a source list for this request. Check its evidence status before relying on the notes.</p>') + '</article>';
    } catch (error) { result.innerHTML = '<div class="parent-error">' + esc(error.message) + '</div>'; }
  }
  function onClick(event) {
    const tab = event.target.closest("[data-parent-tab]");
    if (tab) { switchTab(tab.getAttribute("data-parent-tab")); return; }
    const target = event.target.closest("[data-parent-action]");
    if (!target) return;
    const action = target.getAttribute("data-parent-action");
    if (action === "refresh") { start(state.info); return; }
    if (action === "media-studio") {
      if (window.DreamMediaStudio && typeof window.DreamMediaStudio.open === "function") window.DreamMediaStudio.open();
      else { state.notice = "Media Studio is still loading. Please try again."; render(); }
      return;
    }
    if (action === "guide") { switchTab("guide"); return; }
    if (action === "sources") { switchTab("learning"); return; }
    if (action === "connections") { const button = document.querySelector('[data-de-action="connections"]'); if (button) button.click(); return; }
    if (action === "chat") { if (window.DreamEducationChat && typeof window.DreamEducationChat.open === "function") window.DreamEducationChat.open(); else state.notice = "Messaging is available through an active connection when the chat service is loaded."; render(); return; }
    if (action === "meetings") { const button = document.querySelector('[data-de-action="meetings"]'); if (button) button.click(); return; }
    if (action.startsWith("progress:")) { state.selected = action.split(":")[1]; switchTab("progress"); return; }
    if (action.startsWith("lessons:")) { state.selected = action.split(":")[1]; switchTab("learning"); return; }
    if (action.startsWith("practice:")) {
      state.selected = action.split(":")[1]; switchTab("learning");
      setTimeout(() => { const input = document.getElementById("parent-source-query"); const focus = selectedChild() && (selectedChild().focus_topics || [])[0]; if (input) { input.value = focus || ""; input.focus(); } }, 100);
      return;
    }
    if (action.startsWith("practice-topic:")) {
      const parts = action.split(":"); state.selected = parts[1]; switchTab("learning");
      setTimeout(() => { const input = document.getElementById("parent-source-query"); if (input) { input.value = parts.slice(2).join(":"); input.focus(); } }, 100);
    }
  }
  function onChange(event) {
    if (event.target && event.target.id === "parent-child-select") {
      state.selected = event.target.value;
      if (state.tab === "learning") loadLessons().catch(error => { state.notice = error.message; }).finally(render);
      else render();
    }
  }
  function onSubmit(event) {
    if (event.target.id === "parent-source-form") {
      event.preventDefault();
      const data = new FormData(event.target), target = document.getElementById("parent-source-results");
      findSources(String(data.get("q") || "").trim(), String(data.get("subject") || "").trim(), target);
    } else if (event.target.id === "parent-guide-form") {
      event.preventDefault(); generateNotes(event.target);
    }
  }
  async function start(info) {
    state.info = info;
    state.tab = "overview";
    state.notice = "";
    const root = body();
    if (root) root.innerHTML = '<div class="de-loading"><span></span><p>Loading family learning evidence…</p></div>';
    try {
      const data = await request("/api/v1/role/parent/intelligence");
      state.intelligence = data.intelligence || {};
      state.children = Array.isArray(state.intelligence.children) ? state.intelligence.children : [];
      if (!state.selected || !state.children.some(c => String(c.learner_id) === String(state.selected))) state.selected = state.children[0] ? String(state.children[0].learner_id) : "";
      state.lessons = [];
      await switchTab("overview");
    } catch (error) {
      if (root) root.innerHTML = '<div class="de-error"><strong>Parent workspace could not load.</strong><p>' + esc(error.message) + '</p><button type="button" class="de-action primary" data-parent-action="refresh">Try again</button></div>';
    }
  }
  window.DreamParentWorkspace = { open: start };
  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("submit", onSubmit);
})();