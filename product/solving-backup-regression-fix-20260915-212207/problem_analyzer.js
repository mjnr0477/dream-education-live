"use strict";

const DOMAIN_RULES = [
  {
    domain: "mathematics",
    patterns: [
      "equation", "solve for", "solve", "factorize", "factorise", "algebra",
      "quadratic", "linear equation", "inequality", "simultaneous",
      "differentiate", "derivative", "integrate", "integration",
      "limit", "matrix", "vector", "trigonometry", "sine", "cosine",
      "tangent", "geometry", "area", "volume", "perimeter",
      "fraction", "percentage", "ratio", "proportion", "probability",
      "sequence", "series", "logarithm", "log", "root", "square root"
    ]
  },
  {
    domain: "physics",
    patterns: [
      "velocity", "acceleration", "displacement", "kinematics", "m/s", "m/s²", "m/s^2",
      "force", "newton", "momentum", "impulse", "work done",
      "kinetic energy", "potential energy", "power", "pressure",
      "density", "gravity", "mass", "weight", "wave", "frequency",
      "wavelength", "sound", "light", "lens", "mirror", "current",
      "voltage", "resistance", "circuit", "electricity", "magnetic",
      "magnetism", "heat", "temperature", "thermal"
    ]
  },
  {
    domain: "chemistry",
    patterns: [
      "mole", "moles", "molar mass", "molecular mass", "molarity", "concentration",
      "dilution", "stoichiometry", "balance the equation",
      "chemical equation", "chemical formula", "atom", "electron",
      "proton", "neutron", "periodic table", "acid", "base", "ph",
      "redox", "oxidation", "reduction", "organic chemistry",
      "inorganic chemistry", "compound", "element", "reaction"
    ]
  },
  {
    domain: "biology_life_science",
    patterns: [
      "cell", "photosynthesis", "respiration", "mitosis", "meiosis",
      "gene", "genetics", "dna", "rna", "protein", "inheritance",
      "ecosystem", "ecology", "evolution", "organ", "physiology",
      "anatomy", "microbiology", "bacteria", "virus", "plant",
      "animal", "taxonomy", "biotechnology"
    ]
  },
  {
    domain: "statistics_data",
    patterns: [
      "mean", "median", "mode", "variance", "standard deviation",
      "quartile", "percentile", "frequency", "distribution",
      "correlation", "regression", "sample", "sampling",
      "confidence interval", "hypothesis test", "data analysis",
      "dataset", "statistics"
    ]
  },
  {
    domain: "units_measurement",
    patterns: [
      "convert", "conversion", "unit", "units", "kilometre",
      "kilometer", "metre", "meter", "centimetre", "centimeter",
      "millimetre", "millimeter", "kilogram", "gram", "litre",
      "liter", "second", "hour", "temperature", "celsius",
      "fahrenheit", "kelvin", "dimensional"
    ]
  },
  {
    domain: "finance_accounting",
    patterns: [
      "interest", "loan", "installment", "amortization", "amortisation",
      "profit", "loss", "markup", "discount", "tax", "depreciation",
      "cash flow", "present value", "future value", "accounting",
      "revenue", "expense", "balance sheet", "break even"
    ]
  },
  {
    domain: "economics_business",
    patterns: [
      "supply", "demand", "elasticity", "revenue", "cost",
      "market equilibrium", "gdp", "inflation", "productivity",
      "business", "forecast", "economic", "economics"
    ]
  },
  {
    domain: "programming_code",
    patterns: [
      "code", "program", "programming", "javascript", "python",
      "java", "c++", "typescript", "html", "css", "sql",
      "debug", "bug", "error in my code", "function", "algorithm",
      "sort", "sorting", "reverse string", "factorial",
      "api", "database", "script", "terminal", "shell"
    ]
  },
  {
    domain: "computer_science",
    patterns: [
      "data structure", "algorithm", "big o", "complexity",
      "operating system", "network", "database", "automata",
      "compiler", "computer architecture", "distributed system",
      "graph algorithm", "binary tree", "stack", "queue"
    ]
  },
  {
    domain: "logic_reasoning",
    patterns: [
      "logic", "truth table", "syllogism", "deduction", "induction",
      "proof", "prove", "puzzle", "riddle", "if and only if",
      "proposition", "predicate"
    ]
  },
  {
    domain: "word_problems",
    patterns: [
      "a man", "a woman", "a boy", "a girl", "a farmer",
      "a shop", "travels", "travelling", "train", "bus",
      "workers", "working together", "mixture", "age of",
      "how many", "how much", "per day", "per hour"
    ]
  },
  {
    domain: "agriculture",
    patterns: [
      "farm", "farmer", "crop", "seed", "fertilizer", "fertiliser",
      "yield", "livestock", "irrigation", "soil", "planting",
      "spacing", "acre", "hectare", "poultry", "cattle"
    ]
  },
  {
    domain: "geography_earth_science",
    patterns: [
      "map", "scale", "latitude", "longitude", "gradient",
      "geology", "rock", "weather", "climate", "river",
      "rainfall", "population density", "earthquake", "volcano"
    ]
  },
  {
    domain: "environmental_science",
    patterns: [
      "pollution", "emission", "emits", "emitted", "carbon", "waste", "recycling",
      "environment", "ecosystem", "climate change", "water quality",
      "deforestation", "conservation", "greenhouse"
    ]
  },
  {
    domain: "astronomy_space_science",
    patterns: [
      "planet", "star", "orbit", "astronomy", "space",
      "satellite", "black hole", "galaxy", "light year",
      "astronomical", "solar system"
    ]
  },
  {
    domain: "technical_troubleshooting",
    patterns: [
      "not working", "doesn't work", "does not work", "failed",
      "failure", "error", "exception", "permission denied",
      "connection refused", "timeout", "dependency", "build failed",
      "runtime error", "configuration"
    ]
  },
  {
    domain: "real_world_calculations",
    patterns: [
      "fuel", "electricity bill", "water bill", "budget",
      "salary", "shopping", "price", "cost", "distance",
      "travel", "consumption", "rate", "household"
    ]
  },
  {
    domain: "research_evidence",
    patterns: [
      "research", "paper", "study", "journal", "citation",
      "source", "evidence", "literature", "doi", "scientific evidence",
      "verify this claim", "find evidence"
    ]
  }
];

