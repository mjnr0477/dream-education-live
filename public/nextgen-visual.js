(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function addStyle() {
    if (document.getElementById("dream-nextgen-style")) return;
    var link = document.createElement("link");
    link.id = "dream-nextgen-style";
    link.rel = "stylesheet";
    link.href = "/nextgen-visual.css?v=20261001";
    document.head.appendChild(link);
  }

  function card(role, title, text, panel, glow) {
    return (
      '<button type="button" class="de-role-card de-magnetic" data-action="open" ' +
      'data-panel="' + panel + '" style="--role-glow:' + glow + '">' +
      '<small>' + role + '</small>' +
      '<strong>' + title + '</strong>' +
      '<span>' + text + '</span>' +
      '</button>'
    );
  }

  function inject() {
    var hero = document.querySelector(".hero");
    if (!hero || hero.dataset.nextgenReady === "1") return;
    hero.dataset.nextgenReady = "1";
    hero.classList.add("de-nextgen-visual");

    var content = hero.querySelector(".hero-content");
    if (content) {
      var command = document.createElement("section");
      command.className = "de-hero-command";
      command.setAttribute("aria-label", "Dream Education intelligence overview");
      command.innerHTML =
        '<div class="de-command-main">' +
          '<span class="de-command-kicker">Global Learning Intelligence</span>' +
          '<h3>Your learning system is more than a dashboard.</h3>' +
          '<p>Dream Education connects knowledge, learning state, evidence, progress and the next best action into one intelligent experience.</p>' +
        '</div>' +
        '<div class="de-command-side">' +
          '<div class="de-command-orbit"><div class="de-orbit" aria-hidden="true"></div></div>' +
          '<div class="de-command-stat"><b>AI</b><span>Intelligence</span></div>' +
          '<div class="de-command-stat"><b>∞</b><span>Learning paths</span></div>' +
          '<div class="de-command-stat"><b>24/7</b><span>Knowledge access</span></div>' +
        '</div>';
      content.appendChild(command);
    }

    // The next-generation landing replaces the legacy landing sections visually.\n    // Keep their DOM/routes intact so existing panel actions remain available, but avoid\n    // rendering the old landing twice on the same page.\n    document.querySelectorAll(".gateway-section, .statement-section, .cta-section").forEach(function (section) {\n      section.classList.add("de-legacy-landing-hidden");\n      section.setAttribute("aria-hidden", "true");\n    });\n\n    var gatewaySection = document.querySelector(".gateway-section");
    if (!gatewaySection || gatewaySection.dataset.nextgenRoles === "1") return;
    gatewaySection.dataset.nextgenRoles = "1";

    var roleStrip = document.createElement("section");
    roleStrip.className = "de-role-strip";
    roleStrip.setAttribute("aria-label", "Dream Education role experiences");
    roleStrip.innerHTML =
      card("LEARNER", "Learn", "Adaptive learning built around your progress.", "learn", "rgba(125,231,255,.16)") +
      card("TEACHER", "Teach", "See learning evidence and guide learners.", "teach", "rgba(155,124,255,.16)") +
      card("PARENT", "Support", "Stay connected to meaningful learning progress.", "connect", "rgba(223,255,99,.13)") +
      card("SCHOOL", "Scale", "Bring your learning community together.", "school", "rgba(255,122,217,.13)");
    gatewaySection.parentNode.insertBefore(roleStrip, gatewaySection);

    var featureGrid = document.createElement("section");
    featureGrid.className = "de-feature-grid";
    featureGrid.setAttribute("aria-label", "Dream Education platform capabilities");
    featureGrid.innerHTML =
      '<article class="de-feature-card featured">' +
        '<span class="de-command-kicker">ADAPTIVE INTELLIGENCE</span>' +
        '<h3>The interface should understand the learner.</h3>' +
        '<p>Learning state, misconceptions, retention, transfer readiness and next-best actions can surface as clear decisions instead of buried analytics.</p>' +
        '<div class="de-feature-meter"><div><span>Learning signal</span><b>LIVE</b></div><i></i></div>' +
        '<div class="de-feature-icon" aria-hidden="true">✦</div>' +
      '</article>' +
      '<article class="de-feature-card"><span class="de-command-kicker">KNOWLEDGE</span><h3>Evidence</h3><p>Ground learning experiences in connected knowledge sources.</p><div class="de-feature-icon" aria-hidden="true">◌</div></article>' +
      '<article class="de-feature-card"><span class="de-command-kicker">PORTFOLIO</span><h3>Proof</h3><p>Turn learning activity into visible evidence of growth.</p><div class="de-feature-icon" aria-hidden="true">↗</div></article>';
    gatewaySection.parentNode.insertBefore(featureGrid, gatewaySection);\n\n    // The legacy gateway is intentionally hidden above; the new role cards are the\n    // single visible entry point for the same existing panel actions.\n    roleStrip.querySelectorAll("[data-action=\"open\"]").forEach(function (button) {\n      button.setAttribute("aria-label", button.textContent.trim() + " workspace");\n    });

    enableMagnetics();
  }

  function enableMagnetics() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var finePointer = window.matchMedia ? window.matchMedia("(pointer:fine)").matches : false;
    if (!finePointer) return;

    document.querySelectorAll(".de-magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (event) {
        var r = el.getBoundingClientRect();
        var x = (event.clientX - r.left) / r.width - 0.5;
        var y = (event.clientY - r.top) / r.height - 0.5;
        el.style.transform = "translate(" + (x * 5) + "px," + (y * 5) + "px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  }

  ready(function () {
    addStyle();
    inject();
  });
})();