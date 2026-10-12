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
    link.id = STYLE_ID; link.rel = "stylesheet"; link.href = "/school-workspace.css?v=20261012b";
    document.head.appendChild(link);
  }
  async function fetchSchoolLessonJSON(url, options, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Dream could not complete the lesson request.");
      }
      return data;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("Dream did not respond within 30 seconds. Please try again; if this repeats, the lesson service needs investigation.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
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
      '<article class="school-module-card school-lesson-create"><span class="school-module-icon" aria-hidden="true">▣</span><h4>Prepare a complete lesson</h4><p>Generate evidence-backed teaching notes, timed lesson steps and an assessment with answers using Dream’s existing lesson engine.</p>' +
      '<form id="school-lesson-form"><label>Subject<input name="subject" required minlength="2" maxlength="100" placeholder="e.g. Mathematics"></label>' +
      '<label>Topic<input name="topic" required minlength="2" maxlength="180" placeholder="e.g. Fractions"></label>' +
      '<label>Class / learner level<input name="level" required minlength="2" maxlength="100" placeholder="e.g. Grade 6"></label>' +
      '<label>Lesson duration (minutes)<input name="duration_minutes" type="number" min="15" max="240" value="40" required></label>' +
      '<label>Curriculum/framework<input name="curriculum" maxlength="180" placeholder="e.g. Kenya CBC/CBE"></label>' +
      '<label>School needs or teacher instructions<textarea name="instructions" maxlength="1200" rows="3" placeholder="Language needs, local examples, available materials…"></textarea></label>' +
      '<div class="school-module-actions"><button class="school-module-action primary" type="submit" id="school-lesson-submit">Prepare lesson & assessment</button></div>' +
      '<p id="school-lesson-feedback" class="school-module-note" aria-live="polite"></p></form></article>' +
      '<article class="school-module-card"><span class="school-module-icon" aria-hidden="true">✓</span><h4>Saved lesson plans</h4><p>Lesson plans prepared by this signed-in school account appear here after they are saved.</p><div id="school-lesson-saved" aria-live="polite"><p>Loading saved lessons…</p></div><button class="school-module-action" type="button" data-school-module-action="reload-school-lessons">Refresh saved lessons</button></article>' +
      '</div>';
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
      if (selected === "lessons") loadSchoolLessons();
    }));
    nav.querySelector('[data-school-module-tab="overview"]').classList.add("active");
    let schoolLessonsLoading = false;
    function renderSchoolLessonCard(lesson, expandDetails = false) {
      const steps = lesson.lesson_plan && Array.isArray(lesson.lesson_plan.lesson_steps) ? lesson.lesson_plan.lesson_steps : [];
      const questions = Array.isArray(lesson.assessment_questions) ? lesson.assessment_questions : [];
      const sources = Array.isArray(lesson.sources) ? lesson.sources : [];
      const detail = '<details' + (expandDetails ? ' open' : '') + '><summary>Open notes, teaching steps and assessment</summary><div class="school-lesson-detail"><h5>Teaching notes</h5><div>' + esc(lesson.notes || "No notes returned.") + '</div><h5>Timed lesson steps</h5><ol>' + steps.map(step => '<li><strong>' + esc(step.stage || "Lesson step") + ' (' + esc(step.minutes || 0) + ' min)</strong><p>' + esc(step.teacher_actions || "") + '</p><p><em>Learners:</em> ' + esc(step.learner_actions || "") + '</p><p><em>Check:</em> ' + esc(step.checks_for_understanding || "") + '</p></li>').join("") + '</ol><h5>Assessment with answers</h5><ol>' + questions.map(q => '<li><strong>' + esc(q.question || "") + '</strong><p>Answer: ' + esc(q.correct_answer || "Not provided") + '</p><p>' + esc(q.explanation || "") + '</p><small>Marks: ' + esc(q.marks || 1) + '</small></li>').join("") + '</ol><p>' + sources.length + ' source reference(s) attached · ' + esc(lesson.evidence_count || 0) + ' evidence item(s)</p></div></details>';
      return '<article class="school-module-card school-lesson-saved-card" data-school-lesson-card="' + esc(lesson.lesson_id || "") + '"><h5>' + esc(lesson.subject || "Subject") + ': ' + esc(lesson.topic || "Lesson") + '</h5><p>' + esc(lesson.level || "Level not set") + ' · ' + esc(lesson.duration_minutes || 40) + ' minutes · ' + questions.length + ' assessment questions</p>' + detail + '</article>';
    }
    async function loadSchoolLessons(recentLesson = null) {
      const target = moduleRoot.querySelector("#school-lesson-saved");
      if (!target || schoolLessonsLoading) return;
      const auth = window.DreamEducationUI && typeof window.DreamEducationUI.getAuth === "function"
        ? window.DreamEducationUI.getAuth() : null;
      const token = auth && auth.session && auth.session.access_token;
      if (!token) { target.innerHTML = "<p>Please sign in again to load saved school lessons.</p>"; return; }
      schoolLessonsLoading = true;
      target.innerHTML = "<p>Loading saved lessons…</p>";
      try {
        const data = await fetchSchoolLessonJSON("/api/v1/school/lessons", {
          headers: { "Accept": "application/json", "Authorization": "Bearer " + token }
        });
        const saved = Array.isArray(data.lessons) ? data.lessons : [];
        if (recentLesson && !saved.some(lesson => lesson.lesson_id === recentLesson.lesson_id)) saved.unshift(recentLesson);
        target.innerHTML = saved.length ? saved.map(lesson => renderSchoolLessonCard(lesson, Boolean(recentLesson && lesson.lesson_id === recentLesson.lesson_id))).join("") : "<p>No saved school lessons yet. Prepare the first lesson using the form.</p>";
        if (recentLesson) {
          const createdCard = target.querySelector('[data-school-lesson-card="' + String(recentLesson.lesson_id || "").replace(/["\\]/g, "") + '"]');
          if (createdCard) createdCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (error) {
        target.innerHTML = '<p class="school-module-note">' + esc(error.message || "Could not load saved lessons.") + '</p>';
      } finally { schoolLessonsLoading = false; }
    }
    const schoolLessonForm = moduleRoot.querySelector("#school-lesson-form");
    if (schoolLessonForm) schoolLessonForm.addEventListener("submit", async event => {
      event.preventDefault();
      const feedback = moduleRoot.querySelector("#school-lesson-feedback");
      const submit = moduleRoot.querySelector("#school-lesson-submit");
      const auth = window.DreamEducationUI && typeof window.DreamEducationUI.getAuth === "function"
        ? window.DreamEducationUI.getAuth() : null;
      const token = auth && auth.session && auth.session.access_token;
      if (!token) { if (feedback) feedback.textContent = "Please sign in again before preparing a lesson."; return; }
      const values = new FormData(schoolLessonForm);
      const payload = {
        subject: String(values.get("subject") || "").trim(),
        topic: String(values.get("topic") || "").trim(),
        level: String(values.get("level") || "").trim(),
        duration_minutes: Number(values.get("duration_minutes") || 40),
        curriculum: String(values.get("curriculum") || "").trim(),
        instructions: String(values.get("instructions") || "").trim()
      };
      if (submit) { submit.disabled = true; submit.textContent = "Preparing lesson…"; }
      if (feedback) feedback.textContent = "Dream is retrieving topic evidence and preparing the lesson plan, notes and assessment together. Please keep this page open.";
      try {
        const data = await fetchSchoolLessonJSON("/api/v1/school/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify(payload)
        }, 30000);
        if (!data.lesson || !data.lesson.lesson_id) throw new Error("Dream returned success without a lesson result. Please try again.");
        if (feedback) feedback.textContent = "Lesson plan prepared. The notes, timed teaching steps and assessment answers are opening below.";
        schoolLessonForm.reset();
        const duration = schoolLessonForm.querySelector('[name="duration_minutes"]');
        if (duration) duration.value = "40";
        await loadSchoolLessons(data.lesson);
      } catch (error) {
        if (feedback) feedback.textContent = error.message || "Dream could not prepare this lesson.";
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = "Prepare lesson & assessment"; }
      }
    });
    moduleRoot.addEventListener("click", event => {
      const button = event.target.closest("[data-school-module-action]");
      if (!button) return;
      const action = button.getAttribute("data-school-module-action");
      if (action === "refresh") {
        const refresh = root.querySelector('[data-panel-action="school-dashboard"]');
        if (refresh) refresh.click();
      } else if (action === "teaching") {
        const lessonsTab = nav.querySelector('[data-school-module-tab="lessons"]');
        if (lessonsTab) lessonsTab.click();
        else announce("School Lesson Studio is not available in this school session yet.");
      } else if (action === "reload-school-lessons") {
        loadSchoolLessons();
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