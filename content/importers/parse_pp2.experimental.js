const fs = require("fs");

const input = "content/work/pp2.txt";
const output = "content/curriculum/kenya/pp2_raw.json";

const text = fs.readFileSync(input, "utf8");

const lines = text
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);

const records = [];

let currentStrand = null;
let currentSubstrand = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  const strandMatch = line.match(
    /^(\d+(?:\.\d+)?)\.?\s+([A-Z][A-Z0-9 &,'()\/-]{2,})$/
  );

  if (strandMatch) {
    currentStrand = strandMatch[2].trim();
    currentSubstrand = null;
  }

  if (/^Substrand$/i.test(line)) {
    currentSubstrand = line;
  }

  if (
    /Specific Learning Outcomes|Suggested learning outcomes/i.test(line) ||
    /Suggested Learning Experiences/i.test(line) ||
    /Key Inquiry Questions/i.test(line)
  ) {
    records.push({
      line: i + 1,
      strand: currentStrand,
      sub_strand: currentSubstrand,
      marker: line
    });
  }
}

const result = {
  source: {
    title: "Pre Primary Two Curriculum Designs",
    level: "Pre-Primary Two",
    country: "Kenya",
    curriculum: "CBC",
    publisher: "Kenya Institute of Curriculum Development",
    source_file: input,
    source_type: "official_kicd_pdf"
  },
  extraction: {
    total_lines: lines.length,
    structural_markers: records
  }
};

fs.writeFileSync(output, JSON.stringify(result, null, 2));

console.log("PP2 RAW PARSER COMPLETE");
console.log("Lines:", lines.length);
console.log("Structural markers:", records.length);
console.log("Saved:", output);
