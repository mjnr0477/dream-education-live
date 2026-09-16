const fs = require("fs");
const path = require("path");

const KNOWLEDGE_FILE = path.join(
  __dirname,
  "curriculum",
  "kenya",
  "knowledge.json"
);

function loadKnowledge() {
  return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, "utf8"));
}

function getConcept({ subject, level, strand, topic, concept }) {
  const knowledge = loadKnowledge();

  return knowledge.subjects?.[subject]
    ?.levels?.[level]
    ?.strands?.[strand]
    ?.topics?.[topic]
    ?.concepts?.[concept] || null;
}

module.exports = {
  loadKnowledge,
  getConcept
};

function findRelevantContent({ subject, level, topic, question }) {
  const knowledge = loadKnowledge();
  const subjectData = knowledge.subjects?.[subject];
  if (!subjectData) return null;

  const levelData = subjectData.levels?.[level];
  if (!levelData) return null;

  const searchText = String(
    [topic, question].filter(Boolean).join(" ")
  ).trim().toLowerCase();

  const words = searchText
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 2);

  let bestMatch = null;
  let bestScore = 0;

  for (const [strandName, strand] of Object.entries(levelData.strands || {})) {
    for (const [topicName, topicData] of Object.entries(strand.topics || {})) {
      for (const [conceptName, concept] of Object.entries(topicData.concepts || {})) {

        const searchableContent = [
          strandName,
          topicName,
          conceptName,
          concept.definition,
          ...(concept.key_ideas || []),
          ...(concept.examples || [])
        ].join(" ").toLowerCase();

        const conceptWords = searchableContent
          .split(/[^a-z0-9]+/)
          .filter(word => word.length > 2);

        const matches = words.filter(word =>
          conceptWords.includes(word)
        ).length;

        const conceptNameLower = conceptName.toLowerCase();
        const questionText = String(question || "").trim().toLowerCase();

        let score = matches;

        if (questionText === conceptNameLower) {
          score += 100;
        }

        if (questionText.includes(conceptNameLower)) {
          score += 100;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            strand: strandName,
            topic: topicName,
            conceptName,
            concept
          };
        }
      }
    }
  }

  if (bestMatch && bestScore >= 2) {
    return {
      strand: bestMatch.strand,
      topic: bestMatch.topic,
      concepts: {
        [bestMatch.conceptName]: bestMatch.concept
      }
    };
  }

  const aliases = {
    "make their own food": "photosynthesis",
    "make food": "photosynthesis",
    "plants make food": "photosynthesis",
    "green plants": "photosynthesis",
    "plant food": "photosynthesis",
    "sunlight and plants": "photosynthesis"
  };

  for (const [phrase, conceptName] of Object.entries(aliases)) {
    if (searchText.includes(phrase)) {
      for (const [strandName, strand] of Object.entries(levelData.strands || {})) {
        for (const [topicName, topicData] of Object.entries(strand.topics || {})) {
          if (topicData.concepts?.[conceptName]) {
            return {
              strand: strandName,
              topic: topicName,
              concepts: topicData.concepts || {}
            };
          }
        }
      }
    }
  }

  return null;
}

module.exports.findRelevantContent = findRelevantContent;


// =====================================================
// UNIVERSAL CONTENT STRUCTURE
// =====================================================

const EDUCATION_STRUCTURE_FILE = path.join(
  __dirname,
  "curriculum",
  "education_structure.json"
);

const CONTENT_SCHEMA_FILE = path.join(
  __dirname,
  "curriculum",
  "content_schema.json"
);

function loadEducationStructure() {
  return JSON.parse(
    fs.readFileSync(EDUCATION_STRUCTURE_FILE, "utf8")
  );
}

function loadContentSchema() {
  return JSON.parse(
    fs.readFileSync(CONTENT_SCHEMA_FILE, "utf8")
  );
}