const TYPE_RULES = [
  ["linear_equation", ["linear equation", "solve for", "solve", "equation"]],
  ["differentiation", ["differentiate", "derivative", "d/dx"]],
  ["integration", ["integrate", "integration", "antiderivative"]],
  ["quadratic_equation", ["quadratic", "x²", "x^2"]],
  ["simultaneous_equations", ["simultaneous", "two equations", "three equations"]],
  ["percentage", ["percentage", "percent", "%"]],
  ["ratio", ["ratio", "proportion"]],
  ["probability", ["probability", "chance", "likelihood"]],
  ["unit_conversion", ["convert", "conversion", "in km", "in metres", "in meters"]],
  ["kinematics", ["velocity", "acceleration", "displacement", "kinematics", "m/s²", "m/s^2"]],
  ["force", ["force", "newton", "newtons"]],
  ["energy", ["kinetic energy", "potential energy", "energy"]],
  ["molar_mass", ["molar mass", "molecular mass", "relative molecular mass"]],
  ["stoichiometry", ["stoichiometry", "moles", "mole ratio"]],
  ["ph", ["ph", "acidic", "alkaline"]],
  ["mean", ["mean", "average"]],
  ["median", ["median"]],
  ["standard_deviation", ["standard deviation"]],
  ["regression", ["regression"]],
  ["loan", ["loan", "installment", "amortization", "amortisation"]],
  ["simple_interest", ["simple interest"]],
  ["compound_interest", ["compound interest"]],
  ["debugging", ["debug", "bug", "error in my code"]],
  ["code_generation", ["write code", "generate code", "create a program", "write python", "write javascript", "write java", "create code"]],
  ["troubleshooting", ["not working", "doesn't work", "does not work", "failed"]],
  ["word_problem", ["word problem", "a man", "a woman", "a farmer", "workers"]],
  ["fact_verification", ["verify", "is it true", "fact check", "evidence"]]
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function patternMatches(text, pattern) {
  if (!pattern) return false;

  // Short tokens such as "ph", "log", "p", etc. must not
  // match inside unrelated words such as "photosynthesis".
  if (/^[a-z0-9]+$/i.test(pattern) && pattern.length <= 3) {
    return new RegExp(`\\\\b${pattern}\\\\b`, "i").test(text);
  }

  return text.includes(pattern);
}

function scorePatterns(text, patterns) {
  return patterns.reduce((score, pattern) => {
    return score + (patternMatches(text, pattern) ? 1 : 0);
  }, 0);
}

function classifyProblemType(text) {
  let best = { type: "general", score: 0 };

  for (const [type, patterns] of TYPE_RULES) {
    const score = scorePatterns(text, patterns);
    if (score > best.score) best = { type, score };
  }

  return best;
}

function analyzeProblem(question, context = {}) {
  const text = normalize(question);

  if (!text) {
    return {
      analyzed: false,
      domain: "unknown",
      problem_type: "unknown",
      confidence: 0,
      signals: [],
      required_capabilities: [],
      reason: "Empty problem"
    };
  }

  if (context.subject) {
    const subject = normalize(context.subject);
    const matching = DOMAIN_RULES.find(rule => rule.domain.replace(/_/g, " ") === subject);
    if (matching) {
      return buildResult(text, matching.domain, 10, ["context.subject"]);
    }
  }

  let candidates = DOMAIN_RULES.map(rule => ({
    domain: rule.domain,
    score: scorePatterns(text, rule.patterns),
    signals: rule.patterns.filter(p => text.includes(p))
  })).filter(x => x.score > 0);

  // Strong domain-specific terms override accidental generic matches.
  // Keep generic words such as "hour", "cost", "distance", "light"
  // and "unit" from incorrectly winning over a specific domain.
  const strongDomainRules = [
    {
      domain: "chemistry",
      patterns: [
        "molar mass",
        "molecular mass",
        "molarity",
        "stoichiometry",
        "chemical equation",
        "chemical formula",
        "periodic table",
        "acid",
        "base",
        "redox"
      ]
    },
    {
      domain: "biology_life_science",
      patterns: [
        "photosynthesis",
        "respiration",
        "mitosis",
        "meiosis",
        "genetics",
        "dna",
        "rna",
        "protein",
        "cell",
        "ecosystem",
        "ecology",
        "evolution",
        "bacteria",
        "virus",
        "anatomy",
        "physiology"
      ]
    },
    {
      domain: "physics",
      patterns: [
        "velocity",
        "acceleration",
        "displacement",
        "kinematics",
        "m/s",
        "m/s²",
        "m/s^2",
        "force",
        "momentum",
        "kinetic energy",
        "potential energy",
        "voltage",
        "resistance",
        "current"
      ]
    },
    {
      domain: "engineering",
      patterns: [
        "stress",
        "strain",
        "load bearing",
        "load-bearing",
        "torque",
        "gear ratio",
        "mechanical advantage",
        "efficiency",
        "beam",
        "shaft",
        "engineering"
      ]
    },
    {
      domain: "logic_reasoning",
      patterns: [
        "implies",
        "implication",
        "if and only if",
        "truth table",
        "contrapositive",
        "converse",
        "inverse",
        "proposition",
        "predicate",
        "syllogism",
        "deduction",
        "induction",
        "logical"
      ]
    },
    {
      domain: "optimization_operations_research",
      patterns: [
        "maximize",
        "minimize",
        "optimization",
        "optimize",
        "objective function",
        "linear programming",
        "constraint",
        "constraints",
        "feasible solution",
        "feasibility"
      ]
    },
    {
      domain: "astronomy_space_science",
      patterns: [
        "light travels",
        "light travel",
        "light year",
        "light-year",
        "planet",
        "star",
        "orbit",
        "astronomy",
        "space",
        "satellite",
        "black hole",
        "galaxy",
        "solar system"
      ]
    },
    {
      domain: "technical_troubleshooting",
      patterns: [
        "bluetooth",
        "wifi",
        "wi-fi",
        "internet connection",
        "won't connect",
        "cannot connect",
        "can't connect",
        "not printing",
        "printer",
        "storage is full",
        "storage full",
        "running very slowly",
        "computer is slow",
        "phone won't turn on",
        "application keeps crashing",
        "app keeps crashing"
      ]
    },
    {
      domain: "economics_business",
      patterns: [
        "revenue",
        "business sells",
        "business selling",
        "sales",
        "market equilibrium",
        "supply and demand",
        "elasticity",
        "gdp",
        "inflation",
        "productivity"
      ]
    },
    {
      domain: "real_world_calculations",
      patterns: [
        "wages",
        "wage",
        "earns per hour",
        "earns",
        "salary",
        "fuel efficiency",
        "fuel consumption",
        "electricity bill",
        "water bill",
        "household",
        "shopping",
        "budget",
        "travel time"
      ]
    },
    {
      domain: "word_problems",
      patterns: [
        "what is the speed",
        "speed is",
        "travels",
        "travels at",
        "how fast",
        "how many",
        "how much",
        "a man",
        "a woman",
        "a boy",
        "a girl",
        "a farmer",
        "workers",
        "working together"
      ]
    }
  ];

  for (const strong of strongDomainRules) {
    const hits = strong.patterns.filter(p => text.includes(p));
    if (hits.length) {
      const candidate = candidates.find(c => c.domain === strong.domain);
      if (candidate) {
        candidate.score += 100;
        candidate.signals.push(...hits.map(h => `strong:${h}`));
      } else {
        candidates.push({
          domain: strong.domain,
          score: 100 + hits.length,
          signals: hits.map(h => `strong:${h}`)
        });
      }
    }
  }

  // Domain-specific priority resolves ties between generic signals.
  const DOMAIN_PRIORITY = [
    "biology_life_science",
    "chemistry",
    "engineering",
    "logic_reasoning",
    "optimization_operations_research",
    "astronomy_space_science",
    "technical_troubleshooting",
    "economics_business",
    "real_world_calculations",
    "word_problems",
    "physics",
    "programming_code",
    "computer_science",
    "statistics_data",
    "finance_accounting",
    "agriculture",
    "geography_earth_science",
    "environmental_science",
    "research_evidence",
    "units_measurement",
    "mathematics"
  ];

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    return DOMAIN_PRIORITY.indexOf(a.domain) -
           DOMAIN_PRIORITY.indexOf(b.domain);
  });

  if (!candidates.length) {
    return {
      analyzed: true,
      domain: "unknown",
      problem_type: classifyProblemType(text).type,
      confidence: 0,
      signals: [],
      required_capabilities: [],
      candidates: [],
      reason: "No deterministic domain signal found"
    };
  }

  const best = candidates[0];
  const second = candidates[1];

  let confidence = Math.min(
    0.99,
    0.45 +
    (best.score * 0.12) +
    (best.score > (second ? second.score : 0) ? 0.12 : 0)
  );

  return buildResult(
    text,
    best.domain,
    confidence,
    best.signals,
    candidates
  );
}

function buildResult(text, domain, confidence, signals, candidates = []) {
  const type = classifyProblemType(text);

  return {
    analyzed: true,
    domain,
    problem_type: type.type,
    confidence: Number(confidence.toFixed(3)),
    signals,
    problem_type_confidence: Number(
      Math.min(0.99, type.score * 0.25).toFixed(3)
    ),
    required_capabilities: [],
    candidates: candidates.slice(0, 5),
    reason: "Deterministic rule-based analysis"
  };
}

module.exports = {
  analyzeProblem,
  normalize,
  classifyProblemType
};
