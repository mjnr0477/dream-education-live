require("dotenv").config();
const { analyzeConceptEvidence } = require("./concept_evidence_engine");
const { generateEvidenceTeaching } = require("./evidence_teaching_engine");
const { selectNextTopic } = require("./topic_selection_engine");
const { determineLearningState } = require("./learning_state_engine");
const { assessLearning } = require("./assessment_engine");

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const AI_MODE = process.env.AI_MODE || "live";

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const CACHE_FILE = path.join(__dirname, "data", "cache.json");

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      fs.writeFileSync(CACHE_FILE, "{}");
    }

    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch (error) {
    console.error("Cache read error:", error);
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify(cache, null, 2),
    "utf8"
  );
}

function createCacheKey(
  question,
  subject,
  level,
  adaptiveContext = {}
) {
  const normalized = [
    question.trim().toLowerCase(),
    (subject || "General").trim().toLowerCase(),
    (level || "General").trim().toLowerCase(),

    (adaptiveContext.teaching_move || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.teaching_target || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.mastery_status || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.trajectory || "none")
      .toString()
      .trim()
      .toLowerCase()
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
}
function developmentAnswer(
  question,
  subject,
  level,
  adaptiveContext = {}
) {
  const {
    teaching_move = null,
    teaching_target = null,
    teaching_explanation = null,
    mastery_status = null,
    average_score = null,
    trajectory = null,
    previous_score = null
  } = adaptiveContext;

  const topic = subject || "this topic";

  let lessonTitle =
    "Let's build your understanding";

  let lessonBody =
    `We are learning about ${topic}.\n\n` +
    `Your next step is based on what you have demonstrated so far.`;

  let learningFocus =
    "Build the foundation.";

  if (teaching_move === "correct_misconception") {

    lessonTitle =
      "Let's correct an important idea";

    lessonBody =
      `${teaching_explanation || "There is an important idea to correct."}\n\n` +
      `Question to examine: "${question}"\n\n` +
      `Do not worry about getting everything right immediately. ` +
      `The goal is to replace the incorrect idea with a more accurate one.`;

    learningFocus =
      `Correct the misconception about ${topic}.`;

  } else if (teaching_move === "teach_factor") {

    lessonTitle =
      "First, identify what matters";

    lessonBody =
      `Before we explain the whole situation, identify the main factor involved.\n\n` +
      `Question: "${question}"\n\n` +
      `Look for the condition, input, cause, or variable that is changing. ` +
      `That is the part we need to understand first.`;

    learningFocus =
      "Identify the important factor.";

  } else if (teaching_move === "teach_process") {

    lessonTitle =
      "Now understand how it works";

    lessonBody =
      `You identified an important factor. The next step is to understand the process connecting that factor to the change.\n\n` +
      `Question: "${question}"\n\n` +
      `Think about what happens between the factor changing and the final result.`;

    learningFocus =
      "Explain the process or mechanism.";

  } else if (teaching_move === "teach_outcome") {

    lessonTitle =
      "Connect the process to the result";

    lessonBody =
      `You have explained part of the process. Now connect it to the final outcome.\n\n` +
      `Question: "${question}"\n\n` +
      `Ask yourself: if the process changes, what happens as a result?`;

    learningFocus =
      "Explain the final outcome.";

  } else if (
    teaching_move === "develop_reasoning" ||
    teaching_move === "build_reasoning"
  ) {

    lessonTitle =
      "Let's strengthen your reasoning";

    lessonBody =
      `You have part of the idea. Now let's connect the pieces together.\n\n` +
      `Question: "${question}"\n\n` +
      `Try to explain the relationship between the important factor, the process, and the result.`;

    learningFocus =
      "Connect the important ideas into a complete explanation.";

  } else if (teaching_move === "progress") {

    lessonTitle =
      "You're ready to apply the idea";

    lessonBody =
      `You have demonstrated understanding of the main idea. Now let's see whether you can use it in a new situation.\n\n` +
      `Question: "${question}"\n\n` +
      `Focus on explaining your reasoning, not just giving an answer.`;

    learningFocus =
      "Apply your understanding to a new situation.";

  } else if (teaching_move === "challenge") {

    lessonTitle =
      "Ready for a challenge";

    lessonBody =
      `You have demonstrated consistent understanding. Now we will test whether you can transfer that knowledge to a less familiar situation.\n\n` +
      `Question: "${question}"\n\n` +
      `Explain how you reached your conclusion and connect it to what you already know.`;

    learningFocus =
      "Transfer your understanding to a new situation.";

  } else {

    lessonTitle =
      "Let's build the foundation";

    lessonBody =
      `We'll start with the basic idea and build from there.\n\n` +
      `Question: "${question}"\n\n` +
      `Think about what you already know before trying to explain it.`;

    learningFocus =
      "Understand the basic idea.";

  }

  return `Dream Education — Development Teacher

Subject: ${subject || "General"}
Level: ${level || "General"}

${lessonTitle}

${lessonBody}

Learning focus:
${learningFocus}

Learning state:
Teaching move: ${teaching_move || "foundation"}
Target: ${teaching_target || "foundation"}
Mastery: ${mastery_status || "not_started"}
Average understanding: ${average_score ?? "not available"}%
Trajectory: ${trajectory || "first attempt"}
Previous score: ${previous_score ?? "not available"}

Next:
Explain what you understand from this lesson in your own words.`;
}
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    app: "Dream Education",
    cache: "enabled",
    supabase: "enabled",
    ai_mode: AI_MODE,
    learning_history: "enabled"
  });
});

app.post("/api/learn", async (req, res) => {
  console.log("=== LEARN REQUEST START ===");

  try {
    const {
      question,
      subject,
      level,
      learner_id,
      learner_name,
      teaching_move,
      teaching_target,
      teaching_explanation,
      mastery_status,
      average_score,
      trajectory,
      previous_score
    } = req.body;

    console.log("1. Request received");

    if (!question || !question.trim()) {
      console.log("2. Question missing");
      return res.status(400).json({
        success: false,
        message: "Please enter a question."
      });
    }

    console.log("2. Question received");

    const cache = loadCache();
    console.log("3. Cache loaded");

    const cacheKey = createCacheKey(
      question,
      subject,
      level,
      {
        teaching_move,
        teaching_target,
        mastery_status,
        trajectory
      }
    );
    console.log("4. Cache key created");

    let answer;
    let cached = false;

    if (cache[cacheKey]) {
      console.log("5. CACHE HIT");
      answer = cache[cacheKey].answer;
      cached = true;
    } else {
      console.log("5. CACHE MISS");

      if (AI_MODE === "development") {
        console.log("6. DEVELOPMENT MODE");

        answer = developmentAnswer(
          question,
          subject,
          level,
          {
            teaching_move,
            teaching_target,
            teaching_explanation,
            mastery_status,
            average_score,
            trajectory,
            previous_score
          }
        );

        console.log("7. Development answer created");
      } else {
        console.log("6. LIVE MODE");

        const prompt = `
You are Dream Education, an adaptive learning assistant.

Learner level: ${level || "General"}
Subject: ${subject || "General"}

Help the learner understand the following question:
${question}
`;

        const response = await client.responses.create({
          model: process.env.AI_MODEL || "gpt-5",
          input: prompt
        });

        answer = response.output_text;

        console.log("7. AI answer created");
      }

      cache[cacheKey] = {
        question,
        subject: subject || "General",
        level: level || "General",
        answer,
        createdAt: new Date().toISOString()
      };

      saveCache(cache);
      console.log("8. Answer cached");
    }

    if (learner_id) {
      console.log("9. Saving learner");

      const { error: learnerError } = await supabase
        .from("dream_learners")
        .upsert(
          {
            learner_id,
            name: learner_name || null,
            level: level || null
          },
          { onConflict: "learner_id" }
        );

      if (learnerError) {
        console.error("LEARNER SAVE ERROR:", learnerError);
      } else {
        console.log("10. Learner saved");
      }

      console.log("11. Saving learning history");

      const { error: historyError } = await supabase
        .from("learning_history")
        .insert([{
          learner_id,
          question,
          subject: subject || "General",
          level: level || "General",
          answer,
          cached
        }]);

      if (historyError) {
        console.error("HISTORY SAVE ERROR:", historyError);
      } else {
        console.log("12. Learning history saved");
      }
    }

    console.log("13. Sending successful response");

    return res.json({
      success: true,
      answer,
      cached,
      ai_mode: AI_MODE,
      saved_to_supabase: !!learner_id,
      learning_history_saved: !!learner_id
    });

  } catch (error) {
    console.error("=== LEARNING ERROR ===");
    console.error(error);
    console.error("=== END LEARNING ERROR ===");

    return res.status(500).json({
      success: false,
      message: "Dream Education could not complete the lesson.",
      debug: error.message
    });
  }
});

