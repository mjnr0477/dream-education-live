(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function injectCompactLanding() {
    var hero = document.querySelector(".hero");
    var content = hero && hero.querySelector(".hero-content");
    var search = document.querySelector(".dream-search-section");
    var searchShell = search && search.querySelector(".dream-search-shell");
    if (!hero || !content || hero.dataset.compactReady === "1") return;
    hero.dataset.compactReady = "1";
    document.body.classList.add("de-compact-landing");
    hero.classList.add("de-compact-hero");

    // Put the existing, wired Dream Search UI inside the hero so the landing is one screen.
    if (searchShell) {
      searchShell.classList.add("de-compact-search");
      content.appendChild(searchShell);
      search.remove();
    }

    // One compact navigation grid keeps every primary destination accessible without duplicate legacy sections.
    var destinations = document.createElement("nav");
    destinations.className = "de-landing-destinations";
    destinations.setAttribute("aria-label", "Dream Education destinations");
    destinations.innerHTML =
      '<button type="button" data-action="open" data-panel="learn"><small>01 · LEARNER</small><strong>Learn</strong><span>Adaptive learning →</span></button>' +
      '<button type="button" data-action="open" data-panel="teach"><small>02 · EDUCATOR</small><strong>Teach</strong><span>Teaching tools →</span></button>' +
      '<button type="button" data-action="open" data-panel="connect"><small>03 · COMMUNITY</small><strong>Connect</strong><span>Parents & meetings →</span></button>' +
      '<button type="button" data-action="open" data-panel="tools"><small>04 · INTELLIGENCE</small><strong>AI Lab</strong><span>Create & explore →</span></button>' +
      '<button type="button" data-action="open" data-panel="school"><small>05 · INSTITUTIONS</small><strong>School</strong><span>School workspace →</span></button>' +
      '<button type="button" data-action="open" data-panel="about"><small>06 · THE IDEA</small><strong>About Dream</strong><span>Our approach →</span></button>';
    content.appendChild(destinations);

    // The compact page supersedes the old long-form landing sections; workspaces stay in the shared panel.
    document.querySelectorAll(".gateway-section, .statement-section, .cta-section, .landing-subscribe, .footer").forEach(function (node) {
      node.remove();
    });
    var floating = hero.querySelectorAll(".floating-card, .scroll-hint");
    floating.forEach(function (node) { node.remove(); });

    var command = content.querySelector(".de-hero-command");
    if (command) command.remove();
    document.querySelectorAll(".de-role-strip, .de-feature-grid").forEach(function (node) { node.remove(); });
  }

  ready(injectCompactLanding);
})();