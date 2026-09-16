const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const start = s.indexOf("    // Subject activity");
const end = s.indexOf("    /*\n      TOPIC SELECTION", start);

if (start === -1 || end === -1) {
  throw new Error("Could not find intelligence profile section.");
}

const replacement = `    /*
      LEARNING PROFILE

      The profile engine describes the learner's
      current learning state.
    */

    const profile = buildLearningProfile({
      learner,
      history: learningHistory,
      assessments: assessmentResults
    });

    const {
      overall,
      subjects: subjectPerformance,
      topics: topicPerformance
    } = profile;

    const averageScore = overall.average_score;
    const difficulty = overall.difficulty;
    const strongestSubject = overall.strongest_subject;
    const weakestSubject = overall.weakest_subject;

`;

s = s.slice(0, start) + replacement + s.slice(end);

const oldResponse = `      learning_profile: {
        total_questions: learningHistory.length,
        total_assessments: assessmentResults.length,
        average_score: averageScore,
        difficulty,
        strongest_subject: strongestSubject,
        weakest_subject: weakestSubject
      },`;

const newResponse = `      learning_profile: profile.overall,`;

if (!s.includes(oldResponse)) {
  throw new Error("Could not find old learning_profile response.");
}

s = s.replace(oldResponse, newResponse);

fs.writeFileSync(file, s);

console.log("Profile integration applied successfully.");