app.get("/api/progress/:learner_id", async (req, res) => {
  try {
    const learnerId = req.params.learner_id;

    if (!learnerId) {
      return res.status(400).json({
        success: false,
        message: "Learner ID is required."
      });
    }

    const { data, error } = await supabase
      .from("learning_history")
      .select("question, subject, level, cached, created_at")
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("PROGRESS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load learner progress."
      });
    }

    const history = data || [];

    const subjects = {};

    history.forEach(item => {
      const subject = item.subject || "General";

      if (!subjects[subject]) {
        subjects[subject] = 0;
      }

      subjects[subject]++;
    });

    res.json({
      success: true,
      learner_id: learnerId,
      total_questions: history.length,
      subjects,
      recent_learning: history.slice(0, 10)
    });

  } catch (error) {
    console.error("PROGRESS ROUTE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Dream Education could not load progress."
    });
  }
});

app.get("/api/profile/:learner_id", async (req, res) => {
  try {
    const learnerId = req.params.learner_id;

    if (!learnerId) {
      return res.status(400).json({
        success: false,
        message: "Learner ID is required."
      });
    }

    console.log("PROFILE: Loading learner", learnerId);

    const { data: learner, error: learnerError } = await supabase
      .from("dream_learners")
      .select("learner_id, name, level, created_at")
      .eq("learner_id", learnerId)
      .maybeSingle();

    if (learnerError) {
      console.error("PROFILE LEARNER ERROR:", learnerError);

      return res.status(500).json({
        success: false,
        message: "Could not load learner profile."
      });
    }

    const { data: history, error: historyError } = await supabase
      .from("learning_history")
      .select("question, subject, topic, level, created_at")
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false });

    if (historyError) {
      console.error("PROFILE HISTORY ERROR:", historyError);

      return res.status(500).json({
        success: false,
        message: "Could not load learning history."
      });
    }

    const learningHistory = history || [];

    const subjectCounts = {};

    learningHistory.forEach(item => {
      const subject = item.subject || "General";

      subjectCounts[subject] =
        (subjectCounts[subject] || 0) + 1;
    });

    let strongestSubject = null;
    let strongestCount = 0;

    Object.entries(subjectCounts).forEach(
      ([subject, count]) => {
        if (count > strongestCount) {
          strongestSubject = subject;
          strongestCount = count;
        }
      }
    );

    let recommendation;

    if (learningHistory.length === 0) {
      recommendation = {
        subject: "General",
        reason: "Start with your first question.",
        message: "Ask Dream Education anything you want to understand."
      };
    } else if (strongestSubject) {
      recommendation = {
        subject: strongestSubject,
        reason: "This is currently your most studied subject.",
        message:
          `Continue building your understanding of ${strongestSubject}.`
      };
    }

    res.json({
      success: true,

      learner: learner || {
        learner_id: learnerId
      },

      learning_summary: {
        total_questions: learningHistory.length,
        subjects_studied: Object.keys(subjectCounts).length,
        subject_counts: subjectCounts,
        most_studied_subject: strongestSubject
      },

      recent_learning: learningHistory.slice(0, 5),

      recommendation
    });

  } catch (error) {
    console.error("PROFILE ROUTE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Dream Education could not load the learning profile."
    });
  }
});


app.get("/api/adaptive/:learner_id", async (req, res) => {
  try {
    const learnerId = req.params.learner_id;

    console.log("=== ADAPTIVE REQUEST ===");
    console.log("Learner:", learnerId);

    const { data: history, error } = await supabase
      .from("learning_history")
      .select("question, subject, topic, level, created_at")
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Adaptive history error:", error);
      return res.status(500).json({
        success: false,
        error: "Could not load learning history"
      });
    }

    if (!history || history.length === 0) {
      return res.json({
        success: true,
        learner_id: learnerId,
        next_step: {
          type: "start",
          subject: null,
          message: "Start your first learning question."
        }
      });
    }

    const subjectCounts = {};

    for (const item of history) {
      const subject = item.subject || "General";
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    }

    const mostStudiedSubject = Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    const lastQuestion = history[0];

    res.json({
      success: true,
      learner_id: learnerId,
      next_step: {
        type: "continue",
        subject: mostStudiedSubject,
        based_on: lastQuestion.question,
        message: `Continue learning ${mostStudiedSubject}.`,
        reason: `You have studied ${mostStudiedSubject} more than any other subject so far.`
      },
      learning_summary: {
        total_questions: history.length,
        subject_counts: subjectCounts,
        most_studied_subject: mostStudiedSubject
      }
    });

  } catch (error) {
    console.error("Adaptive route error:", error);

    res.status(500).json({
      success: false,
      error: "Adaptive learning failed"
    });
  }
});


app.get("/api/next-question/:learner_id", async (req, res) => {
  try {
    const learnerId = req.params.learner_id;

    console.log("=== NEXT QUESTION REQUEST ===");
    console.log("Learner:", learnerId);

    const { data: history, error } = await supabase
      .from("learning_history")
      .select("question, subject, level, created_at")
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Next question history error:", error);
      return res.status(500).json({
        success: false,
        error: "Could not load learning history"
      });
    }

    if (!history || history.length === 0) {
      return res.json({
        success: true,
        learner_id: learnerId,
        next_question: {
          subject: "General",
          question: "What would you like to learn today?"
        },
        based_on: "No previous learning history."
      });
    }

    const subjectCounts = {};

    for (const item of history) {
      const subject = item.subject || "General";
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    }

    const subject = Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    const previousQuestions = history
      .filter(item => (item.subject || "General") === subject)
      .map(item => item.question);

    let question;

    if (subject.toLowerCase() === "biology") {
      question = previousQuestions.some(q =>
        q.toLowerCase().includes("photosynthesis")
      )
        ? "Why is sunlight important during photosynthesis?"
        : "What is one important process in Biology that you would like to understand?";
    } else {
      question = `What is an important concept in ${subject} that you would like to understand better?`;
    }

    res.json({
      success: true,
      learner_id: learnerId,
      next_question: {
        subject,
        question
      },
      based_on: previousQuestions[0],
      previous_questions_count: previousQuestions.length
    });

  } catch (error) {
    console.error("Next question route error:", error);

    res.status(500).json({
      success: false,
      error: "Could not generate next question"
    });
  }
});


