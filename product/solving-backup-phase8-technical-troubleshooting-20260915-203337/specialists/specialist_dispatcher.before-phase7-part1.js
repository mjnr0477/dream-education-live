const mathematics = require("./mathematics_specialist.js");
const physics = require("./physics_specialist.js");
const chemistry = require("./chemistry_specialist.js");
const statistics = require("./statistics_specialist.js");
const units = require("./units_specialist.js");
const finance = require("./finance_specialist.js");

const specialists = {
  mathematics,
  physics,
  chemistry,
  statistics_data: statistics,
  units_measurement: units,
  finance_accounting: finance
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
