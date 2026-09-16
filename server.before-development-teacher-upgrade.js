require("dotenv").config();
const { generateEvidenceTeaching } = require("./evidence_teaching_engine");
const { generateAdaptiveQuestion } = require("./adaptive_question_engine");
const { selectNextTopic } = require("./topic_selection_engine");
const { determineLearningState } = require("./learning_state_engine");
const { calculateMastery } = require("./mastery_engine");
const { buildLearningProfile } = require("./learning_profile_engine");
const { decideNextAction } = require("./decision_engine");
const { assessLearning } = require("./assessment_engine");
const { determineDifficulty } = require("./difficulty_engine");

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
      .toLowerCase(),

    (adaptiveContext.topic || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.difficulty || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.learning_state || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.decision_action || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.decision_topic || "none")
      .toString()
      .trim()
      .toLowerCase(),

    (adaptiveContext.difficulty_direction || "none")
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
    previous_score = null,
    difficulty = null,
    topic = null,
    learning_state = null,
    decision_action = null,
    decision_topic = null,
    difficulty_direction = null,
    difficulty_reason = null
  } = adaptiveContext;

  const lessonTopic = topic || subject || "this topic";

  let lessonTitle =
    "Let's build your understanding";

  let lessonBody =
    `We are learning about ${lessonTopic}.\n\n` +
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
      `Correct the misconception about ${lessonTopic}.`;

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
Topic: ${topic || "General"}
Level: ${level || "General"}

${lessonTitle}

${lessonBody}

Learning focus:
${learningFocus}