app.post("/api/assess", async (req, res) => {
  try {
    const {
      learner_id,
      question,
      learner_answer,
      subject,
      topic,
      level
    } = req.body;

    console.log("=== ASSESSMENT REQUEST ===");
    console.log("Learner:", learner_id);

    if (!learner_id || !question || !learner_answer) {
      return res.status(400).json({
        success: false,
        error: "learner_id, question and learner_answer are required"
      });
    }

    const answer = learner_answer.trim().toLowerCase();

    let score = 0;
    let understanding = "needs_practice";
    let feedback = "Let's review this concept and try another question.";

    let strengths = "The learner attempted the question.";
    let gaps = "The answer needs more evidence of understanding.";
    let misconceptions = "No clear misconception detected.";

    /*
      Development assessment rules.

      These are deliberately simple for now.
      Later the AI engine can replace this logic.
    */

    if (answer.length >= 20) {
      score = 70;
      understanding = "developing";
      feedback = "Good attempt. Your answer shows some understanding. Let's strengthen the concept.";

      strengths = "The learner provided a meaningful answer.";
      gaps = "Some important parts of the concept may still be missing.";
      misconceptions = "No clear misconception detected.";
    }

    if (
      answer.includes("light") &&
      answer.includes("carbon dioxide") &&
      answer.includes("water")
    ) {
      score = 100;
      understanding = "strong";
      feedback = "Excellent. You identified the main requirements involved in photosynthesis.";

      strengths =
        "Correctly identified light, carbon dioxide, and water as important requirements.";
      gaps = "No major knowledge gap detected.";
      misconceptions = "No clear misconception detected.";
    }

    const { data, error } = await supabase
      .from("learning_assessments")
      .insert([
        {
          learner_id,
          question,
          learner_answer,
          subject: subject || null,
          topic: topic || null,
          level: level || null,
          score,
          understanding,
          feedback,
          strengths,
          gaps,
          misconceptions
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Assessment save error:", error);

      return res.status(500).json({
        success: false,
        error: "Assessment could not be saved"
      });
    }

    res.json({
      success: true,
      assessment: {
        score,
        understanding,
        feedback,
        strengths,
        gaps,
        misconceptions
      },

      saved_to_supabase: true
    });

  } catch (error) {
    console.error("Assessment route error:", error);

    res.status(500).json({
      success: false,
      error: "Assessment failed"
    });
  }
});


app.get("/api/difficulty/:learner_id", async (req, res) => {
  try {
    const learnerId = req.params.learner_id;

    console.log("=== DIFFICULTY REQUEST ===");
    console.log("Learner:", learnerId);

    const { data: assessments, error } = await supabase
      .from("learning_assessments")
      .select("score, understanding, subject, created_at")
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Difficulty history error:", error);

      return res.status(500).json({
        success: false,
        error: "Could not load assessment history"
      });
    }

    if (!assessments || assessments.length === 0) {
      return res.json({
        success: true,
        learner_id: learnerId,
        difficulty: "beginner",
        reason: "No assessment history yet."
      });
    }

    const averageScore =
      assessments.reduce((sum, item) => sum + (item.score || 0), 0) /
      assessments.length;

    let difficulty;
    let recommendation;

    if (averageScore >= 80) {
      difficulty = "advanced";
      recommendation =
        "The learner is performing strongly. Introduce more challenging questions.";
    } else if (averageScore >= 50) {
      difficulty = "intermediate";
      recommendation =
        "The learner is developing understanding. Maintain the current difficulty.";
    } else {
      difficulty = "beginner";
      recommendation =
        "The learner needs more practice. Simplify the next question and reinforce the concept.";
    }

    res.json({
      success: true,
      learner_id: learnerId,
      difficulty,
      average_score: Math.round(averageScore),
      assessments_count: assessments.length,
      recommendation
    });

  } catch (error) {
    console.error("Difficulty route error:", error);

    res.status(500).json({
      success: false,
      error: "Could not determine learning difficulty"
    });
  }
});


// ==========================================
// STAGE 5.4 — INTEGRATED LEARNING CYCLE
// ==========================================
app.post("/api/learning-cycle", async (req, res) => {
  try {
    const {
      learner_id,
      name,
      question,
      learner_answer,
      subject,
      topic,
      level
    } = req.body;

    if (!learner_id || !question || !learner_answer) {
      return res.status(400).json({
        success: false,
        error: "learner_id, question and learner_answer are required"
      });
    }

    console.log("=== LEARNING CYCLE START ===");

    // 1. Ensure learner exists
    const { error: learnerError } = await supabase
      .from("dream_learners")
      .upsert(
        {
          learner_id,
          name: name || null,
          level: level || null
        },
        { onConflict: "learner_id" }
      );

    if (learnerError) {
      console.error("Learner save error:", learnerError);
      throw learnerError;
    }

    // 2. Assess learner answer
    let score = 0;
    let understanding = "needs_practice";
    let feedback = "Keep practicing and try to explain your answer more clearly.";

    const answerLower = learner_answer.toLowerCase();

    if (learner_answer.length >= 20) {
      score = 70;
      understanding = "developing";
      feedback = "Good effort. Your answer shows developing understanding.";
    }

    if (
      answerLower.includes("light") &&
      answerLower.includes("carbon dioxide") &&
      answerLower.includes("water")
    ) {
      score = 100;
      understanding = "strong";
      feedback = "Excellent. You identified the main requirements involved in photosynthesis.";
    }

    // 3. Save the learning interaction to history
    const { error: learningHistoryError } = await supabase
      .from("learning_history")
      .insert({
        learner_id,
        question,
        subject: subject || null,
        topic: topic || null,
        level: level || null,
        answer: learner_answer,
        cached: false
      });

    if (learningHistoryError) {
      console.error("Learning history save error:", learningHistoryError);
      throw learningHistoryError;
    }

    // 4. Save assessment
    const { error: assessmentError } = await supabase
      .from("learning_assessments")
      .insert({
        learner_id,
        question,
        learner_answer,
        subject: subject || null,
        topic: topic || null,
        level: level || null,
        score,
        understanding,
        feedback
      });

    if (assessmentError) {
      console.error("Assessment save error:", assessmentError);
      throw assessmentError;
    }

    // 5. Get all assessments to determine difficulty
    const { data: assessments, error: difficultyError } = await supabase
      .from("learning_assessments")
      .select("score")
      .eq("learner_id", learner_id);

    if (difficultyError) {
      console.error("Difficulty error:", difficultyError);
      throw difficultyError;
    }

    const scores = (assessments || []).map(a => Number(a.score) || 0);

    const average_score =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    let difficulty = "beginner";

    if (average_score >= 80) {
      difficulty = "advanced";
    } else if (average_score >= 50) {
      difficulty = "intermediate";
    }

    // 6. Get learning history
    const { data: history, error: historyError } = await supabase
      .from("learning_history")
      .select("question, subject, topic, level, created_at")
      .eq("learner_id", learner_id)
      .order("created_at", { ascending: false });

    if (historyError) {
      console.error("History error:", historyError);
      throw historyError;
    }

    // 7. Choose next question
    let nextQuestion = "What would you like to learn next?";
    let nextSubject = subject || "General";

    const previousQuestions = history || [];

    if (
      (subject || "").toLowerCase() === "biology" &&
      question.toLowerCase().includes("photosynthesis")
    ) {
      nextQuestion = "Why is sunlight important during photosynthesis?";
      nextSubject = "Biology";
    } else if (difficulty === "advanced") {
      nextQuestion = `Explain a more challenging concept related to ${nextSubject}.`;
    } else if (difficulty === "intermediate") {
      nextQuestion = `Explain another important concept in ${nextSubject}.`;
    } else {
      nextQuestion = `What is one important thing you know about ${nextSubject}?`;
    }

    // 8. Progress summary
    const subjectCounts = {};

    previousQuestions.forEach(item => {
      if (item.subject) {
        subjectCounts[item.subject] =
          (subjectCounts[item.subject] || 0) + 1;
      }
    });

    console.log("=== LEARNING CYCLE COMPLETE ===");

    return res.json({
      success: true,
      learner_id,
      assessment: {
        score,
        understanding,
        feedback
      },
      difficulty: {
        level: difficulty,
        average_score,
        assessments_count: scores.length
      },
      progress: {
        total_questions: previousQuestions.length,
        subject_counts: subjectCounts
      },
      next_question: {
        subject: nextSubject,
        question: nextQuestion
      }
    });

  } catch (error) {
    console.error("LEARNING CYCLE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Learning cycle failed",
      details: error.message
    });
  }
});