function getEducationLevels() {
  const structure = loadEducationStructure();

  return {
    basic_education: structure.basic_education,
    tertiary_education: structure.tertiary_education,
    advanced_knowledge: structure.advanced_knowledge
  };
}

function getContentSchema() {
  return loadContentSchema();
}

function getAvailableContent({ subject, level } = {}) {
  const knowledge = loadKnowledge();

  if (!subject) {
    return knowledge.subjects || {};
  }

  const subjectData = knowledge.subjects?.[subject];

  if (!subjectData) {
    return null;
  }

  if (!level) {
    return subjectData;
  }

  return subjectData.levels?.[level] || null;
}

function listContentHierarchy({ subject, level } = {}) {
  const levelData = getAvailableContent({ subject, level });

  if (!levelData) {
    return [];
  }

  const results = [];

  for (const [strandName, strand] of Object.entries(
    levelData.strands || {}
  )) {
    for (const [topicName, topicData] of Object.entries(
      strand.topics || {}
    )) {
      for (const [conceptName, concept] of Object.entries(
        topicData.concepts || {}
      )) {
        results.push({
          subject,
          level,
          strand: strandName,
          topic: topicName,
          concept: conceptName,
          definition: concept.definition || "",
          key_ideas: concept.key_ideas || [],
          skills: concept.skills || [],
          examples: concept.examples || [],
          applications: concept.applications || [],
          misconceptions: concept.misconceptions || [],
          questions: concept.questions || [],
          assessments: concept.assessments || [],
          learning_activities: concept.learning_activities || [],
          references: concept.references || []
        });
      }
    }
  }

  return results;
}

module.exports.loadEducationStructure = loadEducationStructure;
module.exports.loadContentSchema = loadContentSchema;
module.exports.getEducationLevels = getEducationLevels;
module.exports.getContentSchema = getContentSchema;
module.exports.getAvailableContent = getAvailableContent;
module.exports.listContentHierarchy = listContentHierarchy;


// ============================================================
// DREAM EDUCATION UNIVERSAL CONTENT RETRIEVAL
// ============================================================

const DREAM_CONTENT_FILE = path.join(
  __dirname,
  "curriculum",
  "kenya",
  "dream",
  "content.json"
);

function loadDreamContent() {
  if (!fs.existsSync(DREAM_CONTENT_FILE)) {
    return { schema_version: "1.0", country: "Kenya", curriculum: "CBC", content: [] };
  }

  return JSON.parse(fs.readFileSync(DREAM_CONTENT_FILE, "utf8"));
}

function findDreamContent({ level, grade_or_year, subject_or_discipline, question }) {
  const data = loadDreamContent();
  const q = String(question || "").toLowerCase();

  const matches = data.content.filter(item => {
    if (level && item.level !== level) return false;
    if (grade_or_year && item.grade_or_year !== grade_or_year) return false;
    if (
      subject_or_discipline &&
      item.subject_or_discipline !== subject_or_discipline
    ) return false;

    return true;
  });

  if (!matches.length) return null;

  let best = null;
  let bestScore = 0;

  for (const item of matches) {
    let score = 0;

    const fields = [
      item.topic,
      item.subtopic,
      item.concept,
      item.domain_or_strand,
      item.knowledge?.definition,
      ...(item.knowledge?.key_ideas || []),
      ...(item.knowledge?.examples || []),
      ...(item.knowledge?.questions || [])
    ];

    for (const field of fields) {
      if (!field) continue;

      const text = String(field).toLowerCase();

      if (q.includes(text)) score += 10;

      const words = text
        .split(/\s+/)
        .filter(word => word.length >= 4);

      for (const word of words) {
        if (q.includes(word)) score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  // Only return Dream Content when the question has a meaningful match.
  // Weak word overlap must never override external knowledge retrieval.
  if (!best || bestScore < 10) return null;

  return best;
}

module.exports.loadDreamContent = loadDreamContent;
module.exports.findDreamContent = findDreamContent;
