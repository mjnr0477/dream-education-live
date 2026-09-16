const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const oldBlock = `<div id="learningRecommendation" class="recommendation"></div>`;

if (!html.includes(oldBlock)) {
  throw new Error("Learning recommendation element not found.");
}

const newBlock = `<div
        id="learningRecommendation"
        class="recommendation dashboard-recommendation"
      >
        <div class="recommendation-content">
          <strong id="recommendationTitle">Keep building your understanding</strong>
          <p id="recommendationText">
            Your next learning step will appear here.
          </p>
        </div>

        <button
          id="recommendationButton"
          class="recommendation-action"
          onclick="continueFromDashboard()"
        >
          Continue →
        </button>
      </div>`;

html = html.replace(oldBlock, newBlock);

fs.writeFileSync(file, html);

console.log("Dashboard recommendation updated.");