// ==========================================
// STAGE 5.5 — LEARNER INTELLIGENCE
// ==========================================
app.get("/api/intelligence/:learner_id", async (req, res) => {
  try {
    const { learner_id } = req.params;

    if (!learner_id) {
      return res.status(400).json({
        success: false,
        error: "learner_id is required"
      });
    }

    console.log("=== LEARNER INTELLIGENCE START ===");

    // Get learner profile
    const { data: learner, error: learnerError } = await supabase
      .from("dream_learners")
      .select("*")
      .eq("learner_id", learner_id)
      .maybeSingle();

    if (learnerError) throw learnerError;

    if (!learner) {
      return res.status(404).json({
        success: false,
        error: "Learner not found"
      });
    }

    // Get learning history
    const { data: history, error: historyError } = await supabase
      .from("learning_history")
      .select("question, subject, topic, level, created_at")
      .eq("learner_id", learner_id)
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;

    // Get assessments
    const { data: assessments, error: assessmentError } = await supabase
      .from("learning_assessments")
      .select("question, subject, topic, score, understanding, feedback, created_at")
      .eq("learner_id", learner_id)
      .order("created_at", { ascending: false });

    if (assessmentError) throw assessmentError;

    const learningHistory = history || [];
    const assessmentResults = assessments || [];

    // Subject activity
    const subjectStats = {};

    learningHistory.forEach(item => {
      const subject = item.subject || "General";

      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          questions: 0,
          scores: []
        };
      }

      subjectStats[subject].questions += 1;
    });

    // Add assessment scores to subjects
    assessmentResults.forEach(item => {
      const subject = item.subject || "General";

      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          questions: 0,
          scores: []
        };
      }

      subjectStats[subject].scores.push(Number(item.score) || 0);
    });

    // Calculate subject performance
    const subjectPerformance = {};

    Object.entries(subjectStats).forEach(([subject, stats]) => {
      const scores = stats.scores;

      const averageScore =
        scores.length > 0
          ? Math.round(
              scores.reduce((a, b) => a + b, 0) / scores.length
            )
          : null;

      subjectPerformance[subject] = {
        questions: stats.questions,
        assessments: scores.length,
        average_score: averageScore
      };
    });

    // Topic performance
    const topicStats = {};

    assessmentResults.forEach(item => {
      const topic = item.topic || "General";

      if (!topicStats[topic]) {
        topicStats[topic] = {
          assessments: 0,
          scores: []
        };
      }

      topicStats[topic].assessments += 1;
      topicStats[topic].scores.push(Number(item.score) || 0);
    });

    const topicPerformance = {};

    Object.entries(topicStats).forEach(([topic, stats]) => {
      const scores = stats.scores;

      const averageScore =
        scores.length > 0
          ? Math.round(
              scores.reduce((a, b) => a + b, 0) / scores.length
            )
          : null;

      /*
        Topic learning state

        assessmentResults is ordered newest first,
        so the first matching assessment is the
        learner's most recent evidence for this topic.
      */

      const latestAssessment = assessmentResults.find(
        item => (item.topic || "General") === topic
      );

      const latestScore =
        latestAssessment
          ? Number(latestAssessment.score) || 0
          : null;

      const latestUnderstanding =
        latestAssessment
          ? latestAssessment.understanding || null
          : null;

      let status = "not_started";

      if (latestUnderstanding === "misconception") {
        status = "needs_correction";

      } else if (
        latestUnderstanding === "no_understanding" ||
        latestUnderstanding === "needs_practice"
      ) {
        status = "needs_practice";

      } else if (
        latestUnderstanding === "basic" ||
        latestUnderstanding === "partial"
      ) {
        status = "developing";

      } else if (
        latestUnderstanding === "strong" &&
        stats.assessments >= 3 &&
        averageScore >= 80
      ) {
        status = "mastered";

      } else if (
        latestUnderstanding === "strong"
      ) {
        status = "strong";
      }

      topicPerformance[topic] = {
        assessments: stats.assessments,
        average_score: averageScore,
        latest_score: latestScore,
        latest_understanding: latestUnderstanding,
        status
      };
    });

    // Overall performance
    const allScores = assessmentResults.map(
      item => Number(item.score) || 0
    );

    const averageScore =
      allScores.length > 0
        ? Math.round(
            allScores.reduce((a, b) => a + b, 0) / allScores.length
          )
        : 0;

    // Determine difficulty
    let difficulty = "beginner";

    if (averageScore >= 80) {
      difficulty = "advanced";
    } else if (averageScore >= 50) {
      difficulty = "intermediate";
    }

    // Determine strongest and weakest subjects
    let strongestSubject = null;
    let weakestSubject = null;

    const subjectsWithScores = Object.entries(subjectPerformance)
      .filter(([_, stats]) => stats.average_score !== null);

    if (subjectsWithScores.length > 0) {
      subjectsWithScores.sort(
        (a, b) =>
          b[1].average_score - a[1].average_score
      );

      strongestSubject = subjectsWithScores[0][0];
      weakestSubject =
        subjectsWithScores[subjectsWithScores.length - 1][0];
    }

    /*
      TOPIC SELECTION

      Decide which topic currently deserves
      the learner's attention.
    */

    const nextTopicSelection =
      selectNextTopic(topicPerformance);

    console.log("NEXT TOPIC SELECTION:", nextTopicSelection);

    // Determine learning recommendation
    let recommendation = "";
    let action = "continue";
    let recommendationSubject =
      strongestSubject || weakestSubject || "General";

    if (assessmentResults.length === 0) {

      recommendation =
        "Begin with a few questions so the system can understand the learner's current level.";

      action = "assess";

      recommendationSubject = "General";

    } else if (averageScore < 50) {

      recommendationSubject =
        weakestSubject || "General";

      recommendation =
        "Review the foundations of " +
        recommendationSubject +
        " with guided practice before moving to harder concepts.";

      action = "practice";

    } else if (averageScore < 80) {

      recommendationSubject =
        weakestSubject ||
        strongestSubject ||
        "General";

      recommendation =
        "Continue developing " +
        recommendationSubject +
        " through targeted practice while gradually increasing difficulty.";

      action = "develop";

    } else {

      recommendationSubject =
        strongestSubject ||
        "General";

      recommendation =
        "You are performing strongly in " +
        recommendationSubject +
        ". Introduce more challenging concepts, application tasks, and problem-solving.";

      action = "challenge";
    }

    console.log("=== LEARNER INTELLIGENCE COMPLETE ===");

    return res.json({
      success: true,

      learner: {
        learner_id: learner.learner_id,
        name: learner.name,
        level: learner.level
      },

      learning_profile: {
        total_questions: learningHistory.length,
        total_assessments: assessmentResults.length,
        average_score: averageScore,
        difficulty,
        strongest_subject: strongestSubject,
        weakest_subject: weakestSubject
      },

      subject_performance: subjectPerformance,

      topic_performance: topicPerformance,

      next_topic: nextTopicSelection,

      recommendation: {
        action,
        subject: recommendationSubject,
        message: recommendation
      },

      recent_learning: learningHistory.slice(0, 5)
    });

  } catch (error) {
    console.error("LEARNER INTELLIGENCE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to calculate learner intelligence",
      details: error.message
    });
  }
});


// ==========================================
// STAGE 6.4 — ADAPTIVE QUESTION SELECTION
// ==========================================
app.get("/api/adaptive-question/:learner_id", async (req, res) => {
  try {
    const { learner_id } = req.params;

    if (!learner_id) {
      return res.status(400).json({
        success: false,
        error: "learner_id is required"
      });
    }

    console.log("=== ADAPTIVE QUESTION SELECTION START ===");

    // Get assessments
    const { data: assessments, error: assessmentError } = await supabase
      .from("learning_assessments")
      .select("question, subject, topic, score, understanding, created_at")
      .eq("learner_id", learner_id)
      .order("created_at", { ascending: false });

    if (assessmentError) throw assessmentError;

    // Get learning history
    const { data: history, error: historyError } = await supabase
      .from("learning_history")
      .select("question, subject, topic, level, created_at")
      .eq("learner_id", learner_id)
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;

    const results = assessments || [];
    const learningHistory = history || [];

    // No learning data yet
    if (results.length === 0 && learningHistory.length === 0) {
      return res.json({
        success: true,
        learner_id,
        decision: "start",
        difficulty: "beginner",
        next_question: {
          subject: "General",
          question: "What would you like to learn today?"
        },
        reason: "There is not enough learning data yet."
      });
    }

    // Calculate average score
    const scores = results.map(
      item => Number(item.score) || 0
    );

    const averageScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          )
        : 0;

    // Find most studied subject
    const subjectCounts = {};

    learningHistory.forEach(item => {
      const subject = item.subject || "General";

      subjectCounts[subject] =
        (subjectCounts[subject] || 0) + 1;
    });

    results.forEach(item => {
      const subject = item.subject || "General";

      subjectCounts[subject] =
        (subjectCounts[subject] || 0) + 1;
    });

    let subject = "General";

    const subjects = Object.entries(subjectCounts);

    if (subjects.length > 0) {
      subjects.sort((a, b) => b[1] - a[1]);
      subject = subjects[0][0];
    }

    // Look at the most recent assessment
    const latest = results[0];

    // Identify the learner's current topic
    const currentTopic =
      (latest && latest.topic) ||
      (learningHistory[0] && learningHistory[0].topic) ||
      null;

    let decision;
    let difficulty;
    let reason;
    let question;

    // LOW PERFORMANCE → REVIEW
    if (latest && latest.score < 50) {

      decision = "review";
      difficulty = "beginner";

      question =
        currentTopic
          ? `Let's review an important basic concept in ${currentTopic}. ` +
            `What is one simple idea you remember about this topic?`
          : `Let's review an important basic concept in ${subject}. ` +
            `What is one simple idea you remember about this topic?`;

      reason =
        "The learner needs stronger foundational understanding.";

    // MEDIUM PERFORMANCE → PRACTICE
    } else if (latest && latest.score < 80) {

      decision = "practice";
      difficulty = "intermediate";

      question =
        currentTopic
          ? `Let's practice ${currentTopic}. ` +
            `Can you explain another important concept related to what you just learned?`
          : `Let's practice ${subject}. ` +
            `Can you explain another important concept related to what you just learned?`;

      reason =
        "The learner is developing understanding and needs more practice.";

    // HIGH PERFORMANCE → CHALLENGE
    } else {

      decision = "challenge";
      difficulty = "advanced";

      question =
        currentTopic
          ? `Challenge question: How could you apply what you learned in ${currentTopic} ` +
            `to a real-life situation or a new problem?`
          : `Challenge question: How could you apply what you learned in ${subject} ` +
            `to a real-life situation or a new problem?`;

      reason =
        "The learner is performing strongly and is ready for a more challenging task.";
    }

    console.log("=== ADAPTIVE QUESTION SELECTION COMPLETE ===");

    return res.json({
      success: true,
      learner_id,

      decision,

      difficulty,

      performance: {
        average_score: averageScore,
        assessments_count: results.length
      },

      subject,

      next_question: {
        subject,
        question
      },

      reason
    });

  } catch (error) {

    console.error("ADAPTIVE QUESTION ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to select adaptive question",
      details: error.message
    });
  }
});

