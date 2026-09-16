const fs = require("fs");

const input = "content/curriculum/kenya/raw/pp2_source.json";
const output = "content/curriculum/kenya/raw/pp2_sections.json";

const source = JSON.parse(fs.readFileSync(input, "utf8"));

const sections = [];

for (const area of source.activity_areas) {
  const lines = area.raw_text.split(/\r?\n/);

  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const clean = raw.replace(/\s+/g, " ").trim();

    if (!clean) continue;

    /*
     * A curriculum row normally begins with:
     * 1.0 ...
     * 2.0 ...
     * 1.1 ...
     * etc.
     *
     * We preserve the entire text rather than trying
     * to interpret every PDF column at this stage.
     */

    const headingMatch = clean.match(
      /^(\d+\.0)\s+([A-Z][A-Z\s&'’\/-]{2,60}?)(?=\s+\d+\.\d+\s+|\s+By the end|\s+•|\s*$)/
    );

    const subMatch = clean.match(
      /^(\d+\.\d+)\s+(.+?)(?=\s+By the end|\s+•|\s*$)/
    );

    if (subMatch) {
      if (current) {
        current.source_text = current.lines.join("\n").trim();
        sections.push(current);
      }

      current = {
        activity_area: area.activity_area,
        strand_number: null,
        strand: null,
        sub_strand_number: subMatch[1],
        sub_strand: subMatch[2].trim(),
        source_line_relative: i + 1,
        lines: [raw]
      };

      continue;
    }

    if (headingMatch && current) {
      current.lines.push(raw);
      continue;
    }

    if (current) {
      current.lines.push(raw);
    }
  }

  if (current) {
    current.source_text = current.lines.join("\n").trim();
    sections.push(current);
  }
}

const cleaned = sections.map((section, index) => ({
  id: `ke-pp2-section-${String(index + 1).padStart(3, "0")}`,
  activity_area: section.activity_area,
  strand_number: section.strand_number,
  strand: section.strand,
  sub_strand_number: section.sub_strand_number,
  sub_strand: section.sub_strand,
  source_line_relative: section.source_line_relative,
  source_text: section.source_text
}));

const result = {
  schema_version: "1.0",
  status: "candidate_section_index",
  country: source.country,
  curriculum: source.curriculum,
  level: source.level,
  grade_or_year: source.grade_or_year,
  source: source.source,
  total_sections: cleaned.length,
  sections: cleaned
};

fs.writeFileSync(output, JSON.stringify(result, null, 2));

console.log("Created:", output);
console.log("Candidate sections:", cleaned.length);

const counts = {};

for (const section of cleaned) {
  counts[section.activity_area] =
    (counts[section.activity_area] || 0) + 1;
}

console.log("\n=== COUNTS ===");

for (const [area, count] of Object.entries(counts)) {
  console.log(`${area}: ${count}`);
}

console.log("\nSTATUS: CANDIDATE ONLY");
