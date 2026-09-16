require("dotenv").config();

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

function createCacheKey(question, subject, level) {
  const normalized = [
    question.trim().toLowerCase(),
    (subject || "General").trim().toLowerCase(),
    (level || "General").trim().toLowerCase()
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
}

function developmentAnswer(question, subject, level) {
  return `Welcome to Dream Education.

Subject: ${subject || "General"}
Level: ${level || "General"}

Let's learn about your question:

"${question}"

This is Dream Education development mode. The learning engine has received your question and is ready to teach you.

In the live version, Dream Education's AI teacher will provide:
1. A clear explanation.
2. Examples suitable for your level.
3. Step-by-step guidance.
4. A short practice question.

Practice:
In your own words, what do you already know about this topic?`;
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
      learner_name
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

    const cacheKey = createCacheKey(question, subject, level);
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
          level
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
      .select("question, subject, level, created_at")
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
      .select("question, subject, level, created_at")
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

    /*
      Development assessment rules.

      These are deliberately simple for now.
      Later the AI engine can replace this logic.
    */

    if (answer.length >= 20) {
      score = 70;
      understanding = "developing";
      feedback = "Good attempt. Your answer shows some understanding. Let's strengthen the concept.";
    }

    if (
      answer.includes("light") &&
      answer.includes("carbon dioxide") &&
      answer.includes("water")
    ) {
      score = 100;
      understanding = "strong";
      feedback = "Excellent. You identified the main requirements involved in photosynthesis.";
    }

    const { data, error } = await supabase
      .from("learning_assessments")
      .insert([
        {
          learner_id,
          question,
          learner_answer,
          subject: subject || null,
          level: level || null,
          score,
          understanding,
          feedback
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
        feedback
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
      .select("question, subject, level, created_at")
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

    if (subject) {
      subjectCounts[subject] =
        (subjectCounts[subject] || 0) + 1;
    }

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
      .select("question, subject, level, created_at")
      .eq("learner_id", learner_id)
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;

    // Get assessments
    const { data: assessments, error: assessmentError } = await supabase
      .from("learning_assessments")
      .select("question, subject, score, understanding, feedback, created_at")
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

    // Determine learning recommendation
    let recommendation = "";
    let action = "continue";

    if (assessmentResults.length === 0) {
      recommendation =
        "Begin with a few questions so the system can understand the learner's current level.";
      action = "assess";
    } else if (averageScore < 50) {
      recommendation =
        "Review foundational concepts and provide more guided practice.";
      action = "practice";
    } else if (averageScore < 80) {
      recommendation =
        "Continue practicing while gradually introducing more challenging concepts.";
      action = "develop";
    } else {
      recommendation =
        "Introduce more challenging concepts and application-based questions.";
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

      recommendation: {
        action,
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

app.listen(PORT, () => {
  console.log(`Dream Education running on http://localhost:${PORT}`);
  console.log(`AI mode: ${AI_MODE}`);
});