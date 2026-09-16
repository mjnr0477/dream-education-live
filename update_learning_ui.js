const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const startMarker = `<!-- ADAPTIVE LEARNING -->`;
const start = html.indexOf(startMarker);

if (start === -1) {
  throw new Error("Adaptive learning section not found.");
}

const sectionStart = html.indexOf(`<section id="learningCard"`, start);
const sectionEnd = html.indexOf(`</section>`, sectionStart);

if (sectionStart === -1 || sectionEnd === -1) {
  throw new Error("Learning card boundaries not found.");
}

const oldSection = html.slice(sectionStart, sectionEnd + `</section>`.length);

const newSection = `<section id="learningCard" class="card learning-session hidden">

    <div class="learning-step">
      <span class="step-number">02</span>
      <span>THINK</span>
    </div>

    <h2>Now show what you understand</h2>

    <p class="learning-prompt">
      There is no need to use complicated words. Explain the idea in your own words.
    </p>

    <div class="question-box">
      <div class="question-label">YOUR CHALLENGE</div>
      <div id="nextQuestion" class="question"></div>
    </div>

    <div class="answer-area">
      <label for="learnerAnswer">Your explanation</label>

      <textarea
        id="learnerAnswer"
        placeholder="Write what you understand here..."
      ></textarea>

      <div class="answer-hint">
        <span>💭</span>
        <span>Think first. Then explain.</span>
      </div>
    </div>

    <button id="submitAnswerButton" class="primary learning-submit" onclick="submitLearningAnswer()">
      Check My Understanding →
    </button>

  </section>`;

html = html.replace(oldSection, newSection);

fs.writeFileSync(file, html);

console.log("Learning experience updated.");
