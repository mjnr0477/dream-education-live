const mathematics = require("./mathematics_specialist.js");
const physics = require("./physics_specialist.js");
const chemistry = require("./chemistry_specialist.js");
const statistics = require("./statistics_specialist.js");
const units = require("./units_specialist.js");
const finance = require("./finance_specialist.js");
const biology = require("./biology_specialist.js");
const engineering = require("./engineering_specialist.js");
const programming = require("./programming_specialist.js");
const computerScience = require("./computer_science_specialist.js");
const logic = require("./logic_specialist.js");
const wordProblems = require("./word_problem_specialist.js");
const economics = require("./economics_specialist.js");
const optimization = require("./optimization_specialist.js");
const agriculture = require("./agriculture_specialist.js");
const geography = require("./geography_specialist.js");
const environmental = require("./environmental_specialist.js");
const astronomy = require("./astronomy_specialist.js");
const research = require("./research_specialist.js");
const technicalTroubleshooting = require("./technical_troubleshooting_specialist.js");

const specialists = {
  mathematics,
  physics,
  chemistry,
  statistics_data: statistics,
  units_measurement: units,
  finance_accounting: finance,
  biology_life_science: biology,
  engineering,
  programming_code: programming,
  computer_science: computerScience,
  logic_reasoning: logic,
  word_problems: wordProblems,
  economics_business: economics,
  optimization_operations_research: optimization,
  agriculture: agriculture,
  geography_earth_science: geography,
  environmental_science: environmental,
  astronomy_space_science: astronomy,
  research_evidence: research,
  technical_troubleshooting: technicalTroubleshooting
};

function solveWithSpecialist(domain, question) {
  const specialist = specialists[domain];
  if (!specialist) {
    return {
      success: false,
      solved: false,
      routed: false,
      domain,
      error: `No Phase 5 specialist implemented for domain: ${domain}`
    };
  }

  const result = specialist.solve(question);
  result.routed = true;
  return result;
}

module.exports = {
  specialists,
  solveWithSpecialist
};
