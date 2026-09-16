const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const startMarker = `<header class="header">`;
const endMarker = `</header>`;

const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  throw new Error("Header section not found.");
}

const newHeader = `<header class="header">
  <div class="header-inner">

    <div class="brand">
      <div class="brand-mark">D</div>

      <div class="brand-text">
        <strong>Dream Education</strong>
        <span>Learn. Understand. Grow.</span>
      </div>
    </div>

    <div class="header-pill">
      <span class="status-dot"></span>
      Your learning journey
    </div>

  </div>
</header>`;

html =
  html.slice(0, start) +
  newHeader +
  html.slice(end + endMarker.length);

const welcomeStart = html.indexOf(`<section class="welcome">`);

if (welcomeStart !== -1) {
  const welcomeEnd = html.indexOf(`</section>`, welcomeStart);

  if (welcomeEnd === -1) {
    throw new Error("Welcome section is incomplete.");
  }

  const newWelcome = `<section class="welcome">

    <div class="hero-glow"></div>

    <div class="welcome-badge">
      THE WAY YOU LEARN MATTERS
    </div>

    <h2>
      Don't just get the answer.
      <span>Understand it.</span>
    </h2>

    <p>
      Dream Education helps you learn step by step, discover what you understand,
      and build from what you already know.
    </p>

    <div class="learning-path">

      <div class="path-item">
        <div class="path-number">01</div>
        <div>
          <strong>Learn</strong>
          <span>Explore the idea</span>
        </div>
      </div>

      <div class="path-line"></div>

      <div class="path-item">
        <div class="path-number">02</div>
        <div>
          <strong>Think</strong>
          <span>Explain it yourself</span>
        </div>
      </div>

      <div class="path-line"></div>

      <div class="path-item">
        <div class="path-number">03</div>
        <div>
          <strong>Grow</strong>
          <span>Take the next step</span>
        </div>
      </div>

    </div>

  </section>`;

  html =
    html.slice(0, welcomeStart) +
    newWelcome +
    html.slice(welcomeEnd + `</section>`.length);
}

fs.writeFileSync(file, html);

console.log("Top UI updated.");
