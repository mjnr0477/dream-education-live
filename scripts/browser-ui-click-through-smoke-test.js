"use strict";

const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    page.on("pageerror", error => errors.push(error.message));

    // Keep workspace rendering deterministic without contacting live user data.
    await page.route("**/api/product/meetings", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, upcoming: [], past: [] })
    }));
    await page.route("**/api/product/connections*", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, connections: [] })
    }));

    const response = await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    assert(response && response.ok(), "Homepage must load successfully");
    await page.locator("#experience-panel").waitFor({ state: "attached" });

    const manifestResponse = await page.request.get(baseUrl + "/manifest.webmanifest");
    assert(manifestResponse.ok(), "PWA manifest must be served successfully");
    const manifest = await manifestResponse.json();
    assert.equal(manifest.display, "standalone", "Installed Dream Education should open as a standalone app");
    assert(manifest.icons.some(icon => icon.sizes === "192x192"), "PWA manifest must offer a 192px icon");
    assert(manifest.icons.some(icon => icon.sizes === "512x512" && String(icon.purpose || "").includes("maskable")), "PWA manifest must offer a maskable 512px icon");
    for (const iconPath of [...new Set(manifest.icons.map(icon => icon.src))]) {
      const iconResponse = await page.request.get(baseUrl + iconPath);
      assert(iconResponse.ok(), "PWA install icon must load: " + iconPath);
      assert.match(iconResponse.headers()["content-type"] || "", /image\/png/i, "PWA icon should be served as PNG: " + iconPath);
    }
    const faviconResponse = await page.request.get(baseUrl + "/icons/favicon.svg");
    assert(faviconResponse.ok(), "Dream Education SVG favicon must load");
    const appleIconResponse = await page.request.get(baseUrl + "/icons/apple-touch-icon.png");
    assert(appleIconResponse.ok(), "Apple touch icon must load");

    assert(await page.locator('.nav-right [data-dream-install]').isHidden(), "Install action must remain hidden until a browser supports installation");
    const installEventWasPrevented = await page.evaluate(() => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = async () => { window.__dreamInstallPromptCalled = true; };
      event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(installEventWasPrevented, true, "Dream Education should defer the native install prompt until the learner taps");
    await page.locator('.nav-right [data-dream-install]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('.nav-right [data-dream-install]').click();
    await page.waitForFunction(() => window.__dreamInstallPromptCalled === true);
    await page.waitForFunction(() => Array.from(document.querySelectorAll("[data-dream-install]")).every(button => button.hidden));


    async function closePanel() {
      const close = page.locator(".experience-panel .panel-close");
      if (await close.isVisible()) await close.click();
      await page.waitForFunction(() => !document.body.classList.contains("panel-open"));
    }

    async function openPanel(selector, expectedTitle) {
      const trigger = page.locator(selector).first();
      await trigger.waitFor({ state: "visible", timeout: 10000 });
      await trigger.click();
      await page.waitForFunction(() => document.body.classList.contains("panel-open"));
      const title = (await page.locator("#panel-title").innerText()).trim();
      assert.equal(title, expectedTitle, selector + " should open the expected panel");
      return title;
    }

    async function waitForConnectWorkspace(actionLabel, expectedTitle) {
      await page.waitForFunction(({ label, title }) => {
        const body = document.querySelector("#panel-body");
        const panelTitle = document.querySelector("#panel-title");
        if (!body || !panelTitle) return false;
        const actionStillVisible = Array.from(body.querySelectorAll("button"))
          .some(button => button.textContent.trim() === label);
        return !actionStillVisible && panelTitle.textContent.trim() === title;
      }, { label: actionLabel, title: expectedTitle }, { timeout: 10000 });
      assert(await page.locator("body").evaluate(el => el.classList.contains("panel-open")),
        actionLabel + " must keep a visible workspace/panel");
    }

    await openPanel('.nav-center [data-panel="explore"]', "More than learning.");
    assert((await page.locator("#panel-body").innerText()).length > 0, "Explore panel must render content");
    await closePanel();

    // Verify every primary destination card opens its intended working panel.
    for (const [panelName, expectedTitle] of [
      ["learn", "Start learning."],
      ["teach", "Teach with purpose."],
      ["school", "Education, together."],
      ["tools", "Powerful tools."],
      ["connect", "Stay connected."],
      ["about", "Why Dream?"]
    ]) {
      await openPanel('.dream-destination-card[data-panel="' + panelName + '"]', expectedTitle);
      assert((await page.locator("#panel-body").innerText()).trim().length > 0,
        "Landing destination " + panelName + " must render useful content");
      await closePanel();
    }

    // Verify the pricing CTA opens real plan choices without starting a payment.
    await page.locator('.de-subscribe-cta[data-panel-action="subscription"]').click();
    await page.waitForFunction(() =>
      document.body.classList.contains("panel-open") &&
      document.querySelector("#panel-title")?.textContent.trim() === "Subscription"
    );
    assert(await page.locator('[data-subscription-plan="daily"]').isVisible(), "View plans must show the daily plan");
    assert(await page.locator('[data-subscription-plan="monthly"]').isVisible(), "View plans must show the monthly plan");
    assert(await page.locator('[data-payment-method="paypal"]').isVisible(), "Subscription checkout must offer PayPal");
    await closePanel();

    await openPanel('.nav-center [data-panel="about"]', "Why Dream?");
    assert(await page.locator("[data-about-workspace]").count() >= 5, "About tour buttons should render");
    await closePanel();

    await openPanel('.nav-center [data-panel="books"]', "Discover your next read.");
    assert((await page.locator("#panel-body").innerText()).length > 0, "Books panel must render content");
    await closePanel();

    await openPanel('.nav-right [data-panel="signin"]', "Sign in.");
    assert(await page.locator('[data-auth-form="login"]').isVisible(), "Sign in button must open the login form");
    await closePanel();

    await openPanel('.nav-right [data-panel="join"]', "Get started.");
    assert(await page.locator('[data-auth-form="register"]').isVisible(), "Get started button must open registration");
    await closePanel();

    await openPanel('.hero-primary[data-panel="learn"]', "Start learning.");
    await page.locator('[data-panel-action="primary"]').click();
    await page.waitForFunction(() => document.body.classList.contains("panel-open"));
    assert(await page.locator('[data-auth-form="login"]').isVisible(), "Logged-out learner CTA must route to sign in, not a dead end");
    await closePanel();

    await openPanel('[data-panel="connect"]', "Stay connected.");
    assert(await page.getByRole("button", { name: "Open Meetings", exact: true }).isVisible(), "Connect must expose Open Meetings");
    assert(await page.getByRole("button", { name: "Open General Connections", exact: true }).isVisible(), "Connect must expose Open General Connections");
    await page.getByRole("button", { name: "Open Meetings", exact: true }).click();
    await waitForConnectWorkspace("Open Meetings", "Meetings");
    assert(!/Meetings unavailable/i.test(await page.locator("#panel-title").innerText()), "Open Meetings must not fall back to unavailable state");
    await page.locator("#meeting-title").waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("#create-meeting-button").isVisible(), "Meetings workspace must render its create-meeting action");

    await closePanel();
    await openPanel('[data-panel="connect"]', "Stay connected.");
    await page.getByRole("button", { name: "Open General Connections", exact: true }).click();
    await waitForConnectWorkspace("Open General Connections", "General Connections");
    assert(!/General Connections unavailable/i.test(await page.locator("#panel-title").innerText()), "General Connections must not fall back to unavailable state");
    assert(await page.locator("#general-connection-search-form").isVisible(), "General Connections must render the people-search form");
    assert(await page.locator("#general-connection-search").isVisible(), "General Connections must render the search input");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobile.on("pageerror", error => errors.push(error.message));
    await mobile.route("**/api/product/meetings", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, upcoming: [], past: [] })
    }));
    await mobile.route("**/api/product/connections*", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, connections: [] })
    }));
    const mobileResponse = await mobile.goto(baseUrl + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    assert(mobileResponse && mobileResponse.ok(), "Mobile homepage must load");
    await mobile.locator(".mobile-menu").click();
    await mobile.waitForFunction(() => document.body.classList.contains("menu-open"));
    assert.equal(await mobile.locator(".mobile-menu").getAttribute("aria-expanded"), "true", "Mobile menu must expose expanded state");
    await mobile.locator('#mobile-drawer [data-panel="about"]').click();
    await mobile.waitForFunction(() => document.body.classList.contains("panel-open"));
    assert.equal(await mobile.locator("#panel-title").innerText(), "Why Dream?", "Mobile drawer navigation must open the selected destination");
    assert(!await mobile.locator("body").evaluate(el => el.classList.contains("menu-open")), "Choosing a mobile destination must close the drawer");

    await mobile.locator(".experience-panel .panel-close").click();
    await mobile.waitForFunction(() => !document.body.classList.contains("panel-open"));
    await mobile.locator(".mobile-menu").click();
    await mobile.waitForFunction(() => document.body.classList.contains("menu-open"));
    await mobile.locator('#mobile-drawer [data-panel="connect"]').click();
    await mobile.waitForFunction(() => document.body.classList.contains("panel-open"));
    assert.equal((await mobile.locator("#panel-title").innerText()).trim(), "Stay connected.", "Mobile Connect navigation must open its panel");
    await mobile.getByRole("button", { name: "Open General Connections", exact: true }).click();
    await mobile.waitForFunction(() => document.querySelector("#panel-title")?.textContent.trim() === "General Connections");
    assert(await mobile.locator("#general-connection-search-form").isVisible(), "Mobile General Connections must render its search form");

    async function openMobileDestination(panelName, expectedTitle) {
      await mobile.locator(".experience-panel .panel-close").click();
      await mobile.waitForFunction(() => !document.body.classList.contains("panel-open"));
      await mobile.locator(".mobile-menu").click();
      await mobile.waitForFunction(() => document.body.classList.contains("menu-open"));
      await mobile.locator('#mobile-drawer [data-panel="' + panelName + '"]').click();
      await mobile.waitForFunction(() => document.body.classList.contains("panel-open"));
      assert.equal((await mobile.locator("#panel-title").innerText()).trim(), expectedTitle,
        "Mobile drawer " + panelName + " destination must open the expected panel");
    }

    await openMobileDestination("explore", "More than learning.");
    assert((await mobile.locator("#panel-body").innerText()).length > 0, "Mobile Explore must render content");
    await openMobileDestination("books", "Discover your next read.");
    assert((await mobile.locator("#panel-body").innerText()).length > 0, "Mobile Books must render content");
    await openMobileDestination("signin", "Sign in.");
    assert(await mobile.locator('[data-auth-form="login"]').isVisible(), "Mobile Sign in must render the login form");
    await openMobileDestination("join", "Get started.");
    assert(await mobile.locator('[data-auth-form="register"]').isVisible(), "Mobile Get started must render registration");

    // Exercise the on-device study-notes workflow with synthetic learner data only.
    const notesPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    notesPage.on("pageerror", error => errors.push(error.message));
    await notesPage.addInitScript(() => {
      localStorage.setItem("dream_education_auth", JSON.stringify({
        success: true,
        role: "learner",
        account: { role: "learner", learner_id: "browser-smoke-learner", email: "smoke@example.test" },
        profile: { learner_id: "browser-smoke-learner", name: "Smoke learner", level: "Grade 8" },
        session: { access_token: "browser-smoke-token" }
      }));
    });
    await notesPage.route("**/api/v1/learning/notes", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        topic: "Fractions",
        subject: "Mathematics",
        level: "Grade 8",
        notes_type: "Detailed notes",
        notes: "# Fractions\\n\\nFractions represent equal parts of a whole.\\n\\n## Equivalent fractions\\n\\n**Example:** 1/2 = 2/4.",
        sources: [{ title: "OpenStax Mathematics", url: "https://openstax.org/books/college-algebra/pages/1-1-real-numbers" }]
      })
    }));
    const notesResponse = await notesPage.goto(baseUrl + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    assert(notesResponse && notesResponse.ok(), "Authenticated smoke learner homepage must load");
    await notesPage.locator('.dream-mobile-nav [data-panel="learn"]').click();
    await notesPage.locator('[data-de-action="notes"]').waitFor({ state: "visible", timeout: 10000 });
    await notesPage.locator('[data-de-action="notes"]').click();
    await notesPage.locator("#de-notes-form").waitFor({ state: "visible" });
    await notesPage.locator("#de-notes-topic").fill("Fractions");
    await notesPage.locator("#de-notes-subject").fill("Mathematics");
    await notesPage.locator("#de-notes-level").fill("Grade 8");
    await notesPage.locator('#de-notes-form button[type="submit"]').click();
    await notesPage.locator("#de-notes-save-offline").waitFor({ state: "visible", timeout: 10000 });
    await notesPage.locator("#de-notes-save-offline").click();
    await notesPage.getByText("Saved offline ✓", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await notesPage.context().setOffline(true);
    await notesPage.locator("#dream-offline-status").waitFor({ state: "visible", timeout: 10000 });
    assert.match(await notesPage.locator("#dream-offline-status").innerText(), /Learn → Notes & Study Materials → My offline notes/,
      "Offline notice must show learners where saved notes are stored");
    await notesPage.locator("#de-offline-notes-open").click();
    await notesPage.getByRole("button", { name: "Open notes", exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await notesPage.getByRole("button", { name: "Open notes", exact: true }).click();
    assert((await notesPage.locator("#de-notes-result .de-notes-content").innerText()).includes("Fractions represent equal parts"),
      "A saved study note must remain readable after the browser goes offline");
    const offlineSource = notesPage.locator('#de-notes-result .de-section').filter({ hasText: "Evidence sources" }).locator("li").first();
    await offlineSource.waitFor({ state: "visible", timeout: 10000 });
    const offlineSourceLabel = await offlineSource.innerText();
    assert.match(offlineSourceLabel, /OpenStax Mathematics/);
    assert.match(offlineSourceLabel, /openstax.org/);
    assert.equal(await offlineSource.locator("a").count(), 0, "Evidence must remain an embedded source label, not a material link");
    await notesPage.locator('[data-offline-notes-back="list"]').click();
    await notesPage.getByRole("button", { name: "Delete", exact: true }).click();
    await notesPage.getByText("No offline notes saved yet", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await notesPage.context().setOffline(false);

    assert.deepEqual(errors, [], "Browser interaction must not produce uncaught JavaScript errors: " + errors.join(" | "));
    console.log("Browser UI click-through smoke test passed: desktop navigation, About tour, Books, sign-in, registration, learner CTA, Meetings, General Connections, and mobile drawer.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