// ==========================================
// STAGE 5.5 — TEACHING / EXPLANATION ENGINE
// ==========================================

app.post("/api/teach", async (req, res) => {
  try {
    const {
      learner_id,
      question,
      subject,
      topic,
      level,
      assessment
    } = req.body;

    console.log("=== TEACHING REQUEST ===");
    console.log("Learner:", learner_id);

    if (!learner_id || !question || !assessment) {
      return res.status(400).json({
        success: false,
        error: "learner_id, question and assessment are required"
      });
    }

    const understanding =
      assessment.understanding || "needs_practice";

    const strengths =
      assessment.strengths || "The learner attempted the question.";

    const gaps =
      assessment.gaps || "The learner needs more practice.";

    const misconceptions =
      assessment.misconceptions || "No clear misconception detected.";

    let explanation;
    let next_question;

    if (understanding === "strong") {

      explanation =
        "Excellent work. Your answer shows strong understanding. " +
        "You are ready to apply this knowledge to a more challenging problem.";

      next_question =
        topic
          ? `How could you apply what you learned about ${topic} ` +
            `to a real-life situation?`
          : "How could you apply what you learned to a real-life situation?";

    } else if (understanding === "developing") {

      explanation =
        `You have a good starting point. ${strengths} ` +
        `The main area to strengthen is: ${gaps} ` +
        `Let's focus on this part before moving to a harder question.`;

      if (
        topic &&
        gaps.toLowerCase().includes("carbon dioxide") &&
        gaps.toLowerCase().includes("water")
      ) {
        next_question =
          "Besides sunlight, what two other things does a plant need for photosynthesis?";
      } else if (gaps && gaps !== "Some important parts of the concept may still be missing.") {
        next_question =
          `Let's focus on this gap: ${gaps} What can you tell me about it?`;
      } else {
        next_question =
          topic
            ? `What is one important idea you can add to your explanation of ${topic}?`
            : "What is one important idea you can add to your explanation?";
      }

    } else {

      explanation =
        `Let's slow down and rebuild the concept. ${gaps} ` +
        `We'll focus on one simple idea at a time.`;

      next_question =
        topic
          ? `In your own words, what is one basic thing you know about ${topic}?`
          : "In your own words, what is one basic thing you know about this topic?";
    }

    res.json({
      success: true,
      learner_id,
      teaching: {
        explanation,
        strengths,
        gaps,
        misconceptions
      },
      next_question: {
        subject: subject || "General",
        topic: topic || null,
        level: level || null,
        question: next_question
      }
    });

  } catch (error) {
    console.error("Teaching engine error:", error);

    res.status(500).json({
      success: false,
      error: "Teaching engine failed"
    });
  }
});


// ==========================================
// STAGE 5.6 — TOPIC MASTERY MODEL
// ==========================================

app.get("/api/mastery/:learner_id/:topic", async (req, res) => {
  try {
    const { learner_id, topic } = req.params;

    console.log("=== MASTERY REQUEST ===");
    console.log("Learner:", learner_id);
    console.log("Topic:", topic);

    if (!learner_id || !topic) {
      return res.status(400).json({
        success: false,
        error: "learner_id and topic are required"
      });
    }

    const { data: assessments, error } = await supabase
      .from("learning_assessments")
      .select("score, understanding, created_at")
      .eq("learner_id", learner_id)
      .eq("topic", topic)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Mastery history error:", error);

      return res.status(500).json({
        success: false,
        error: "Could not load mastery history"
      });
    }

    const results = assessments || [];

    if (results.length === 0) {
      return res.json({
        success: true,
        learner_id,
        topic,
        mastery: {
          status: "not_started",
          assessments: 0,
          average_score: 0,
          mastered: false
        }
      });
    }

    const scores = results.map(item => Number(item.score) || 0);

    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) /
      scores.length;

    let status;

    if (averageScore < 50) {
      status = "needs_practice";
    } else if (averageScore < 80) {
      status = "developing";
    } else {
      status = "strong";
    }

    const latestThreeStrong =
      results.length >= 3 &&
      results
        .slice(0, 3)
        .every(item => item.understanding === "strong");

    const mastered = latestThreeStrong;

    if (mastered) {
      status = "mastered";
    }

    res.json({
      success: true,
      learner_id,
      topic,
      mastery: {
        status,
        assessments: results.length,
        average_score: Math.round(averageScore),
        mastered
      }
    });

  } catch (error) {
    console.error("Mastery engine error:", error);

    res.status(500).json({
      success: false,
      error: "Mastery calculation failed"
    });
  }
});


// ==========================================
// STAGE 5.7 — INTEGRATED LEARNING SESSION
// ==========================================


/*
  STAGE 5.7 — INTEGRATED LEARNING SESSION
*/

