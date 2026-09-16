const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const anchor = "    // Determine learning recommendation";

if (!code.includes(anchor)) {
  console.error("ERROR: Recommendation anchor not found.");
  process.exit(1);
}

if (code.includes("const nextTopicSelection = selectNextTopic(topicPerformance);")) {
  console.log("Topic selector is already connected.");
  process.exit(0);
}

const insertion = `    /*
      TOPIC SELECTION

      Decide which topic currently deserves
      the learner's attention.
    */

    const nextTopicSelection =
      selectNextTopic(topicPerformance);

    console.log("NEXT TOPIC SELECTION:", nextTopicSelection);

`;

code = code.replace(
  anchor,
  insertion + anchor
);

const responseAnchor =
  "      topic_performance: topicPerformance,";

if (!code.includes(responseAnchor)) {
  console.error("ERROR: topic_performance response field not found.");
  process.exit(1);
}

code = code.replace(
  responseAnchor,
  `${responseAnchor}

      next_topic: nextTopicSelection,`
);

fs.writeFileSync(file, code);

console.log("Topic selector connected successfully.");
