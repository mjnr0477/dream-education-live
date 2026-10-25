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

    assert.deepEqual(errors, [], "Browser interaction must not produce uncaught JavaScript errors: " + errors.join(" | "));
    console.log("Browser UI click-through smoke test passed: desktop navigation, About tour, Books, sign-in, registration, learner CTA, Meetings, General Connections, and mobile drawer.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
