const pubchem = require("./pubchem_gateway");
const ncbi = require("./ncbi_gateway");
const nist = require("./nist_gateway");
const research = require("./research_gateway");

function classifyInformationNeed(question, queryInfo = {}) {
  const text = String(question || "").toLowerCase();
  const subject = String(queryInfo.subject || "").toLowerCase();

  const needs = {
    pubchem: false,
    ncbi: false,
    nist: false,
    research: false
  };

  /*
   * Chemistry / compound information.
   */
  if (
    subject.includes("chemistry") ||
    /\b(chemical|chemistry|compound|molecule|molecular formula|molecular weight|molar mass|element|acid|base|salt|nacl|h2o|co2)\b/.test(text)
  ) {
    needs.pubchem = true;
  }

  /*
   * Biology / biomedical information.
   */
  if (
    subject.includes("biology") ||
    subject.includes("life science") ||
    /\b(gene|genetics|genotype|phenotype|dna|rna|protein|cell|cells|organism|disease|enzyme|photosynthesis|respiration|ecosystem|ecology|microbiology|biomedical)\b/.test(text)
  ) {
    needs.ncbi = true;
  }

  /*
   * Physical constants.
   */
  if (
    /\b(constant|constants|speed of light|gravitational constant|planck constant|avogadro constant|boltzmann constant|electron mass|proton mass|neutron mass|elementary charge|vacuum permittivity|vacuum permeability)\b/.test(text)
  ) {
    needs.nist = true;
  }

  /*
   * Research / literature questions.
   */
  if (
    /\b(research|research paper|research papers|study|studies|journal|literature|evidence|scientific evidence|published|publication|papers|academic|scholarship|what does research say)\b/.test(text)
  ) {
    needs.research = true;
  }

  return needs;
}

function extractCompoundName(question) {
  const text = String(question || "").trim();

  const patterns = [
    /(?:formula|molecular formula|molecular weight|molar mass|properties|compound)\s+(?:of|for)\s+(.+?)(?:\?|$)/i,
    /(?:what is|tell me about|information about)\s+(.+?)(?:\?|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1]
        .replace(/\b(chemical|compound|molecule)\b/gi, "")
        .trim();
    }
  }

  return null;
}

function extractConstantName(question) {
  const text = String(question || "").trim();

  const match = text.match(
    /(?:what is|value of|value for|constant for|constant of)\s+(?:the\s+)?(.+?)(?:\?|$)/i
  );

  if (match && match[1]) {
    return match[1]
      .replace(/\b(constant|value)\b/gi, "")
      .trim();
  }

  if (/speed of light/i.test(text)) {
    return "speed of light";
  }

  return null;
}

async function getTrustedInformation(question, queryInfo = {}) {
  const needs = classifyInformationNeed(question, queryInfo);

  const jobs = [];

  if (needs.pubchem) {
    const compound = extractCompoundName(question);

    if (compound) {
      jobs.push(
        pubchem
          .getCompound(compound)
          .then(result => ({
            source: "pubchem",
            type: result.type,
            query: result.query,
            result: result.result
          }))
          .catch(error => ({
            source: "pubchem",
            success: false,
            error: error.message
          }))
      );
    }
  }

  if (needs.ncbi) {
    jobs.push(
      ncbi
        .searchPubMed(question, 5)
        .then(result => ({
          source: "ncbi",
          type: result.type,
          query: result.query,
          result: result.result
        }))
        .catch(error => ({
          source: "ncbi",
          success: false,
          error: error.message
        }))
    );
  }

  if (needs.nist) {
    const constant = extractConstantName(question);

    if (constant) {
      jobs.push(
        nist
          .findConstant(constant)
          .then(result => ({
            source: "nist",
            type: result.type,
            query: result.query,
            result: result.result
          }))
          .catch(error => ({
            source: "nist",
            success: false,
            error: error.message
          }))
      );
    }
  }

  if (needs.research) {
    jobs.push(
      research
        .searchWorks(question, 5)
        .then(result => ({
          source: "openalex",
          type: result.type,
          query: result.query,
          result: result.result
        }))
        .catch(error => ({
          source: "openalex",
          success: false,
          error: error.message
        }))
    );
  }

  if (!jobs.length) {
    return {
      success: false,
      routed: false,
      sources: [],
      error: null
    };
  }

  const results = await Promise.all(jobs);

  const successful = results.filter(
    item => item.success !== false
  );

  return {
    success: successful.length > 0,
    routed: true,
    sources: successful
  };
}

module.exports = {
  classifyInformationNeed,
  getTrustedInformation
};
