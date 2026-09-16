const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const oldBlock = `document.getElementById(
        "learningRecommendation"
      ).textContent =
        recommendation.message ||
        "Keep learning and building your understanding.";`;

const newBlock = `const recommendationTitle =
        document.getElementById("recommendationTitle");

      const recommendationText =
        document.getElementById("recommendationText");

      const recommendationButton =
        document.getElementById("recommendationButton");

      if (recommendationTitle) {
        recommendationTitle.textContent =
          recommendation.title ||
          "Keep building your understanding";
      }

      if (recommendationText) {
        recommendationText.textContent =
          recommendation.message ||
          "Your next learning step will appear here.";
      }

      if (recommendationButton) {
        recommendationButton.textContent =
          "Continue →";
      }`;

if (!html.includes(oldBlock)) {
  throw new Error("Old recommendation block not found.");
}

html = html.replace(oldBlock, newBlock);

fs.writeFileSync(file, html);

console.log("Dashboard logic connected.");
