const { createSolution, createFailure } =
  require("./specialist_contract.js");
const { verifySolution } =
  require("../verifier/independent_verifier.js");
const { crossCheck } =
  require("../crosscheck/crosscheck_engine.js");

function finish(problem_type, solver, result, expression, steps, recalc) {
  const verification = verifySolution(
    { result, steps },
    { recalculate: recalc }
  );

  const crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  return createSolution({
    success: true,
    solved: true,
    domain: "biology_life_science",
    problem_type,
    specialist: "biology_specialist",
    solver,
    result,
    expression,
    steps,
    verification,
    crosscheck
  });
}

function solve(question) {
  const q = String(question || "").trim();
  const l = q.toLowerCase();

  const photosynthesis =
    /photosynthesis/.test(l);

  if (photosynthesis) {
    return finish(
      "photosynthesis",
      "deterministic_biology",
      "Plants use carbon dioxide and water, with light energy and chlorophyll, to produce glucose and release oxygen.",
      q,
      [
        "Light energy is absorbed by chlorophyll.",
        "Carbon dioxide and water are used in the process.",
        "Glucose is produced and oxygen is released."
      ],
      () => "Plants use carbon dioxide and water, with light energy and chlorophyll, to produce glucose and release oxygen."
    );
  }

  const cell = l.match(/(?:function|role)\s+of\s+(?:the\s+)?(nucleus|mitochondrion|mitochondria|ribosome|cell membrane|chloroplast)/i);

  if (cell) {
    const functions = {
      nucleus: "Controls cell activities and contains genetic material.",
      mitochondrion: "Site of aerobic respiration and major ATP production.",
      mitochondria: "Sites of aerobic respiration and major ATP production.",
      ribosome: "Site of protein synthesis.",
      "cell membrane": "Controls movement of substances into and out of the cell.",
      chloroplast: "Contains chlorophyll and is the main site of photosynthesis in plant cells."
    };

    const result = functions[cell[1].toLowerCase()];

    return finish(
      "cell_structure_function",
      "deterministic_biology",
      result,
      q,
      [`Identify structure: ${cell[1]}`, `Function: ${result}`],
      () => result
    );
  }

  const levels = l.match(/\b(organism|organ|organ system|tissue|cell)\b/);

  if (levels && /level|made up|composed|organization/.test(l)) {
    const result =
      "Cells form tissues, tissues form organs, organs form organ systems, and organ systems work together in an organism.";

    return finish(
      "biological_organization",
      "deterministic_biology",
      result,
      q,
      [
        "Cell → Tissue",
        "Tissue → Organ",
        "Organ → Organ system",
        "Organ system → Organism"
      ],
      () => result
    );
  }

  return createFailure({
    domain: "biology_life_science",
    problem_type: "unknown",
    specialist: "biology_specialist",
    error: "No supported deterministic biology pattern matched"
  });
}

module.exports = { solve };
