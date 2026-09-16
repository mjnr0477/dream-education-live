const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const startMarker = `<!-- ASSESSMENT -->`;
const start = html.indexOf(startMarker);

if (start === -1) {
  throw new Error("Assessment section not found.");
}

const sectionStart = html.indexOf(`<section id="assessmentCard"`, start);
const sectionEnd = html.indexOf(`</section>`, sectionStart);

if (sectionStart === -1 || sectionEnd === -1) {
  throw new Error("Assessment card boundaries not found.");
}

const oldSection = html.slice(sectionStart, sectionEnd + `</section>`.length);

const newSection = `<section id="assessmentCard" class="card assessment-card hidden">

    <div class="learning-step">
      <span class="step-number">03</span>
      <span>UNDERSTAND</span>
    </div>

    <div class="result-heading">
      <div class="result-icon">✦</div>

      <div>
        <h2 id="understandingTitle">Let's see what you understand</h2>
        <p id="understandingSubtitle">
          Your answer helps Dream Education decide what you should learn next.
        </p>
      </div>
    </div>

    <div class="score-row">

      <div class="score-box">
        <span id="score">0</span>
        <small>Understanding score</small>
      </div>

      <div class="understanding-box">
        <span id="understanding">-</span>
        <small>Current understanding</small>
      </div>

    </div>

    <div class="feedback-box">
      <h3>What I noticed</h3>
      <p id="feedback"></p>
    </div>

    <div class="learning-details">

      <div class="learning-detail">
        <strong>✓ What you did well</strong>
        <p id="strengths"></p>
      </div>

      <div class="learning-detail">
        <strong>↗ What to improve</strong>
        <p id="gaps"></p>
      </div>

      <div class="learning-detail">
        <strong>💡 Important idea</strong>
        <p id="misconceptions"></p>
      </div>

    </div>

    <div class="teaching-box">

      <div class="next-step-label">YOUR NEXT STEP</div>

      <p id="teachingExplanation"></p>

      <div class="next-question-box">
        <strong>Next challenge</strong>
        <p id="adaptiveQuestion"></p>
      </div>

    </div>

    <button id="continueButton" class="primary" onclick="continueLearning()">
      Continue Learning →
    </button>

  </section>`;

html = html.replace(oldSection, newSection);

fs.writeFileSync(file, html);

console.log("Assessment UI updated.");
