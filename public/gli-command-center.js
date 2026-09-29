(function () {
  "use strict";

  const AUTH_KEY = "dream_education_auth";
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function auth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); }
    catch (_) { return null; }
  }

  function token() {
    const a = auth();
    return a && a.session && a.session.access_token ? a.session.access_token : "";
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function firstArray(...values) {
    for (const v of values) if (Array.isArray(v)) return v;
    return [];
  }

  async function getJSON(url, options) {
    const headers = Object.assign({ Accept: "application/json" }, options && options.headers);
    if (token()) headers.Authorization = "Bearer " + token();
    const response = await fetch(url, Object.assign({}, options || {}, { headers }));
    const data = await response.json().catch(() => ({ success:false, error:"Invalid server response." }));
    if (!response.ok || data.success === false) throw new Error(data.error || "Request failed.");
    return data;
  }

  function roleOf(a) {
    return String(a && (a.role || (a.account && a.account.role)) || "learner").toLowerCase();
  }

  function learnerIdOf(a) {
    return String((a && a.learner_id) ||
      (a && a.account && a.account.learner_id) ||
      (a && a.profile && a.profile.learner_id) || "").trim();
  }

  function scoreValues(profile, graph) {
    const assessments = firstArray(profile && profile.assessments, profile && profile.recent_assessments,
      graph && graph.assessments);
    return assessments.map(x => num(x.score)).filter(x => x >= 0 && x <= 100);
  }

  function masteryFromProfile(profile, graph) {
    const subjects = firstArray(profile && profile.subjects, profile && profile.subject_profiles);
    if (subjects.length) {
      return subjects.slice(0, 8).map(s => ({
        name: String(s.subject || s.name || s.subject_name || "Subject"),
        value: Math.max(0, Math.min(100, num(s.mastery || s.score || s.average_score || s.understanding)))
      }));
    }
    const concepts = firstArray(graph && graph.nodes).filter(n => String(n.type || "").toLowerCase().includes("concept"));
    return concepts.slice(0, 8).map(n => ({
      name: String(n.label || n.name || n.id || "Concept").slice(0, 28),
      value: Math.max(0, Math.min(100, num(n.mastery || n.score || n.value)))
    }));
  }

  function topicsFromProfile(profile, graph) {
    const topics = firstArray(profile && profile.current_misconception_topics,
      profile && profile.misconception_topics,
      profile && profile.topics,
      graph && graph.patterns && graph.patterns.current_misconception_topics);
    return topics.map(x => typeof x === "string" ? x : (x.topic || x.name || x.label || "Topic")).filter(Boolean).slice(0, 8);
  }

  function donut(score) {
    const s = Math.max(0, Math.min(100, num(score)));
    return '<div class="gli-donut" style="--p:' + s + '%"><div><strong>' + Math.round(s) + '%</strong><span>mastery</span></div></div>';
  }

  function spark(values) {
    const vals = values.length ? values : [0,0,0,0,0,0];
    const max = Math.max(...vals, 100), min = Math.min(...vals, 0);
    const range = Math.max(1, max - min);
    const points = vals.map((v,i) => {
      const x = vals.length === 1 ? 50 : (i/(vals.length-1))*100;
      const y = 94 - ((v-min)/range)*78;
      return x.toFixed(2)+","+y.toFixed(2);
    }).join(" ");
    return '<svg class="gli-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Learning trend"><polyline points="'+points+'"></polyline></svg>';
  }

  function bars(items) {
    if (!items.length) return '<div class="gli-empty">Complete a few assessments to unlock your learning profile.</div>';
    return '<div class="gli-bars">' + items.map(x =>
      '<div class="gli-bar-row"><span title="'+esc(x.name)+'">'+esc(x.name)+'</span><div><i style="width:'+Math.round(x.value)+'%"></i></div><b>'+Math.round(x.value)+'%</b></div>'
    ).join("") + '</div>';
  }

  function actionCards(actions) {
    if (!actions.length) return '<div class="gli-empty">No proactive action is waiting right now.</div>';
    return actions.slice(0,6).map((a,i) => {
      const priority = String(a.priority || "medium").toLowerCase();
      return '<article class="gli-action-card"><span class="gli-priority '+esc(priority)+'">'+esc(priority)+'</span><h4>'+esc(a.type || a.action || "Learning action")+'</h4><p>'+esc(a.reason || a.description || a.action || "Continue your learning journey.")+'</p><button data-gli-action="continue" data-action-index="'+i+'">Continue →</button></article>';
    }).join("");
  }

  function roleHub(a) {
    const role = roleOf(a);
    const name = (a && a.profile && a.profile.name) || (a && a.account && a.account.name) || (a && a.account && a.account.email) || "there";
    const cards = {
      learner: [
        ["Adaptive learning","Continue the protected assessment → state → teaching → next-question loop.","adaptive"],
        ["Learning intelligence","See mastery, misconceptions, recovery and proactive actions.","intelligence"],
        ["Ask Dream AI","Ask questions and use the existing AI learning tools.","ai"]
      ],
      teacher: [
        ["Teacher workspace","Open your existing connected learner dashboard.","teacher"],
        ["Analytics","Explore learner performance and progress.","analytics"],
        ["Connections","Manage your existing teacher connections.","connections"]
      ],
      parent: [
        ["Parent space","Open your connected family learning space.","parent"],
        ["Progress","Review the learning information already available to your account.","parent"],
        ["Meetings","Connect with the people supporting learning.","meetings"]
      ],
      school: [
        ["School command center","Open your existing school dashboard and connected data.","school"],
        ["School intelligence","Review institutional learning signals and results.","school"],
        ["AI Lab","Open the existing intelligent tools.","ai"]
      ]
    }[role] || [];
    return '<div class="gli-role-hub"><div class="gli-hero-mini"><span>YOUR WORKSPACE</span><h3>Welcome, '+esc(name.split(" ")[0])+'.</h3><p>Everything you need is connected to the Dream Education learning platform.</p></div><div class="gli-module-grid">'+cards.map(c => '<button class="gli-module" data-gli-module="'+esc(c[2])+'"><span>'+esc(c[0])+'</span><strong>'+esc(c[1])+'</strong><b>↗</b></button>').join("")+'</div></div>';
  }

  async function renderLearnerDashboard(root, a) {
    const id = learnerIdOf(a);
    if (!id) throw new Error("No learner ID is available in this account.");
    root.innerHTML = '<div class="gli-loading"><span></span><p>Building your learning intelligence…</p></div>';
    const intelligence = await getJSON("/api/v1/learner/"+encodeURIComponent(id)+"/intelligence");
    const profile = intelligence.learning_profile || {};
    const graph = intelligence.learner_graph || {};
    const actions = firstArray(intelligence.proactive_actions);
    const mastery = masteryFromProfile(profile, graph);
    const scores = scoreValues(profile, graph);
    const average = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : num(profile.average_score || profile.averageScore);
    const misconceptions = topicsFromProfile(profile, graph);
    const recovered = firstArray(profile.recovered_topics, graph.patterns && graph.patterns.recovered_topics);
    const nodeCount = firstArray(graph.nodes).length;
    root.innerHTML = '<div class="gli-dashboard">' +
      '<div class="gli-dashboard-head"><div><span class="gli-kicker">GLOBAL LEARNING INTELLIGENCE</span><h3>Your learning picture</h3><p>Adaptive signals from your existing Dream Education learning history.</p></div><button class="gli-refresh" data-gli-refresh>Refresh ↻</button></div>' +
      '<div class="gli-kpis">' +
        '<article><span>Overall signal</span><strong>'+Math.round(average || 0)+'%</strong><small>'+ (scores.length ? scores.length+" assessments" : "Building profile") +'</small></article>' +
        '<article><span>Knowledge nodes</span><strong>'+nodeCount+'</strong><small>Concepts & subjects</small></article>' +
        '<article><span>Recovery signals</span><strong>'+recovered.length+'</strong><small>Recovered areas</small></article>' +
        '<article><span>Focus areas</span><strong>'+misconceptions.length+'</strong><small>Needs attention</small></article>' +
      '</div>' +
      '<div class="gli-main-grid">' +
        '<article class="gli-card gli-mastery"><div class="gli-card-head"><div><span>MASTERY MAP</span><h4>Where you are now</h4></div>'+donut(average)+'</div>'+bars(mastery)+'</article>' +
        '<article class="gli-card gli-trend"><span>LEARNING MOMENTUM</span><h4>Your recent signal</h4>'+spark(scores.slice(-8))+'<div class="gli-trend-labels"><span>Earlier</span><span>Recent</span></div></article>' +
      '</div>' +
      '<div class="gli-section-head"><div><span>PROACTIVE LEARNING</span><h4>What should happen next</h4></div></div>' +
      '<div class="gli-actions">'+actionCards(actions)+'</div>' +
      '<div class="gli-main-grid">' +
        '<article class="gli-card"><span>FOCUS</span><h4>Concepts that need another look</h4><div class="gli-tags">'+(misconceptions.length ? misconceptions.map(x=>'<span>↗ '+esc(x)+'</span>').join("") : '<em>No active misconception signal.</em>')+'</div></article>' +
        '<article class="gli-card"><span>RECOVERY</span><h4>Areas you have recovered</h4><div class="gli-tags">'+(recovered.length ? recovered.slice(0,8).map(x=>'<span class="recovered">✓ '+esc(typeof x==="string"?x:(x.topic||x.name||x.label||"Recovered"))+'</span>').join("") : '<em>Keep learning to build recovery signals.</em>')+'</div></article>' +
      '</div>' +
      '<div class="gli-footer-note">Protected adaptive engines remain authoritative. This dashboard is an intelligence and visualization layer over existing learning data.</div>' +
    '</div>';
    $("[data-gli-refresh]",root)?.addEventListener("click", () => renderLearnerDashboard(root,a));
  }

  async function renderRoleDashboard() {
    const a = auth();
    if (!a || !a.success) {
      if (window.DreamEducationUI) window.DreamEducationUI.openPanel("signin");
      return;
    }
    const panel = $("#experience-panel"), body = $("#panel-body");
    if (!panel || !body) return;
    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden","false");
    $("#panel-kicker").textContent = "DREAM EDUCATION";
    $("#panel-title").textContent = "Intelligence Command Center";
    $("#panel-description").textContent = "One modern control surface connected to your existing learning platform.";
    body.innerHTML = roleHub(a);
    const role = roleOf(a);
    if (role === "learner") await renderLearnerDashboard(body,a);
    else bindRoleModules(body);
  }

  function bindRoleModules(root) {
    $$(".gli-module",root).forEach(btn => btn.addEventListener("click", () => {
      const action = btn.dataset.gliModule;
      if (action === "adaptive" && typeof window.openAdaptiveQuestion === "function") window.openAdaptiveQuestion();
      else if (action === "ai" && window.DreamEducationLearner?.openAsk) window.DreamEducationLearner.openAsk();
      else if (action === "teacher" && window.DreamEducationTeacher?.openDashboard) window.DreamEducationTeacher.openDashboard();
      else if (action === "analytics" && typeof window.openTeacherAnalytics === "function") window.openTeacherAnalytics();
      else if (action === "connections" && typeof window.openTeacherConnections === "function") window.openTeacherConnections();
      else if (action === "parent" && typeof window.openParentSpace === "function") window.openParentSpace();
      else if (action === "meetings" && typeof window.openMeetings === "function") window.openMeetings();
      else if (action === "school" && typeof window.openSchoolDashboard === "function") window.openSchoolDashboard();
    }));
  }

  function addNavButton() {
    const nav = $(".nav-center");
    if (nav && !nav.querySelector("[data-gli-open]")) {
      const b = document.createElement("button");
      b.type="button"; b.dataset.gliOpen="1"; b.textContent="Intelligence";
      nav.appendChild(b);
      b.addEventListener("click", renderRoleDashboard);
    }
  }

  function enhanceWelcome() {
    const body = $("#panel-body");
    if (!body || $("#gli-welcome-button")) return;
    const title = ($("#panel-title")?.textContent || "").trim().toLowerCase();
    if (title !== "welcome back.") return;
    const actions = $(".panel-actions",body);
    if (!actions) return;
    const b = document.createElement("button");
    b.id="gli-welcome-button"; b.className="panel-action gli-welcome-button"; b.type="button";
    b.textContent="Open Intelligence Center →";
    b.addEventListener("click", renderRoleDashboard);
    actions.prepend(b);
  }

  function boot() {
    addNavButton();
    const observer = new MutationObserver(enhanceWelcome);
    const target = $("#experience-panel") || document.body;
    observer.observe(target,{subtree:true,childList:true});
    enhanceWelcome();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();