app.post("/api/session", async (req, res) => {
  try {
    const {
      learner_id,
      name,
      question,
      learner_answer,
      subject,
      topic,
      level
    } = req.body;

    console.log("=== LEARNING SESSION ===");
    console.log("Learner:", learner_id);
    console.log("Topic:", topic);

    if (!learner_id || !question || !learner_answer) {
      return res.status(400).json({
        success: false,
        error: "learner_id, question and learner_answer are required"
      });
    }

    /*
      1. SAVE / UPDATE LEARNER
    */

    const { error: learnerError } = await supabase
      .from("dream_learners")
      .upsert(
        {
          learner_id,
          name: name || null,
          level: level || null
        },
        {
          onConflict: "learner_id"
        }
      );

    if (learnerError) {
      throw learnerError;
    }

    /*
      2. ASSESS UNDERSTANDING
    */

    const answer = learner_answer.trim().toLowerCase();

    // =========================
    // CONCEPT EVIDENCE ENGINE
    // AUTHORITATIVE APPLICATION ASSESSMENT
    // =========================

    const evidenceAnalysis = analyzeConceptEvidence(
      question,
      learner_answer,
      {
        subject,
        topic,
        level
      }
    );

    console.log("CONCEPT EVIDENCE ANALYSIS:", evidenceAnalysis);

console.log("LIVE EVIDENCE CHECK:", {
  score: evidenceAnalysis && evidenceAnalysis.score,
  reasoningQuality: evidenceAnalysis && evidenceAnalysis.reasoningQuality,
  factorCorrect: evidenceAnalysis && evidenceAnalysis.factorCorrect,
  processCorrect: evidenceAnalysis && evidenceAnalysis.processCorrect,
  outcomePresent: evidenceAnalysis && evidenceAnalysis.outcomePresent
});

let score = 0;
let understanding = "no_understanding";

let feedback =
  "Let's start with the basic idea and build your understanding step by step.";

let strengths =
  "The learner attempted the question.";

let gaps =
  "The learner has not yet demonstrated enough understanding.";

let misconceptions =
  "No clear misconception detected.";
/*
  QUESTION TYPE CLASSIFICATION

  The engine first determines what kind of thinking
  the question requires before assessing the answer.
*/

const questionText = question.trim().toLowerCase();

let questionType = "recall";

const applicationSignals = [
  "apply",
  "application",
  "real-life",
  "real life",
  "new problem",
  "new situation",
  "what would happen",
  "what happens if",
  "predict",
  "how would",
  "how could",
  "use what you learned",
  "in a different situation"
];

const understandingSignals = [
  "why",
  "how does",
  "how do",
  "explain why",
  "explain how",
  "why is",
  "why does",
  "why do"
];

const applicationScenarioSignals = [
  "farmer",
  "farm",
  "garden",
  "greenhouse",
  "plant growing",
  "plant is growing",
  "thick shade",
  "shade",
  "shaded",
  "real-life situation",
  "real life situation",
  "scenario",
  "experiment",
  "kept in",
  "placed in",
  "not making enough",
  "what would happen to",
  "what effect would",
  "how would this affect",
  "not getting enough water",
  "not enough water",
  "lack of water",
  "limited water",
  "water shortage",
  "water is limited",
  "does not have enough water",
  "without enough water",
  "water stress",
  "very little carbon dioxide",
  "little carbon dioxide",
  "not enough carbon dioxide",
  "limited carbon dioxide",
  "low carbon dioxide",
  "lack of carbon dioxide",
  "low co2",
  "lack of co2"
];

if (
  applicationSignals.some(signal =>
    questionText.includes(signal)
  ) ||
  applicationScenarioSignals.some(signal =>
    questionText.includes(signal)
  )
) {
  questionType = "application";

} else if (
  understandingSignals.some(signal =>
    questionText.includes(signal)
  )
) {
  questionType = "understanding";
}



/*
  APPLICATION ASSESSMENT

  Concept Evidence Engine is authoritative for application
  reasoning. It evaluates the learner's conceptual evidence
  rather than relying on scenario-specific rules.
*/

if (
  evidenceAnalysis &&
  evidenceAnalysis.reasoningQuality !== "insufficient" &&
  (
    questionType === "application" ||
    (
      questionType === "understanding" &&
      evidenceAnalysis.reasoningQuality === "misconception"
    )
  )
) {
  score = evidenceAnalysis.score;
  understanding = evidenceAnalysis.reasoningQuality;

  feedback = evidenceAnalysis.feedback;
  strengths = evidenceAnalysis.strengths;
  gaps = evidenceAnalysis.gaps;
  misconceptions = evidenceAnalysis.misconceptions;
}

/*
  PHOTOSYNTHESIS UNDERSTANDING
*/

if (
  questionType !== "application" &&
  topic &&
  topic.toLowerCase().includes("photosynthesis")
) {

  const photosynthesisQuestionText = question.toLowerCase();

  const mentionsLight =
    answer.includes("light") ||
    answer.includes("sunlight") ||
    answer.includes("sun");

  const mentionsCarbon =
    answer.includes("carbon dioxide") ||
    answer.includes("co2");

  const mentionsWater =
    answer.includes("water");

  const mentionsFood =
    answer.includes("food") ||
    answer.includes("glucose") ||
    answer.includes("sugar");

  const saysPlantsBreathe =
    answer.includes("plants breathe") ||
    answer.includes("plants take in oxygen") ||
    answer.includes("plants use oxygen");

  const asksBesidesSunlight =
    photosynthesisQuestionText.includes("besides sunlight") ||
    photosynthesisQuestionText.includes("other things") ||
    photosynthesisQuestionText.includes("other thing");

  const asksWhatGas =
    (
      photosynthesisQuestionText.includes("what gas") ||
      (
        (
          photosynthesisQuestionText.includes("take in") ||
          photosynthesisQuestionText.includes("takes in")
        ) &&
        (
          photosynthesisQuestionText.includes("carbon dioxide") ||
          photosynthesisQuestionText.includes("oxygen")
        )
      )
    ) &&
    photosynthesisQuestionText.includes("photosynthesis");

  const asksSunlightRole =
    photosynthesisQuestionText.includes("what do you think a plant uses sunlight for") ||
    photosynthesisQuestionText.includes("what does sunlight do");

  if (saysPlantsBreathe && !mentionsCarbon) {

    score = 20;
    understanding = "misconception";

    feedback =
      "You are thinking about gases involved in plant processes, which is a useful starting point. However, photosynthesis uses carbon dioxide as an input.";

    strengths =
      "The learner recognized that gases are involved in plant processes.";

    gaps =
      "The role of carbon dioxide in photosynthesis needs clarification.";

    misconceptions =
      "The learner appears to confuse oxygen intake with carbon dioxide intake during photosynthesis.";

  } else if (asksBesidesSunlight && mentionsCarbon && mentionsWater) {

    score = 100;
    understanding = "strong";

    feedback =
      "Excellent. You correctly identified carbon dioxide and water as the important inputs besides sunlight.";

    strengths =
      "The learner correctly identified carbon dioxide and water as requirements for photosynthesis.";

    gaps =
      "No major knowledge gap detected for this question.";

  } else if (asksWhatGas && mentionsCarbon) {

    score = 100;
    understanding = "strong";

    feedback =
      "Correct. The gas the plant takes in for photosynthesis is carbon dioxide.";

    strengths =
      "The learner correctly identified carbon dioxide as an input to photosynthesis.";

    gaps =
      "No major knowledge gap detected for this question.";

  } else if (asksSunlightRole && mentionsFood) {

    score = 90;
    understanding = "strong";

    feedback =
      "Excellent. You understand that the plant uses sunlight to help make food through photosynthesis.";

    strengths =
      "The learner connected sunlight with food production.";

    gaps =
      "No major knowledge gap detected for this question.";

  } else if (asksSunlightRole && mentionsLight) {

    score = 65;
    understanding = "partial";

    feedback =
      "Good start. You recognized that sunlight is important. Now let's explain what role its energy plays in making food.";

    strengths =
      "The learner recognized the importance of sunlight.";

    gaps =
      "The role of light energy in photosynthesis needs further explanation.";

  } else if (mentionsLight && mentionsCarbon && mentionsWater && mentionsFood) {

    score = 100;
    understanding = "strong";

    feedback =
      "Excellent. Your answer identifies the main inputs and the food produced through photosynthesis.";

    strengths =
      "The learner identified light, carbon dioxide, water, and food production.";

    gaps =
      "No major knowledge gap detected.";

  } else if (mentionsLight && mentionsCarbon && mentionsWater) {

    score = 90;
    understanding = "strong";

    feedback =
      "Very good. You identified the three major requirements for photosynthesis.";

    strengths =
      "The learner identified light, carbon dioxide, and water.";

    gaps =
      "The learner could further explain what the plant produces.";

  } else if (mentionsLight && (mentionsCarbon || mentionsWater)) {

    score = 65;
    understanding = "partial";

    feedback =
      "Good start. You identified some important requirements, but your explanation is incomplete.";

    strengths =
      "The learner identified some requirements for photosynthesis.";

    gaps =
      "One or more important requirements for photosynthesis are missing.";

  } else if (mentionsLight || mentionsFood) {

    score = 45;
    understanding = "basic";

    feedback =
      "You have identified part of the idea. Let's build the explanation further.";

    strengths =
      "The learner recognized an important part of photosynthesis.";

    gaps =
      "The learner needs to identify the other important inputs and explain their roles.";
  }

} else if (questionType !== "application") {

  /*
    GENERAL UNDERSTANDING
  */

  if (answer.length >= 50) {

    score = 70;
    understanding = "partial";

    feedback =
      "Good attempt. Your answer contains useful ideas, but let's examine the concept more carefully.";

    strengths =
      "The learner provided a developed response.";

    gaps =
      "Some important parts of the concept may still be missing.";

  } else if (answer.length >= 20) {

    score = 50;
    understanding = "basic";

    feedback =
      "You have a starting point. Let's develop your explanation further.";

    strengths =
      "The learner provided a meaningful attempt.";

    gaps =
      "The explanation needs more detail.";
  }
}




/*
  MISCONCEPTION DEBUG
*/
console.log("MISCONCEPTION DEBUG:", {
  topic,
  answer,
  hasOxygen: answer.includes("oxygen"),
  hasTakesIn: answer.includes("takes in"),
  hasCarbonDioxide: answer.includes("carbon dioxide"),
  hasCO2: answer.includes("co2")
});

/*
  MISCONCEPTION ENGINE

  The assessment engine first determines whether the learner
  is correct, partially correct, or incorrect.

  This layer then looks for specific conceptual mistakes.
  It does not replace the existing scoring system.
*/

if (
  topic &&
  topic.toLowerCase().includes("photosynthesis")
) {

  /*
    1. OXYGEN VS CARBON DIOXIDE

    The learner may confuse the gas used in photosynthesis
    with the gas released by photosynthesis.
  */

  if (
    (
      answer.includes("oxygen") &&
      (
        answer.includes("take in") ||
        answer.includes("takes in") ||
        answer.includes("uses") ||
        answer.includes("use")
      )
    ) &&
    !answer.includes("carbon dioxide") &&
    !answer.includes("co2")
  ) {

    misconceptions =
      "The learner appears to confuse oxygen with carbon dioxide as the gas taken in during photosynthesis.";

  /*
    1B. OXYGEN TREATED AS AN INPUT

    The learner may mention carbon dioxide correctly but still
    incorrectly claim that oxygen is taken in for photosynthesis.
  */

  } else if (
    (
      answer.includes("take in oxygen") ||
      answer.includes("takes in oxygen") ||
      answer.includes("take in more oxygen") ||
      answer.includes("takes in more oxygen") ||
      answer.includes("oxygen as an input") ||
      answer.includes("oxygen is taken in")
    ) &&
    !(
      answer.includes("not take in oxygen") ||
      answer.includes("does not take in oxygen") ||
      answer.includes("doesn't take in oxygen") ||
      answer.includes("oxygen is released") ||
      answer.includes("release oxygen") ||
      answer.includes("releases oxygen")
    )
  ) {

    misconceptions =
      "The learner appears to treat oxygen as an input to photosynthesis. During photosynthesis, carbon dioxide is taken in and oxygen is released.";

  /*
    2. PLANTS GET FOOD FROM SOIL

    The learner may think soil directly provides the food
    made by the plant.
  */

  } else if (
    (
      answer.includes("soil") ||
      answer.includes("ground") ||
      answer.includes("earth")
    ) &&
    (
      answer.includes("food") ||
      answer.includes("gets food") ||
      answer.includes("get food") ||
      answer.includes("food from")
    )
  ) {

    misconceptions =
      "The learner appears to believe that plants obtain their food directly from the soil instead of making food through photosynthesis.";

  /*
    3. SUNLIGHT IS FOOD

    The learner may treat sunlight itself as the food
    produced by photosynthesis.
  */

  } else if (
    (
      answer.includes("sunlight is food") ||
      answer.includes("sunlight is the food") ||
      answer.includes("light is food") ||
      answer.includes("light is the food") ||
      answer.includes("food is sunlight")
    )
  ) {

    misconceptions =
      "The learner appears to confuse sunlight, which provides energy for photosynthesis, with the food produced by the plant.";

  /*
    4. WATER IS FOOD

    Water is an input to photosynthesis, but it is not
    the food produced by the process.
  */

  } else if (
    (
      answer.includes("water is food") ||
      answer.includes("water is the food") ||
      answer.includes("food is water") ||
      answer.includes("plant makes water as food")
    )
  ) {

    misconceptions =
      "The learner appears to confuse water, an input to photosynthesis, with the food produced by the plant.";

  /*
    5. PHOTOSYNTHESIS AND RESPIRATION

    The learner may describe photosynthesis as the process
    in which plants take in oxygen and release carbon dioxide.
  */

  } else if (
    (
      answer.includes("take in oxygen") ||
      answer.includes("takes in oxygen") ||
      answer.includes("take in more oxygen") ||
      answer.includes("takes in more oxygen") ||
      answer.includes("use oxygen") ||
      answer.includes("uses oxygen") ||
      answer.includes("oxygen as an input") ||
      answer.includes("oxygen is taken in")
    ) &&
    (
      answer.includes("release carbon dioxide") ||
      answer.includes("releases carbon dioxide") ||
      answer.includes("give out carbon dioxide") ||
      answer.includes("gives out carbon dioxide")
    )
  ) {

    misconceptions =
      "The learner appears to confuse photosynthesis with respiration by reversing the main gas exchange associated with photosynthesis.";

  /*
    6. SUNLIGHT CAUSES WATER ABSORPTION

    The learner may confuse the role of light in
    photosynthesis with the uptake of water by roots.
  */

  } else if (
    (
      answer.includes("sunlight") ||
      answer.includes("light")
    ) &&
    (
      answer.includes("drink water") ||
      answer.includes("drinks water") ||
      answer.includes("absorb water") ||
      answer.includes("absorbs water") ||
      answer.includes("take in water") ||
      answer.includes("takes in water")
    ) &&
    !answer.includes("photosynthesis")
  ) {

    misconceptions =
      "The learner appears to confuse the role of light in photosynthesis with the process by which roots absorb water.";

  /*
    7. CARBON DIOXIDE AS A WASTE PRODUCT

    The learner may identify carbon dioxide as waste
    rather than as an input used during photosynthesis.
  */

  } else if (
    (
      answer.includes("carbon dioxide") ||
      answer.includes("co2")
    ) &&
    (
      answer.includes("waste") ||
      answer.includes("waste product") ||
      answer.includes("harmful") ||
      answer.includes("poison")
    )
  ) {

    misconceptions =
      "The learner appears to think that carbon dioxide is a waste product or harmful substance during photosynthesis, rather than an important input.";

  /*
    8. PHOTOSYNTHESIS WITHOUT LIGHT

    The learner may claim that photosynthesis can continue
    normally without light.
  */

  } else if (
    (
      answer.includes("no light") ||
      answer.includes("without light") ||
      answer.includes("without sunlight") ||
      answer.includes("darkness") ||
      answer.includes("dark")
    ) &&
    (
      answer.includes("photosynthesis continues") ||
      answer.includes("photosynthesis will continue") ||
      answer.includes("photosynthesis can continue") ||
      answer.includes("photosynthesis continues normally") ||
      answer.includes("still photosynthesis")
    )
  ) {

    misconceptions =
      "The learner appears to believe that photosynthesis can continue normally without light.";

  /*
    9. SUNLIGHT DIRECTLY BECOMES FOOD

    The learner may understand that light is important but
    incorrectly describe light itself as being converted
    directly into food.
  */

  } else if (
    (
      answer.includes("sunlight becomes food") ||
      answer.includes("sunlight turns into food") ||
      answer.includes("light becomes food") ||
      answer.includes("light turns into food")
    )
  ) {

    misconceptions =
      "The learner appears to believe that sunlight itself is directly converted into food, rather than providing energy for the photosynthesis process.";

  /*
    10. NO PHOTOSYNTHESIS BECAUSE OF WATER

    The learner may incorrectly state that lack of water
    affects photosynthesis because plants use water as food.
  */

  } else if (
    answer.includes("water") &&
    (
      answer.includes("because water is food") ||
      answer.includes("water is food") ||
      answer.includes("water makes food")
    )
  ) {

    misconceptions =
      "The learner appears to confuse water as an input to photosynthesis with the food produced by the process.";
  }
}

/*
  MISCONCEPTION ASSESSMENT OVERRIDE

  A detected conceptual misconception should affect the
  actual assessment, not only the misconception description.
*/

if (
  misconceptions !== "No clear misconception detected."
) {
  understanding = "misconception";
  score = 20;

  feedback =
    "There is an important idea to correct before we move on. " +
    misconceptions;

  strengths =
    "The learner attempted to explain the situation and identified part of the relevant concept.";

  gaps =
    misconceptions;
}


/*
  TARGETED MISCONCEPTION REMEDIATION

  A detected misconception is treated differently from
  ordinary lack of understanding.

  The engine identifies the mistaken idea, changes the
  learner state to "misconception", and prepares the
  system to teach the specific gap.
*/

if (
  misconceptions !== "No clear misconception detected."
) {
  understanding = "misconception";

  if (
    misconceptions.includes("oxygen with carbon dioxide")
  ) {
    feedback =
      "You have identified a gas involved in plant processes, but there is an important distinction to correct: during photosynthesis, plants take in carbon dioxide, while oxygen is released.";

    strengths =
      "The learner recognized that gases are involved in photosynthesis.";

    gaps =
      "The learner needs to distinguish carbon dioxide as an input from oxygen as a product of photosynthesis.";
  }
}

/*
  CONCEPT EVIDENCE OVERRIDE

  When the Concept Evidence Engine has identified a complete,
  strong explanation, its result must take priority over the
  simpler keyword-based assessment above.
*/

if (
  evidenceAnalysis &&
  evidenceAnalysis.reasoningQuality === "strong"
) {
  score = evidenceAnalysis.score;
  understanding = "strong";
  feedback = evidenceAnalysis.feedback;
  strengths = evidenceAnalysis.strengths;
  gaps = evidenceAnalysis.gaps;
  misconceptions = evidenceAnalysis.misconceptions;
}



console.log("STATE AFTER MISCONCEPTION REMEDIATION:", {
  understanding,
  score,
  feedback,
  misconceptions
});

/*
  SAVE CURRENT ASSESSMENT

  The assessment must be stored before trajectory and mastery
  are calculated so those systems can see the current attempt.
*/

const { error: currentAssessmentError } = await supabase
  .from("learning_assessments")
  .insert({
    learner_id,
    question,
    learner_answer,
    subject: subject || null,
    topic: topic || null,
    level: level || null,
    score,
    understanding,
    feedback,
    strengths,
    gaps,
    misconceptions
  });

if (currentAssessmentError) {
  console.error("Current assessment save error:", currentAssessmentError);
  throw currentAssessmentError;
}

/*
  LEARNING TRAJECTORY

  Look at the learner's previous assessment for this topic
  and compare it with the current assessment.
*/

const { data: previousAssessments, error: trajectoryError } =
  await supabase
    .from("learning_assessments")
    .select("score, understanding, created_at")
    .eq("learner_id", learner_id)
    .eq("topic", topic)
    .order("created_at", { ascending: false })
    .limit(2);

if (trajectoryError) {
  throw trajectoryError;
}

const previousResults = previousAssessments || [];

/*
  The newest record is the assessment we just saved.
  Therefore the second record represents the previous attempt.
*/

let trajectory = "first_attempt";
let previousScore = null;
let previousUnderstanding = null;
let improvement = 0;

if (previousResults.length >= 2) {

  previousScore = Number(previousResults[1].score) || 0;
  previousUnderstanding = previousResults[1].understanding || null;

  improvement = score - previousScore;

  if (improvement >= 10) {
    trajectory = "improving";
  } else if (improvement <= -10) {
    trajectory = "declining";
  } else {
    trajectory = "stable";
  }
}

const { data: assessments, error: masteryError } =
  await supabase
    .from("learning_assessments")
    .select("score, understanding, created_at")
    .eq("learner_id", learner_id)
    .eq("topic", topic)
    .order("created_at", { ascending: false });

if (masteryError) {
  throw masteryError;
}

const results = assessments || [];

const scores = results.map(
  item => Number(item.score) || 0
);

const averageScore =
  scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) /
      scores.length
    : 0;

/*
  TRAJECTORY-AWARE MASTERY

  Mastery is based primarily on current understanding
  and consistent evidence, rather than punishing the learner
  indefinitely for an early mistake.
*/

const strongAttempts = results.filter(
  item => item.understanding === "strong"
).length;

const latestThreeStrong =
  results.length >= 3 &&
  results
    .slice(0, 3)
    .every(item => item.understanding === "strong");

let masteryStatus;

if (results.length === 0) {

  masteryStatus = "not_started";

} else if (understanding === "misconception") {

  masteryStatus = "needs_correction";

} else if (understanding === "no_understanding") {

  masteryStatus = "needs_practice";

} else if (
  understanding === "basic" ||
  understanding === "partial"
) {

  masteryStatus = "developing";

} else if (
  understanding === "strong" &&
  latestThreeStrong
) {

  masteryStatus = "mastered";

} else {

  masteryStatus = "developing";
}

const mastered =
  masteryStatus === "mastered";

/*
  LEARNING STATE ENGINE

  The state engine tracks the learner's current position
  in the learning journey.

  The most recent previous assessment is used for the
  immediate state transition.
*/
const previousStateAssessment =
  previousResults.length >= 2
    ? previousResults[1]
    : null;

const previousStateUnderstanding =
  previousStateAssessment
    ? previousStateAssessment.understanding || null
    : null;

const previousStateScore =
  previousStateAssessment
    ? Number(previousStateAssessment.score) || 0
    : null;

let previousLearningState = null;

if (previousStateUnderstanding === "misconception") {
  previousLearningState = "MISCONCEPTION";
} else if (
  previousStateUnderstanding === "strong" &&
  previousStateScore >= 80
) {
  previousLearningState = "STRONG";
} else if (
  previousStateUnderstanding === "basic" ||
  previousStateUnderstanding === "partial"
) {
  previousLearningState = "DEVELOPING";
} else if (
  previousStateUnderstanding === "no_understanding" ||
  previousStateUnderstanding === "needs_practice"
) {
  previousLearningState = "FOUNDATION";
}

const correctionAttempt =
  previousStateUnderstanding === "misconception";

const learningState = determineLearningState({
  previousState: previousLearningState,
  previousUnderstanding: previousStateUnderstanding,
  previousScore: previousStateScore,
  currentUnderstanding: understanding,
  currentScore: score,
  correctionAttempt
});

console.log("LEARNING STATE TRANSITION:", {
  previousState: previousLearningState,
  previousUnderstanding: previousStateUnderstanding,
  previousScore: previousStateScore,
  currentUnderstanding: understanding,
  currentScore: score,
  correctionAttempt,
  learningState
});

/*
  STATE-AWARE EVIDENCE TEACHING

  The teaching engine now receives both the current
  evidence and the learner's accumulated state.
*/
const finalEvidenceAnalysis = {
  ...evidenceAnalysis,
  score,
  reasoningQuality:
    understanding === "misconception"
      ? "misconception"
      : evidenceAnalysis.reasoningQuality,
  feedback,
  strengths,
  gaps,
  misconceptions
};

const teachingAnalysis = generateEvidenceTeaching(
  finalEvidenceAnalysis,
  {
    subject,
    topic,
    level,
    masteryStatus,
    averageScore,
    strongAttempts,
    trajectory,
    previousScore,
    learningState,
    previousLearningState,
    correctionAttempt
  }
);

console.log("STATE-AWARE TEACHING ANALYSIS:", teachingAnalysis);

let explanation;
    let nextQuestion;

    /*
      AUTHORITATIVE STATE-AWARE TEACHING

      The evidence teaching engine is now the single source
      of truth for the teaching move and next question.

      Priority:
      misconception
      -> missing factor
      -> missing process
      -> missing outcome
      -> mastery challenge
      -> strong progression
      -> partial reasoning
      -> basic reasoning
      -> foundation
    */

    if (
      teachingAnalysis &&
      teachingAnalysis.nextQuestion
    ) {
      nextQuestion = teachingAnalysis.nextQuestion;

      explanation =
        teachingAnalysis.explanation ||
        "Let's continue building your understanding step by step.";

      console.log("AUTHORITATIVE TEACHING DECISION:", {
        teachingMove: teachingAnalysis.teachingMove,
        target: teachingAnalysis.target,
        explanation,
        nextQuestion
      });

    } else {
      /*
        Safety fallback.

        This should only be reached if the teaching engine
        cannot produce a next question.
      */

      const currentTopic = topic || "this concept";

      explanation =
        `Let's continue learning about ${currentTopic} step by step.`;

      nextQuestion =
        `What is the main idea you understand about ${currentTopic}?`;

      console.log("TEACHING FALLBACK USED:", {
        topic: currentTopic,
        nextQuestion
      });
    }

    /*
      FINAL SESSION DEBUG
    */
    console.log("FINAL SESSION DEBUG:", {
      understanding,
      misconceptions,
      explanation,
      nextQuestion
    });

    /*
      7. RETURN COMPLETE LEARNING SESSION
    */

    res.json({
      success: true,
      learner_id,

      assessment: {
        score,
        understanding,
        feedback,
        strengths,
        gaps,
        misconceptions
      },

      question_type: questionType,

      learning_state: learningState,
      previous_learning_state: previousLearningState,

      teaching: {
        move: teachingAnalysis ? teachingAnalysis.teachingMove : null,
        target: teachingAnalysis ? teachingAnalysis.target : null,
        explanation
      },

      mastery: {
        status: masteryStatus,
        assessments: results.length,
        average_score: Math.round(averageScore),
        mastered
      },

      trajectory: {
        status: trajectory,
        previous_score: previousScore,
        previous_understanding: previousUnderstanding,
        improvement
      },

      next_question: {
        subject: subject || "General",
        topic: topic || null,
        level: level || null,
        question: nextQuestion
      }
    });

  } catch (error) {

    console.error("Learning session error:", error);
    console.error("ERROR MESSAGE:", error && error.message);
    console.error("ERROR STACK:", error && error.stack);

    res.status(500).json({
      success: false,
      error: "Learning session failed"
    });
  }
});


/*
  START SERVER
*/

app.listen(3000, () => {
  console.log("Dream Education running on http://localhost:3000");
  console.log("AI mode:", process.env.AI_MODE || "development");
});
