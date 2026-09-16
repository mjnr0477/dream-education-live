const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const marker = `<div class="dashboard-section">

        <div class="dashboard-section-title">
          <span>SUBJECTS</span>
        </div>`;

if (!html.includes(marker)) {
  throw new Error("Subjects dashboard section not found.");
}

const masterySection = `<div class="dashboard-section">

        <div class="dashboard-section-title">
          <span>MASTERY MAP</span>
        </div>

        <div id="topicMastery" class="topic-mastery">

          <div class="mastery-empty">
            Complete a few learning questions to build your mastery map.
          </div>

        </div>

      </div>

      `;

html = html.replace(
  marker,
  masterySection + marker
);

fs.writeFileSync(file, html);

console.log("Mastery map added.");