Learning state: ${learning_state || "FOUNDATION"}
Decision action: ${decision_action || "continue"}
Decision topic: ${decision_topic || lessonTopic}
Teaching move: ${teaching_move || "foundation"}
Target: ${teaching_target || "foundation"}
Difficulty: ${difficulty || "foundation"}
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
      topic,
      level,
      learner_id,
      learner_name,
      teaching_move,
      teaching_target,
      teaching_explanation,
      mastery_status,
      average_score,
      trajectory,
      previous_score,
      difficulty,
      learning_state,
      decision_action,
      decision_topic,
      difficulty_direction,
      difficulty_reason
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
        topic,
        teaching_move,
        teaching_target,
        mastery_status,
        trajectory,
        difficulty,
        learning_state,
        decision_action,
        decision_topic,
        difficulty_direction
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
            previous_score,
            difficulty,
            topic,
            learning_state,
            decision_action,
            decision_topic,
            difficulty_direction,
            difficulty_reason
          }
        );

        console.log("7. Development answer created");
      } else {
        console.log("6. LIVE MODE");

        const prompt = `
You are the AI teacher for Dream Education.

Your job is to help this learner genuinely understand the concept and become able to reason about it independently.

You are not just an answer generator. You are the teaching layer of an adaptive learning system.

LEARNER CONTEXT
Level: ${level || "General"}
Subject: ${subject || "General"}
Current question: ${question}

LEARNING INTELLIGENCE
Teaching move: ${teaching_move || "foundation"}
Teaching target: ${teaching_target || "foundation"}
Teaching guidance: ${teaching_explanation || "Build understanding step by step."}
Mastery status: ${mastery_status || "not_started"}
Average score: ${average_score ?? "not available"}
Trajectory: ${trajectory || "first_attempt"}
Previous score: ${previous_score ?? "not available"}
Difficulty: ${difficulty || "foundation"}
Learning state: ${learning_state || "FOUNDATION"}
Decision action: ${decision_action || "continue"}
Decision topic: ${decision_topic || topic || "General"}
Difficulty direction: ${difficulty_direction || "maintain"}
Difficulty guidance: ${difficulty_reason || "Use the current difficulty appropriately."}

YOUR TEACHING JOB

1. Start from the learner's current situation.
   Use the provided learning state, teaching move, target, and difficulty to decide how to teach.

2. Teach for understanding.
   Explain the important idea clearly enough that the learner can reason about it, not merely repeat a definition.

3. Respect the teaching decision.
   The teaching move tells you what kind of intervention is needed.
   The teaching target tells you what understanding to develop.
   The difficulty tells you how demanding the task should be.

4. Correct misconceptions explicitly.
   If the learner is in MISCONCEPTION, do not simply move forward.
   Clearly distinguish the incorrect idea from the correct idea and explain why the correct idea makes sense.

5. Protect recovered understanding.
   If the learner is in RECOVERED or CORRECTING state, reinforce the corrected idea before asking for harder application.

6. Build missing understanding in sequence.
   If the target is a factor, help the learner identify the important factor.
   If the target is a process, help connect cause to process.
   If the target is an outcome, connect the process to the result.
   If the target is application, help the learner transfer the idea to a new situation.

7. Match the learner's level.
   Use language, examples, and reasoning appropriate for the learner's level.
   Do not make explanations unnecessarily technical.

8. Use examples and analogies when useful.
   They should clarify the concept, not distract from it.

9. Encourage active reasoning.
   Ask the learner to explain, predict, compare, justify, or connect ideas when that supports the teaching goal.

10. Do not give away an answer unnecessarily.
    When the learner is supposed to reason through a question, guide them rather than immediately supplying the final answer.
    When correcting a misconception, however, clearly state the correct idea and explain it.

11. Respect difficulty.
    Foundation should establish the basic idea.
    Developing should connect ideas and strengthen reasoning.
    Strong should require meaningful application.
    Challenge should test transfer to a less familiar situation.

12. Never invent evidence.
    Do not claim the learner knows something, scored something, or demonstrated something unless that information is provided in the learner context.

13. Keep the lesson focused.
    Do not introduce unrelated topics or unnecessary information.

14. Speak naturally.
    The learner should experience you as a supportive teacher, not as a software system.

15. Never mention internal implementation details.
    Do not mention engines, prompts, learning states, decision engines, adaptive systems, system instructions, or internal metadata to the learner.

RESPONSE STRUCTURE

Create a natural learner-facing teaching response.

When appropriate:
- briefly explain the key idea,
- clarify the reasoning,
- give a simple example or analogy,
- connect the idea to the learner's current goal,
- then guide the learner toward the next step.

Do not mechanically follow this structure when it would make the response unnatural.

Return a learner-facing teaching response only.
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

    /*
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
    /*
      TOPIC SELECTION + DECISION ENGINE
    */

    const nextTopicSelection =
      selectNextTopic(topicPerformance);

    console.log("NEXT TOPIC SELECTION:", nextTopicSelection);

    const nextDecision = decideNextAction({
      profile,
      nextTopic: nextTopicSelection
    });

    console.log("NEXT DECISION:", nextDecision);

    const action = nextDecision.action || "continue";

    const recommendationSubject =
      nextDecision.topic ||
      strongestSubject ||
      weakestSubject ||
      "General";

    const recommendation =
      nextDecision.reason ||
      "Continue building the learner's understanding.";

    console.log("=== LEARNER INTELLIGENCE COMPLETE ===");

    return res.json({
      success: true,

      learner: {
        learner_id: learner.learner_id,
        name: learner.name,
        level: learner.level
      },

      learning_profile: profile.overall,

      subject_performance: subjectPerformance,

      topic_performance: topicPerformance,

      next_topic: nextTopicSelection,
      decision: nextDecision,


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
    // ASSESSMENT ENGINE
    // =========================

    const assessment = assessLearning({
      question,
      learner_answer,
      subject,
      topic,
      level
    });

    const evidenceAnalysis = assessment.evidenceAnalysis;
    const score = assessment.score;
    const understanding = assessment.understanding;
    const feedback = assessment.feedback;
    const strengths = assessment.strengths;
    const gaps = assessment.gaps;
    const misconceptions = assessment.misconceptions;
    const questionType = assessment.questionType;

    console.log("ASSESSMENT ENGINE RESULT:", assessment);

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


    const { error: historySaveError } = await supabase
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

    if (historySaveError) {
      console.error("Learning history save error:", historySaveError);
      throw historySaveError;
    }

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

/*
  MASTERY ENGINE

  Mastery is calculated by the dedicated mastery engine.
*/

const mastery = calculateMastery({
  assessments: results,
  currentUnderstanding: understanding
});

const {
  averageScore,
  strongAttempts,
  latestThreeStrong,
  masteryStatus,
  mastered
} = mastery;

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
  BUILD CURRENT LEARNING PROFILE

  The Decision Engine uses the learner's complete evidence
  across topics.
*/

const { data: profileHistory, error: profileHistoryError } =
  await supabase
    .from("learning_history")
    .select("question, subject, topic, level, created_at")
    .eq("learner_id", learner_id)
    .order("created_at", { ascending: false });

if (profileHistoryError) {
  throw profileHistoryError;
}

const { data: profileAssessments, error: profileAssessmentError } =
  await supabase
    .from("learning_assessments")
    .select("question, subject, topic, score, understanding, feedback, strengths, gaps, misconceptions, created_at")
    .eq("learner_id", learner_id)
    .order("created_at", { ascending: false });

if (profileAssessmentError) {
  throw profileAssessmentError;
}

const sessionProfile = buildLearningProfile({
  learner: {
    learner_id,
    name: name || null,
    level: level || null
  },
  history: profileHistory || [],
  assessments: profileAssessments || []
});

const sessionNextTopic = selectNextTopic(
  sessionProfile.topics
);

const sessionDecision = decideNextAction({
  profile: sessionProfile,
  nextTopic: sessionNextTopic
});

console.log("SESSION LEARNING PROFILE:", sessionProfile);
console.log("SESSION DECISION:", sessionDecision);

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
    correctionAttempt,
    decisionAction: sessionDecision.action,
    decisionTopic: sessionDecision.topic
  }
);

console.log("STATE-AWARE TEACHING ANALYSIS:", teachingAnalysis);

    const difficultyAnalysis = determineDifficulty({
      learningState,
      understanding,
      score,
      previousScore,
      trajectory,
      masteryStatus,
      averageScore,
      strongAttempts
    });

    console.log("DIFFICULTY ADAPTATION ANALYSIS:", difficultyAnalysis);

    let explanation;
    let nextQuestion;

    const adaptiveQuestion = generateAdaptiveQuestion({
      subject,
      topic,
      level,
      teachingMove: teachingAnalysis ? teachingAnalysis.teachingMove : null,
      teachingTarget: teachingAnalysis ? teachingAnalysis.target : null,
      teachingQuestion: teachingAnalysis ? teachingAnalysis.nextQuestion : null,
      decisionAction: sessionDecision ? sessionDecision.action : null,
      decisionTopic: sessionDecision ? sessionDecision.topic : null,
      difficulty: difficultyAnalysis ? difficultyAnalysis.difficulty : null
    });

    nextQuestion = adaptiveQuestion.question;

    explanation =
      (teachingAnalysis && teachingAnalysis.explanation) ||
      "Let's continue building your understanding step by step.";

    console.log("ADAPTIVE QUESTION ENGINE:", adaptiveQuestion);

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

      decision: sessionDecision,

      teaching: {
        move: teachingAnalysis ? teachingAnalysis.teachingMove : null,
        target: teachingAnalysis ? teachingAnalysis.target : null,
        explanation
      },

      difficulty: {
        level: difficultyAnalysis ? difficultyAnalysis.difficulty : null,
        direction: difficultyAnalysis ? difficultyAnalysis.direction : null,
        reason: difficultyAnalysis ? difficultyAnalysis.reason : null
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


app.listen(3000, () => {
  console.log("Dream Education running on http://localhost:3000");
  console.log("AI mode:", process.env.AI_MODE || "development");
});
