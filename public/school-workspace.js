(function () {
  "use strict";
  const STYLE_ID = "dream-school-workspace-style";
  const SCRIPT_MARK = "data-school-workspace-enhanced";
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const panelBody = () => document.getElementById("panel-body");
  const panel = () => document.getElementById("experience-panel");
  const existingRows = selector => Array.from((panelBody() || document).querySelectorAll(selector)).map(row => Array.from(row.querySelectorAll("td")).map(cell => cell.textContent.trim()));
  function styleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID; link.rel = "stylesheet"; link.href = "/school-workspace.css?v=20261012a";
    document.head.appendChild(link);
  }
  function moduleButton(id,label) { return '<button type="button" data-school-module-tab="' + esc(id) + '">' + esc(label) + '</button>'; }
  function card(icon,title,description,actionLabel,action) {
    return '<article class="school-module-card"><span class="school-module-icon" aria-hidden="true">' + icon + '</span><h4>' + esc(title) + '</h4><p>' + esc(description) + '</p>' +
      (actionLabel ? '<div class="school-module-actions"><button class="school-module-action primary" type="button" data-school-module-action="' + esc(action) + '">' + esc(actionLabel) + ' →</button></div>' : '') + '</article>';
  }
  function section(id,content,active) { return '<section class="school-module-panel' + (active ? ' active' : '') + '" data-school-module-panel="' + esc(id) + '">' + content + '</section>'; }
  function renderExtras(root) {
    if (!root || root.hasAttribute(SCRIPT_MARK)) return;
    root.setAttribute(SCRIPT_MARK,"true");
    const oldNav = root.querySelector(".school-nav");
    const oldTabs = Array.from(root.querySelectorAll(".school-tab"));
    const tables = {
      learners: existingRows('[data-school-content="learners"] tbody tr'),
      teachers: existingRows('[data-school-content="teachers"] tbody tr'),
      classes: existingRows('[data-school-content="classes"] tbody tr'),
      results: existingRows('[data-school-content="results"] tbody tr')
    };
    const schoolName = (root.querySelector(".school-welcome h3") || {}).textContent || "Your school";
    const nav = document.createElement("nav");
    nav.className = "school-module-nav";
    nav.setAttribute("aria-label","School management sections");
    nav.innerHTML = [
      moduleButton("overview","Overview"), moduleButton("learners","Learners"), moduleButton("teachers","Teachers"),
      moduleButton("classes","Classes & Subjects"), moduleButton("lessons","Lesson Plans"), moduleButton("assessments","Assessments"),
      moduleButton("analytics","Learning Analytics"), moduleButton("attendance","Attendance"), moduleButton("timetable","Timetable"),
      moduleButton("community","Parents & Communication"), moduleButton("records","Reports & Records"), moduleButton("settings","School Settings")
    ].join("");
    const moduleRoot = document.createElement("div");
    moduleRoot.className = "school-space-enhanced";
    const overview = '<div class="school-module-grid">' +
      card("⌂","School operations","Your school overview is based on the connected school, class, learner, teacher and assessment records. Refresh the dashboard to retrieve the latest available data.","Refresh dashboard","refresh") +
      card("▤","Lesson plans & notes","Prepare curriculum-level lessons with objectives, source-backed teaching material, notes and assessments in the existing Dream Education lesson workflow.","Open teaching tools","teaching") +
      card("✓","Assessment & results","Review the recorded results available to this school. New results only appear when the connected learning or assessment workflow saves them.","View results","assessments") +
      card("↗","Learning analytics","Use the recorded assessment outcomes and available learner records to understand progress without inventing missing statistics.","Open analytics","analytics") +
      '</div>';
    const learnerContent = '<div class="school-module-card"><h4>Learner register</h4><p>Records currently returned by the school dashboard.</p><input class="school-module-search" type="search" data-school-table-filter="learners" placeholder="Search learners…" aria-label="Search learners"><div class="school-module-table-wrap"><table class="school-module-table"><thead><tr><th>Learner</th><th>Class</th></tr></thead><tbody>' + tableRows(tables.learners,2) + '</tbody></table></div><p class="school-module-note">This view displays connected records only; it does not create or alter learner accounts.</p></div>';
    const teacherContent = '<div class="school-module-card"><h4>Teacher register</h4><p>Teachers currently associated with school classes.</p><input class="school-module-search" type="search" data-school-table-filter="teachers" placeholder="Search teachers…" aria-label="Search teachers"><div class="school-module-table-wrap"><table class="school-module-table"><thead><tr><th>Teacher</th><th>Assigned classes</th></tr></thead><tbody>' + tableRows(tables.teachers,2) + '</tbody></table></div><p class="school-module-note">Teacher invitations and role assignments must be handled by the authenticated school-management backend.</p></div>';
    const classContent = '<div class="school-module-card"><h4>Classes & subjects</h4><p>Classes and class teachers currently linked to this school.</p><input class="school-module-search" type="search" data-school-table-filter="classes" placeholder="Search classes…" aria-label="Search classes"><div class="school-module-table-wrap"><table class="school-module-table"><thead><tr><th>Class</th><th>Teacher</th><th>Learners</th></tr></thead><tbody>' + tableRows(tables.classes,3) + '</tbody></table></div><p class="school-module-note">Class creation and subject assignments are not exposed here until the server enforces school-scoped permissions.</p></div>';
    const lessons = '<div class="school-module-grid">' +
      card("▣","Lesson plans","Create structured lessons and keep objectives, lesson steps, teacher notes and assessment questions together.","Open Lesson Studio","teaching") +
      card("⌕","Knowledge & sources","Use Dream Education’s existing source and knowledge tools to enrich lesson preparation at the learner’s level.","Open AI Lab","lab") +
      card("▤","Learner materials","Teacher-provided notes and assignments should be published through the authenticated teaching workflow.","Open teaching tools","teaching") + '</div>';
    const assessments = '<div class="school-module-card"><h4>Assessment register</h4><p>Results currently available from the connected school data.</p><input class="school-module-search" type="search" data-school-table-filter="results" placeholder="Search assessment results…" aria-label="Search assessment results"><div class="school-module-table-wrap"><table class="school-module-table"><thead><tr><th>Assessment / topic</th><th>Learner</th><th>Score</th></tr></thead><tbody>' + tableRows(tables.results,3) + '</tbody></table></div><div class="school-module-actions"><button class="school-module-action primary" type="button" data-school-module-action="teaching">Prepare lesson & questions →</button></div></div>';
    const analytics = '<div class="school-module-grid">' +
      card("▥","Recorded outcomes","The dashboard’s average score and results table reflect only the records returned by the server.","View assessment data","assessments") +
      card("◎","Learner progress","Individual adaptive profiles remain in the existing learner and adaptive engine. No duplicate learning engine is introduced.","Open learner records","learners") + '</div>';
    const unavailable = (title,description) => '<div class="school-module-card"><span class="school-module-kicker">SCHOOL MODULE</span><h4>' + esc(title) + '</h4><p>' + esc(description) + '</p><div class="school-module-empty">This module is visible in the school workspace, but a persistent, permission-checked backend workflow is not currently exposed by the existing school API. No sample records are shown as real data.</div></div>';
    const community = '<div class="school-module-grid">' +
      card("✉","School communication","Open the existing meetings and communication experience for supported school conversations.","Open Meetings","meetings") +
      card("◉","Learning support","Use available assessment outcomes to identify topics that may need more teaching.","Review results","assessments") + '</div>';
    moduleRoot.innerHTML = '<div class="school-workspace-topline"><div class="school-workspace-brand"><span class="school-workspace-mark" aria-hidden="true">DE</span><div><small>School administration</small><strong>' + esc(schoolName) + '</strong></div></div><span class="school-workspace-badge">Connected school records</span></div>' +
      '<div class="school-module-nav-placeholder"></div>' +
      section("overview",overview,true) + section("learners",learnerContent,false) + section("teachers",teacherContent,false) +
      section("classes",classContent,false) + section("lessons",lessons,false) + section("assessments",assessments,false) +
      section("analytics",analytics,false) + section("attendance",unavailable("Attendance","Daily registers, present/absent records and absence follow-up require a persistent school attendance API."),false) +
      section("timetable",unavailable("Timetable & school calendar","Class schedules, teacher timetables, rooms and events require a saved school timetable API."),false) +
      section("community",community,false) + section("records",unavailable("Reports & records","Downloadable report cards and school reports must be generated from authorised, persisted school data."),false) +
      section("settings",unavailable("School settings & permissions","School profile, academic terms, curriculum, roles and audit settings require server-side school-admin permission checks."),false);
    moduleRoot.querySelector(".school-module-nav-placeholder").replaceWith(nav);
    if (oldNav) oldNav.hidden = true;
    oldTabs.forEach(tab => { tab.hidden = true; });
    root.appendChild(moduleRoot);
    nav.querySelectorAll("[data-school-module-tab]").forEach(button => button.addEventListener("click", () => {
      const selected = button.getAttribute("data-school-module-tab");
      nav.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
      moduleRoot.querySelectorAll("[data-school-module-panel]").forEach(item => item.classList.toggle("active", item.getAttribute("data-school-module-panel") === selected));
    }));
    nav.querySelector('[data-school-module-tab="overview"]').classList.add("active");
    moduleRoot.addEventListener("click", event => {
      const button = event.target.closest("[data-school-module-action]");
      if (!button) return;
      const action = button.getAttribute("data-school-module-action");
      if (action === "refresh") {
        const refresh = root.querySelector('[data-panel-action="school-dashboard"]');
        if (refresh) refresh.click();
      } else if (action === "teaching") {
        const aiLab = root.querySelector('[data-panel-action="school-ai-lab"]');
        if (aiLab) aiLab.click();
        else announce("Teaching tools are not available in this school session yet.");
      } else if (action === "lab") {
        const aiLab = root.querySelector('[data-panel-action="school-ai-lab"]');
        if (aiLab) aiLab.click();
        else announce("AI Lab is not available in this school session yet.");
      } else if (action === "meetings") {
        const meetings = root.querySelector('[data-panel-action="meetings"]');
        if (meetings) meetings.click();
        else announce("Meetings are not available in this school session yet.");
      } else {
        const tab = nav.querySelector('[data-school-module-tab="' + action + '"]');
        if (tab) tab.click();
      }
    });
    moduleRoot.addEventListener("input", event => {
      const input = event.target.closest("[data-school-table-filter]");
      if (!input) return;
      const key = input.getAttribute("data-school-table-filter");
      const table = moduleRoot.querySelector('[data-school-module-panel="' + key + '"] .school-module-table tbody') ||
        (key === "results" ? moduleRoot.querySelector('[data-school-module-panel="assessments"] .school-module-table tbody') : null);
      if (!table) return;
      const query = input.value.trim().toLowerCase();
      table.querySelectorAll("tr").forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(query); });
    });
  }
  function tableRows(rows,count) {
    if (!rows || !rows.length || (rows.length === 1 && /no .* recorded|—/i.test(rows[0].join(" ")))) {
      return '<tr><td colspan="' + count + '">No connected records returned.</td></tr>';
    }
    return rows.map(row => '<tr>' + Array.from({length:count},(_,i)=>'<td>' + esc(row[i] || "—") + '</td>').join("") + '</tr>').join("");
  }
  function announce(message) {
    const root = panelBody();
    if (!root) return;
    let node = root.querySelector("[data-school-workspace-notice]");
    if (!node) { node = document.createElement("p"); node.setAttribute("data-school-workspace-notice","true"); node.className = "school-module-note"; root.prepend(node); }
    node.textContent = message;
  }
  function scan() {
    styleOnce();
    const body = panelBody();
    if (!body || !body.querySelector(".school-space")) return;
    renderExtras(body.querySelector(".school-space"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  scan();
})();