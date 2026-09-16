const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const startMarker = `<!-- PROGRESS -->`;
const start = html.indexOf(startMarker);

if (start === -1) {
  throw new Error("Progress marker not found.");
}

const sectionStart = html.indexOf(`<section class="card">`, start);
const sectionEnd = html.indexOf(`</section>`, sectionStart);

if (sectionStart === -1 || sectionEnd === -1) {
  throw new Error("Progress section boundaries not found.");
}

const oldSection =
  html.slice(sectionStart, sectionEnd + `</section>`.length);

const newSection = `<section class="card dashboard-card">

    <div class="dashboard-heading">

      <div>
        <div class="section-label">YOUR JOURNEY</div>
        <h2>Your Learning</h2>
        <p class="muted">
          See how your understanding is developing over time.
        </p>
      </div>

      <button class="dashboard-refresh" onclick="loadProgress()">
        ↻
      </button>

    </div>

    <div id="progress" class="hidden">

      <div class="learning-summary">
        <div class="summary-icon">✦</div>

        <div>
          <strong>Your learning is building</strong>
          <p>
            Every question helps Dream Education understand what you know
            and what you should work on next.
          </p>
        </div>
      </div>

      <div class="stats">

        <div class="stat">
          <span>Questions</span>
          <strong id="totalQuestions">0</strong>
        </div>

        <div class="stat">
          <span>Subjects</span>
          <strong id="subjectCount">0</strong>
        </div>

        <div class="stat">
          <span>Average understanding</span>
          <strong id="averageScore">0%</strong>
        </div>

        <div class="stat">
          <span>Current level</span>
          <strong id="learningDifficulty">-</strong>
        </div>

      </div>

      <div class="dashboard-section">

        <div class="dashboard-section-title">
          <span>YOUR NEXT STEP</span>
        </div>

        <div id="learningRecommendation" class="recommendation"></div>

      </div>

      <div class="dashboard-section">

        <div class="dashboard-section-title">
          <span>SUBJECTS</span>
        </div>

        <div id="subjects"></div>

      </div>

      <div class="dashboard-section">

        <div class="dashboard-section-title">
          <span>RECENT LEARNING</span>
        </div>

        <div id="recentLearning"></div>

      </div>

    </div>

  </section>`;

html = html.replace(oldSection, newSection);

fs.writeFileSync(file, html);

console.log("Learning dashboard updated.");
