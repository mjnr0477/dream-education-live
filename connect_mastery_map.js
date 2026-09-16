const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const marker = `if (intelligence.success) {`;

const start = html.indexOf(marker);

if (start === -1) {
  throw new Error("Intelligence success block not found.");
}

const topicMarker = `const recommendation =
        intelligence.recommendation || {};`;

const topicStart = html.indexOf(topicMarker, start);

if (topicStart === -1) {
  throw new Error("Recommendation block not found.");
}

const recommendationEnd = html.indexOf(
  `    }`,
  topicStart
);

if (recommendationEnd === -1) {
  throw new Error("Recommendation block boundary not found.");
}

const oldBlock =
  html.slice(topicStart, recommendationEnd + 5);

const newBlock = `const recommendation =
        intelligence.recommendation || {};

      const recommendationTitle =
        document.getElementById("recommendationTitle");

      const recommendationText =
        document.getElementById("recommendationText");

      if (recommendationTitle) {

        const action =
          recommendation.action || "learn";

        const titles = {
          assess: "Let's understand where you are",
          practice: "Strengthen your foundations",
          develop: "Keep developing your understanding",
          challenge: "You're ready for a challenge"
        };

        recommendationTitle.textContent =
          titles[action] ||
          "Keep building your understanding";

      }

      if (recommendationText) {

        recommendationText.textContent =
          recommendation.message ||
          "Keep learning and building your understanding.";

      }

      /*
        TOPIC MASTERY MAP

        topic_performance is already calculated
        by the learner intelligence engine.
      */

      const topicMastery =
        document.getElementById("topicMastery");

      if (topicMastery) {

        topicMastery.innerHTML = "";

        const topics =
          intelligence.topic_performance || {};

        const topicEntries =
          Object.entries(topics);

        if (topicEntries.length === 0) {

          topicMastery.innerHTML =
            '<div class="mastery-empty">' +
            'Complete a few learning questions to build your mastery map.' +
            '</div>';

        } else {

          topicEntries.forEach(
            ([topic, performance]) => {

              const score =
                Number(
                  performance.average_score ??
                  performance.average ??
                  performance.score ??
                  0
                );

              let status =
                "Needs practice";

              if (score >= 80) {
                status = "Strong";
              } else if (score >= 50) {
                status = "Developing";
              }

              const item =
                document.createElement("div");

              item.className =
                "mastery-item";

              const top =
                document.createElement("div");

              top.className =
                "mastery-top";

              const name =
                document.createElement("strong");

              name.textContent =
                topic;

              const value =
                document.createElement("span");

              value.textContent =
                Math.round(score) + "%";

              top.appendChild(name);
              top.appendChild(value);

              const track =
                document.createElement("div");

              track.className =
                "mastery-track";

              const bar =
                document.createElement("div");

              bar.className =
                "mastery-bar";

              bar.style.width =
                Math.max(0, Math.min(100, score)) + "%";

              track.appendChild(bar);

              const statusText =
                document.createElement("small");

              statusText.textContent =
                status;

              item.appendChild(top);
              item.appendChild(track);
              item.appendChild(statusText);

              topicMastery.appendChild(item);

            }
          );

        }

      }`;

html = html.replace(
  oldBlock,
  newBlock
);

fs.writeFileSync(file, html);

console.log("Mastery map connected to learner intelligence.");
