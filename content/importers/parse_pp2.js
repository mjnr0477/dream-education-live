const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "../work/pp2.txt");
const OUTPUT = path.join(__dirname, "../curriculum/kenya/pp2_curriculum.json");

const lines = fs.readFileSync(INPUT, "utf8").split(/\r?\n/);

const themes = [
  { title: "Our Neighbourhood", subtopics: ["Our neighbours","Families in the neighbourhood","Work done by our neighbours","Shops/kiosks in our neighbourhood","Physical features in our neighbourhood","Plants in our neighbourhood"] },
  { title: "My School", subtopics: ["My teachers","People in our school","Our school compound","Road to our school","Buildings in our schools"] },
  { title: "Animals", subtopics: ["Domestic animals","Wild animals","Pests"] },
  { title: "Weather Conditions", subtopics: ["Sunny","Cloudy","Rainy","Windy"] },
  { title: "Water", subtopics: ["Sources of water","Uses of water","Storage of water"] },
  { title: "Our Market", subtopics: ["Things found in the market","Buying and selling","People found at the market"] },
  { title: "Hospital/Dispensary", subtopics: ["People in the hospital/dispensary","Buildings in the hospital/dispensary","Activities in the hospital/dispensary","Clothes worn by people in the hospital/dispensary","Tools and items used in the hospital/dispensary"] },
  { title: "Time", subtopics: ["Telling time through daily routine","Days of the week","Public holidays","National days"] },
  { title: "Transport", subtopics: ["By people","By bicycles","By boat/ship","By motorcycles","By animals","By motor vehicles","By railway","By aeroplane"] }
];

const sections = [
  ["Language Activities", 330, 1939],
  ["Mathematical Activities", 1940, 3027],
  ["Psychomotor and Creative Activities", 3028, 4498],
  ["Environmental Activities", 4499, 6888],
  ["Islamic Religious Education Activities", 6889, 7403],
  ["Hindu Religious Education Activities", 7404, lines.length]
];

function clean(s) {
  return s.replace(/\s+/g, " ").trim();
}

function extractEntries(sectionLines, sourceStart) {
  const strands = [];
  let currentStrand = null;

  for (let i = 0; i < sectionLines.length; i++) {
    const line = clean(sectionLines[i]);

    if (!line) continue;

    /*
     * A curriculum table row commonly contains:
     *
     * 1.0 STRAND TITLE 1.1 SUB-STRAND TITLE By the end...
     *
     * Extract the strand title only from after N.0
     * until the N.N sub-strand code.
     */
    const strandMatch = line.match(
      /(\d+\.0)\s+(.+?)(?=\s+\d+\.\d+\s+|$)/
    );

    if (strandMatch) {
      const code = strandMatch[1];
      const title = clean(strandMatch[2]);

      if (
        title &&
        !/^(CURRICULUM|ESSENCE|GENERAL LEARNING|SUBJECT GENERAL)/i.test(title)
      ) {
        currentStrand = {
          code,
          title,
          sub_strands: [],
          source_line: sourceStart + i
        };

        strands.push(currentStrand);
      }
    }

    /*
     * Extract sub-strand title.
     *
     * Stop before the curriculum evidence column beginning
     * with "By the end..." or "By end...".
     */
    if (currentStrand) {
      const subMatches = [...line.matchAll(/(\d+\.\d+)\s+(.+?)(?=\s+By\s+(?:the\s+)?end\b|$)/gi)];

      for (const match of subMatches) {
        const code = match[1];
        let title = clean(match[2]);

        /*
         * If the line contains the strand code before the sub-strand,
         * only retain the portion after the sub-strand code.
         */
        title = title
          .replace(/^\d+\.0\s+.*?\s+/i, "")
          .trim();

        if (!title) continue;

        const alreadyExists = currentStrand.sub_strands.some(
          s => s.code === code
        );

        if (!alreadyExists) {
          currentStrand.sub_strands.push({
            code,
            title,
            source_line: sourceStart + i
          });
        }
      }
    }
  }

  return strands;
}

function parseSection(name, start, end) {
  const sectionLines = lines.slice(start - 1, end);

  /*
   * Psychomotor has another hierarchy:
   *
   * Psychomotor and Creative Activities
   *   Art Activities
   *     Strand
   *       Sub-strand
   *
   * The current extraction recognizes the known activity
   * sub-area headings and keeps their strands separate.
   */
  const activitySubAreaNames = [
    "Art Activities",
    "Music Activities",
    "Outdoor Activities"
  ];

  const hasSubAreas =
    name === "Psychomotor and Creative Activities";

  const result = {
    name,
    source_line_start: start,
    source_line_end: end,
    activity_sub_areas: [],
    strands: [],
    raw_text: sectionLines.join("\n")
  };

  if (!hasSubAreas) {
    result.strands = extractEntries(sectionLines, start);
    return result;
  }

  let currentArea = null;
  let buffer = [];
  let bufferStart = start;

  function flushBuffer() {
    if (!currentArea || buffer.length === 0) return;

    const strands = extractEntries(buffer, bufferStart);

    currentArea.strands.push(...strands);

    buffer = [];
  }

  for (let i = 0; i < sectionLines.length; i++) {
    const line = clean(sectionLines[i]);

    if (activitySubAreaNames.includes(line)) {
      flushBuffer();

      currentArea = {
        name: line,
        strands: []
      };

      result.activity_sub_areas.push(currentArea);
      bufferStart = start + i + 1;
      continue;
    }

    if (currentArea) {
      buffer.push(sectionLines[i]);
    }
  }

  flushBuffer();

  return result;
}

const curriculum = {
  schema_version: "3.1",

  source: {
    country: "Kenya",
    curriculum: "CBC",
    level: "Pre-Primary",
    grade: "PP2",
    source_file:
      "content/sources/kicd/pre_primary/PP2-Curriculum-Designs-Dec-2017.pdf",
    extracted_text: "content/work/pp2.txt",
    source_registry:
      "content/curriculum/kenya/source_registry.json"
  },

  themes,

  activity_areas: sections.map(([name, start, end]) =>
    parseSection(name, start, end)
  )
};

fs.writeFileSync(
  OUTPUT,
  JSON.stringify(curriculum, null, 2),
  "utf8"
);

let totalStrands = 0;
let totalSubStrands = 0;
let totalSubAreas = 0;

for (const area of curriculum.activity_areas) {
  totalStrands += area.strands.length;

  for (const strand of area.strands) {
    totalSubStrands += strand.sub_strands.length;
  }

  totalSubAreas += area.activity_sub_areas.length;

  for (const subArea of area.activity_sub_areas) {
    totalStrands += subArea.strands.length;

    for (const strand of subArea.strands) {
      totalSubStrands += strand.sub_strands.length;
    }
  }
}

console.log("PP2 STRUCTURE PARSER UPDATED");
console.log("Activity areas:", curriculum.activity_areas.length);
console.log("Activity sub-areas:", totalSubAreas);
console.log("Strands:", totalStrands);
console.log("Sub-strands:", totalSubStrands);
console.log("Themes:", curriculum.themes.length);
console.log("Saved:", OUTPUT);
