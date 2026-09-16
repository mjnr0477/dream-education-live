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

