const { analyzeConceptEvidence } = require("./concept_evidence_engine");

function assessLearning({
  question,
  learner_answer,
  subject = "",
  topic = "",
  level = ""
}) {
  const answer = String(learner_answer || "")
    .trim()
    .toLowerCase();

  const questionText = String(question || "")
    .trim()
    .toLowerCase();

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
  */

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
    CONCEPT EVIDENCE ENGINE
  */

  const evidenceAnalysis = analyzeConceptEvidence(
    question,
    learner_answer,
    {
      subject,
      topic,
      level
    }
  );

  /*
    APPLICATION ASSESSMENT

    Concept Evidence is authoritative for application
    reasoning.
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
      photosynthesisQuestionText.includes(
        "what do you think a plant uses sunlight for"
      ) ||
      photosynthesisQuestionText.includes(
        "what does sunlight do"
      );

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

    } else if (
      asksBesidesSunlight &&
      mentionsCarbon &&
      mentionsWater
    ) {
      score = 100;
      understanding = "strong";

      feedback =
        "Excellent. You correctly identified carbon dioxide and water as the important inputs besides sunlight.";

      strengths =
        "The learner correctly identified carbon dioxide and water as requirements for photosynthesis.";

      gaps =
        "No major knowledge gap detected for this question.";

    } else if (
      asksWhatGas &&
      mentionsCarbon
    ) {
      score = 100;
      understanding = "strong";

      feedback =
        "Correct. The gas the plant takes in for photosynthesis is carbon dioxide.";

      strengths =
        "The learner correctly identified carbon dioxide as an input to photosynthesis.";

      gaps =
        "No major knowledge gap detected for this question.";

    } else if (
      asksSunlightRole &&
      mentionsFood
    ) {
      score = 90;
      understanding = "strong";

      feedback =
        "Excellent. You understand that the plant uses sunlight to help make food through photosynthesis.";

      strengths =
        "The learner connected sunlight with food production.";

      gaps =
        "No major knowledge gap detected for this question.";

    } else if (
      asksSunlightRole &&
      mentionsLight
    ) {
      score = 65;
      understanding = "partial";

      feedback =
        "Good start. You recognized that sunlight is important. Now let's explain what role its energy plays in making food.";

      strengths =
        "The learner recognized the importance of sunlight.";

      gaps =
        "The role of light energy in photosynthesis needs further explanation.";

    } else if (
      mentionsLight &&
      mentionsCarbon &&
      mentionsWater &&
      mentionsFood
    ) {
      score = 100;
      understanding = "strong";

      feedback =
        "Excellent. Your answer identifies the main inputs and the food produced through photosynthesis.";

      strengths =
        "The learner identified light, carbon dioxide, water, and food production.";

      gaps =
        "No major knowledge gap detected.";

    } else if (
      mentionsLight &&
      mentionsCarbon &&
      mentionsWater
    ) {
      score = 90;
      understanding = "strong";

      feedback =
        "Very good. You identified the three major requirements for photosynthesis.";

      strengths =
        "The learner identified light, carbon dioxide, and water.";

      gaps =
        "The learner could further explain what the plant produces.";

    } else if (
      mentionsLight &&
      (mentionsCarbon || mentionsWater)
    ) {
      score = 65;
      understanding = "partial";

      feedback =
        "Good start. You identified some important requirements, but your explanation is incomplete.";

      strengths =
        "The learner identified some requirements for photosynthesis.";

      gaps =
        "One or more important requirements for photosynthesis are missing.";

    } else if (
      mentionsLight ||
      mentionsFood
    ) {
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
    MISCONCEPTION ENGINE
  */

  if (
    topic &&
    topic.toLowerCase().includes("photosynthesis")
  ) {

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

    } else if (
      answer.includes("sunlight is food") ||
      answer.includes("sunlight is the food") ||
      answer.includes("light is food") ||
      answer.includes("light is the food") ||
      answer.includes("food is sunlight")
    ) {
      misconceptions =
        "The learner appears to confuse sunlight, which provides energy for photosynthesis, with the food produced by the plant.";

    } else if (
      answer.includes("water is food") ||
      answer.includes("water is the food") ||
      answer.includes("food is water") ||
      answer.includes("plant makes water as food")
    ) {
      misconceptions =
        "The learner appears to confuse water, an input to photosynthesis, with the food produced by the plant.";

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

    } else if (
      answer.includes("sunlight becomes food") ||
      answer.includes("sunlight turns into food") ||
      answer.includes("light becomes food") ||
      answer.includes("light turns into food")
    ) {
      misconceptions =
        "The learner appears to believe that sunlight itself is directly converted into food, rather than providing energy for the photosynthesis process.";

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
  */

  if (
    misconceptions !== "No clear misconception detected." &&
    misconceptions.includes("oxygen with carbon dioxide")
  ) {
    understanding = "misconception";

    feedback =
      "You have identified a gas involved in plant processes, but there is an important distinction to correct: during photosynthesis, plants take in carbon dioxide, while oxygen is released.";

    strengths =
      "The learner recognized that gases are involved in photosynthesis.";

    gaps =
      "The learner needs to distinguish carbon dioxide as an input from oxygen as a product of photosynthesis.";
  }

  /*
    CONCEPT EVIDENCE OVERRIDE

    Strong conceptual evidence remains authoritative.
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

  return {
    score,
    understanding,
    feedback,
    strengths,
    gaps,
    misconceptions,
    questionType,
    evidenceAnalysis
  };
}

module.exports = {
  assessLearning
};
