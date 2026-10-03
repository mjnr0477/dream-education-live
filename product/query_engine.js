const STOP_WORDS = new Set([
  "what","is","are","the","a","an","of","to","for","me",
  "please","explain","simply","simple","teach","tell","about",
  "how","why","can","you","give","show","does","do",
  "this","that","with","from","and","in","on","my","its"
]);

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function detectIntent(q) {
  /*
   * QUESTION UNDERSTANDING PRIORITY
   *
   * Understand the requested task before interpreting generic
   * question words such as "what is".
   */

  // Learner explicitly signals that they need help understanding.
  if (
    /\b(i do not understand|i don't understand|dont understand|i need help understanding|i am confused|i'm confused|im confused|i am struggling|i'm struggling|im struggling)\b/.test(q)
  ) {
    return "learning_help";
  }

  // Comparison.
  if (
    /\b(vs|versus|difference between|different from|compare|comparison)\b/.test(q)
  ) {
    return "comparison";
  }

  // Numerical/problem-solving requests must be detected before
  // "what is", because "what is 20% of 500" is a calculation.
  if (
    /\b(solve|calculate|work out|find the value|evaluate|determine)\b/.test(q) ||
    /\d+(?:\.\d+)?\s*%\s*(?:of|from)\s*\d+/i.test(q) ||
    /\bwhat is\b.*\d.*(?:%|\+|-|\*|\/|=)/i.test(q) ||
    /\bwhat is\b.*\d+\s+of\s+\d+/i.test(q)
  ) {
    return "problem_solving";
  }

  // Definitions.
  if (
    /^(what is|what are|define|definition of)\b/.test(q)
  ) {
    return "definition";
  }

  // Examples.
  if (
    /\b(example|examples|give me an example)\b/.test(q)
  ) {
    return "example";
  }

  // Procedures.
  if (
    /\b(how to|steps|procedure|process)\b/.test(q)
  ) {
    return "procedure";
  }

  // Causal questions.
  if (
    /\b(why|what causes|what caused|cause of|reason for|how does .* cause|what makes)\b/.test(q)
  ) {
    return "explanation";
  }

  // General explanations.
  if (
    /\b(explain|how does|how do|teach me|tell me how|tell me about)\b/.test(q)
  ) {
    return "explanation";
  }

  return "general";
}

function detectQuestionType(q, intent) {
  if (intent === "problem_solving") {
    if (/\b(equation|solve for|unknown)\b/.test(q) ||
        /[a-z]\s*[\+\-\*\/=]\s*\d/i.test(q)) return "equation";
    if (/\b(speed|distance|time|velocity|acceleration|force|mass|energy|power|work|density|pressure)\b/.test(q)) return "word_problem";
    if (/\d/.test(q)) return "calculation";
    return "problem";
  }

  if (intent === "comparison") return "comparison";
  if (intent === "definition") return "definition";
  if (intent === "example") return "example";
  if (intent === "procedure") return "procedure";
  if (intent === "explanation") return "conceptual_explanation";

  return "general_question";
}

function detectSubject(q) {
  // Specific scientific concepts must outrank generic mathematics words.
  // "time" and "distance" can appear in mathematics, but relativity/time
  // dilation questions are physics questions.
  if (/\b(speed of light|light in a vacuum|speed of light in vacuum|relativity|relative time|time is relative|time relative|time dilation|gravitational time dilation|special relativity|general relativity)\b/.test(q)) {
    return "physics";
  }

  if (
    /\b(algebra|equation|math|mathematics|geometry|fraction|fractions|percentage|percentages|ratio|probability|statistics|calculus|trigonometry|mean|median|mode|area|volume|speed|distance|time)\b/.test(q) ||
    /[a-z]\s*[=+\-*/]\s*\d/i.test(q) ||
    /\d\s*[=+\-*/]\s*[a-z]/i.test(q)
  ) return "mathematics";
  if (/\b(force|motion|velocity|acceleration|energy|momentum|gravity|gravitation|mass|weight|fall|falling|electricity|current|voltage|resistance|pressure|density|wave|waves|light|physics)\b/.test(q)) return "physics";
  if (/\b(atom|atoms|molecule|molecules|element|elements|compound|compounds|reaction|reactions|acid|base|salt|organic|chemistry|chemical)\b/.test(q)) return "chemistry";
  if (/\b(cell|cells|photosynthesis|respiration|ecosystem|ecosystems|organism|organisms|genetics|mitosis|meiosis|biology|plant|plants|animal|animals|human body)\b/.test(q)) return "biology";
  if (/\b(programming|javascript|python|java|html|css|algorithm|algorithms|code|coding|computer|software|database|databases)\b/.test(q)) return "computer_science";
  if (/\b(history|geography|government|citizenship|society|economics|business|accounting)\b/.test(q)) return "humanities_social_sciences";
  return "general";
}

function detectTopic(q, subject) {
  // Specific physics concepts must outrank the generic speed/distance/time topic.
  const topics = [
    [/\b(relativity|relative time|time is relative|time relative|time dilation|gravitational time dilation|special relativity|general relativity)\b/, "relativity"],
    [/\b(speed of light|light in a vacuum|speed of light in vacuum)\b/, "waves_and_light"],
    [/\b(algebra|equation|equations)\b/, "algebra"],
    [/\b(fraction|fractions)\b/, "fractions"],
    [/\b(percentage|percentages)\b/, "percentages"],
    [/\b(ratio|ratios)\b/, "ratio"],
    [/\b(probability)\b/, "probability"],
    [/\b(statistics|mean|median|mode)\b/, "statistics"],
    [/\b(geometry|area|volume)\b/, "geometry"],
    [/\b(calculus)\b/, "calculus"],
    [/\b(trigonometry)\b/, "trigonometry"],
    [/\b(speed|distance|time)\b/, "speed_distance_time"],
    [/\b(gravity|gravitation|fall|falling)\b/, "gravity"],
    [/\b(mass|weight)\b/, "mass_and_weight"],
    [/\b(force|motion|velocity|acceleration)\b/, "mechanics"],
    [/\b(energy|power|work)\b/, "energy"],
    [/\b(electricity|current|voltage|resistance)\b/, "electricity"],
    [/\b(pressure|density)\b/, "properties_of_matter"],
    [/\b(wave|waves|light)\b/, "waves_and_light"],
    [/\b(photosynthesis)\b/, "photosynthesis"],
    [/\b(cell|cells)\b/, "cells"],
    [/\b(respiration)\b/, "respiration"],
    [/\b(genetics)\b/, "genetics"],
    [/\b(mitosis|meiosis)\b/, "cell_division"],
    [/\b(atom|atoms|molecule|molecules|element|elements)\b/, "atomic_structure"],
    [/\b(compound|compounds|reaction|reactions)\b/, "chemical_reactions"],
    [/\b(acid|base|salt)\b/, "acids_bases_and_salts"],
    [/\b(programming|coding|code)\b/, "programming"],
    [/\b(javascript|python|java)\b/, "programming_languages"],
    [/\b(algorithm|algorithms)\b/, "algorithms"],
    [/\b(database|databases)\b/, "databases"]
  ];

  for (const [pattern, topic] of topics) {
    if (pattern.test(q)) return topic;
  }

  // Mathematical expressions without explicit topic words
  if (
    /[a-z]\s*[=+\-*/]\s*\d/i.test(q) ||
    /\d\s*[=+\-*/]\s*[a-z]/i.test(q)
  ) {
    return "algebra";
  }

  // A subject is not automatically a topic.
  // If the question contains no specific topic, leave topic unknown
  // rather than incorrectly returning values such as "biology".
  return null;
}

function detectRequirements(q, intent, type) {
  return {
    requires_calculation:
      type === "calculation" ||
      type === "equation" ||
      type === "word_problem" ||
      /\b(calculate|solve|evaluate|find the value|work out|find)\b/.test(q),

    requires_formula:
      type === "calculation" ||
      type === "equation" ||
      type === "word_problem" ||
      /\b(formula|equation|law|theorem)\b/.test(q),

    requires_steps:
      intent === "procedure" ||
      intent === "problem_solving" ||
      /\b(step by step|steps|show your working|show working)\b/.test(q),

    requires_comparison:
      intent === "comparison",

    requires_current_information:
      /\b(current|today|latest|now|recent|this year|president|minister|weather|news)\b/.test(q)
  };
}

/*
 * ============================================================
 * QUESTION UNDERSTANDING LAYER
 * ============================================================
 *
 * This layer interprets what the learner is trying to ask.
 * Topic detection remains useful, but it is no longer treated
 * as the meaning of the question.
 */

function cleanConceptPhrase(value) {
  return String(value || "")
    .replace(/[?!.,;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .replace(
      /^(the|a|an|term|meaning|definition|concept|idea|topic|about)\b/i,
      ""
    )
    .trim();
}

function extractQuestionConcept(q, intent) {
  let match = null;

  if (intent === "definition") {
    match =
      q.match(/^define(?:\s+the)?(?:\s+term)?\s+(.+?)(?:\?|$)/i) ||
      q.match(/^definition of\s+(.+?)(?:\?|$)/i) ||
      q.match(/^what is\s+(?:the\s+)?(?:term\s+)?(.+?)(?:\?|$)/i) ||
      q.match(/^what are\s+(?:the\s+)?(?:term\s+)?(.+?)(?:\?|$)/i);

    if (match && match[1]) {
      return cleanConceptPhrase(match[1]);
    }
  }

  if (intent === "comparison") {
    match =
      q.match(/difference between\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i) ||
      q.match(/compare\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i);

    if (match && match[1] && match[2]) {
      return cleanConceptPhrase(match[1]) + " and " + cleanConceptPhrase(match[2]);
    }
  }

  if (intent === "explanation") {
    match =
      q.match(/^why\s+(?:do|does|did|is|are|was|were|can|can\s+not|cannot)\s+(.+?)(?:\?|$)/i) ||
      q.match(/^why\s+(.+?)(?:\?|$)/i) ||
      q.match(/^what causes\s+(.+?)(?:\?|$)/i) ||
      q.match(/^what caused\s+(.+?)(?:\?|$)/i) ||
      q.match(/^cause of\s+(.+?)(?:\?|$)/i) ||
      q.match(/^explain\s+(.+?)(?:\?|$)/i) ||
      q.match(/^how does\s+(.+?)(?:\?|$)/i) ||
      q.match(/^how do\s+(.+?)(?:\?|$)/i);

    if (match && match[1]) {
      return cleanConceptPhrase(match[1]);
    }
  }

  if (intent === "procedure") {
    match =
      q.match(/^how to\s+(.+?)(?:\?|$)/i) ||
      q.match(/^how do i\s+(.+?)(?:\?|$)/i) ||
      q.match(/^steps to\s+(.+?)(?:\?|$)/i);

    if (match && match[1]) {
      return cleanConceptPhrase(match[1]);
    }
  }

  if (intent === "learning_help") {
    match =
      q.match(/(?:understand|confused about|struggling with|help with)\s+(.+?)(?:\?|$)/i);

    if (match && match[1]) {
      return cleanConceptPhrase(match[1]);
    }
  }

  return null;
}

function detectAmbiguity(q, intent, concept) {
  const text = String(q || "").trim();

  const tooShort =
    text.split(/\s+/).filter(Boolean).length < 2;

  const contradictory =
    /\b(?:what is|define)\b.*\b(?:why|how|compare)\b/i.test(text);

  const incomplete =
    /^(what|why|how|define|explain|tell me|calculate|find)\s*$/i.test(text);

  const unclearConcept =
    !concept &&
    (
      intent === "definition" ||
      intent === "comparison" ||
      intent === "explanation" ||
      intent === "procedure" ||
      intent === "learning_help"
    );

  return {
    ambiguous: tooShort || contradictory || incomplete || unclearConcept,
    reasons: [
      tooShort ? "question_too_short" : null,
      contradictory ? "mixed_question_intents" : null,
      incomplete ? "incomplete_question" : null,
      unclearConcept ? "requested_concept_not_identified" : null
    ].filter(Boolean)
  };
}

function understandQuestion(q, intent, subject, topic, question_type) {
  const concept = extractQuestionConcept(q, intent);
  const ambiguity = detectAmbiguity(q, intent, concept);

  let requested_task = "answer_question";

  if (intent === "definition") requested_task = "define";
  else if (intent === "problem_solving") requested_task = "solve";
  else if (intent === "comparison") requested_task = "compare";
  else if (intent === "explanation") requested_task = "explain";
  else if (intent === "procedure") requested_task = "teach_procedure";
  else if (intent === "example") requested_task = "give_example";
  else if (intent === "learning_help") requested_task = "help_understand";

  let confidence = 0.65;

  if (concept) confidence += 0.20;
  if (subject !== "general") confidence += 0.05;
  if (topic) confidence += 0.05;
  if (ambiguity.ambiguous) confidence -= 0.35;

  confidence = Math.max(0, Math.min(1, confidence));

  return {
    requested_task,
    concept,
    question_focus: concept || topic || null,
    ambiguity: ambiguity.ambiguous,
    ambiguity_reasons: ambiguity.reasons,
    needs_clarification: ambiguity.ambiguous,
    confidence
  };
}

function buildSearchTerms(q) {
  return q
    .replace(/[?!.,;:()[\]{}]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

function analyzeQuery(query, context = {}) {
  const original = String(query || "").trim();
  const normalized = normalizeText(original);

  const selected_subject = String(
    context?.subject || context?.selected_subject || ""
  ).trim();

  const selected_topic = String(
    context?.topic || context?.selected_topic || ""
  ).trim();

  const level = String(context?.level || "").trim() || null;

  // The question itself is the primary source of meaning.
  // Selected subject/topic are optional context and must never
  // blindly replace what the learner actually asked.
  const intent = detectIntent(normalized);
  const question_type = detectQuestionType(normalized, intent);

  let inferred_subject = detectSubject(normalized);
  let inferred_topic = detectTopic(normalized, inferred_subject);

  // Clear task structure can reveal the domain even when the
  // learner never names the subject.
  if (
    inferred_subject === "general" &&
    (
      question_type === "calculation" ||
      question_type === "equation" ||
      /\b(percentage|percent|fraction|ratio|probability|mean|median|mode|area|volume|algebra|equation|calculate|calculate|evaluate)\b/.test(normalized) ||
      /\d\s*[+\-*/=]\s*\d/.test(normalized)
    )
  ) {
    inferred_subject = "mathematics";
    inferred_topic = detectTopic(normalized, inferred_subject);
  }

  const questionUnderstanding = understandQuestion(
    normalized,
    intent,
    inferred_subject,
    inferred_topic,
    question_type
  );

  const questionSubject = String(inferred_subject || "").trim().toLowerCase();
  const questionTopic = String(inferred_topic || "").trim().toLowerCase();
  const contextSubject = selected_subject.toLowerCase();
  const contextTopic = selected_topic.toLowerCase();

  const subjectConflict =
    Boolean(contextSubject && questionSubject) &&
    questionSubject !== "general" &&
    contextSubject !== questionSubject;

  const topicConflict =
    Boolean(contextTopic && questionTopic) &&
    questionTopic !== contextTopic &&
    !questionTopic.includes(contextTopic) &&
    !contextTopic.includes(questionTopic);

  const context_conflict = subjectConflict || topicConflict;

  const context_used =
    Boolean(selected_subject || selected_topic) &&
    !context_conflict;

  const effective_subject =
    inferred_subject !== "general"
      ? inferred_subject
      : (context_conflict ? inferred_subject : selected_subject || inferred_subject);

  const effective_topic =
    inferred_topic ||
    (context_conflict ? null : selected_topic) ||
    null;

  const requirements = detectRequirements(
    normalized,
    intent,
    question_type
  );

  let search_terms = [
    ...new Set(buildSearchTerms(normalized))
  ];

  // Remove generic task words when the understanding layer has
  // already identified the actual concept/focus.
  const understandingStopWords = new Set([
    "define",
    "definition",
    "term",
    "explain",
    "why",
    "causes",
    "caused",
    "cause",
    "how",
    "does",
    "do",
    "did",
    "what",
    "are",
    "is",
    "me",
    "about",
    "please",
    "understand",
    "understanding",
    "confused",
    "confusion",
    "help",
    "dont",
    "don't",
    "i",
    "am",
    "im"
  ]);

  search_terms = search_terms.filter(
    word => !understandingStopWords.has(word)
  );

  const search_query = [
    questionUnderstanding.concept,
    ...search_terms
  ]
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .join(" ")
    .trim();

  // The understanding concept is already included when it contributes
  // to the search. Do not duplicate the same phrase.
  const normalizedConcept =
    String(questionUnderstanding.concept || "").trim().toLowerCase();

  const normalizedSearchTerms = search_terms
    .map(term => String(term || "").trim())
    .filter(Boolean);

  const finalSearchTerms = normalizedSearchTerms.filter(term => {
    const lower = term.toLowerCase();
    return !normalizedConcept ||
      lower !== normalizedConcept;
  });

  const final_search_query = (() => {
    const concept = String(questionUnderstanding.concept || "").trim();
    const terms = finalSearchTerms
      .map(term => String(term || "").trim())
      .filter(Boolean);

    if (!concept) {
      return [...new Set(terms)].join(" ").trim();
    }

    const conceptWords = new Set(
      concept.toLowerCase().split(/\s+/).filter(Boolean)
    );

    const remainingTerms = terms.filter(term => {
      return !conceptWords.has(term.toLowerCase());
    });

    return [concept, ...new Set(remainingTerms)].join(" ").trim();
  })();

  return {
    original,
    normalized,
    intent,
    subject: effective_subject,
    topic: effective_topic,
    inferred_subject,
    inferred_topic,
    selected_subject: selected_subject || null,
    selected_topic: selected_topic || null,
    level,
    context_used,
    context_conflict,
    question_type,
    ...requirements,

    requested_task: questionUnderstanding.requested_task,
    concept: questionUnderstanding.concept,
    question_focus: questionUnderstanding.question_focus,
    ambiguity: questionUnderstanding.ambiguity,
    ambiguity_reasons: questionUnderstanding.ambiguity_reasons,
    needs_clarification: questionUnderstanding.needs_clarification,
    confidence: questionUnderstanding.confidence,

    search_terms,
    search_query: final_search_query || search_query || normalized,

    understanding: {
      subject: effective_subject,
      topic: effective_topic,
      inferred_subject,
      inferred_topic,
      selected_subject: selected_subject || null,
      selected_topic: selected_topic || null,
      level,
      context_used,
      context_conflict,
      intent,
      question_type,
      ...requirements,
      requested_task: questionUnderstanding.requested_task,
      concept: questionUnderstanding.concept,
      question_focus: questionUnderstanding.question_focus,
      ambiguity: questionUnderstanding.ambiguity,
      ambiguity_reasons: questionUnderstanding.ambiguity_reasons,
      needs_clarification: questionUnderstanding.needs_clarification,
      confidence: questionUnderstanding.confidence
    }
  };
}

module.exports = {
  analyzeQuery,
  normalizeText,
  detectIntent,
  detectQuestionType,
  detectSubject,
  detectTopic,
  detectRequirements
};

if (require.main === module) {
  const query = process.argv.slice(2).join(" ");
  console.log(JSON.stringify(analyzeQuery(query), null, 2));
}