const https = require("https");

const DEFAULT_TIMEOUT = 8000;

function requestJson(url, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "DreamEducation/1.0 free-source-gateway"
        }
      },
      res => {
        let body = "";

        res.on("data", chunk => {
          body += chunk;
        });

        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (_) {
            reject(new Error("Invalid JSON response"));
          }
        });
      }
    );

    req.setTimeout(timeout, () => {
      req.destroy(new Error("Request timeout"));
    });

    req.on("error", reject);
  });
}

async function queryWikipedia(question) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query" +
    "&generator=search" +
    "&gsrsearch=" +
    encodeURIComponent(question) +
    "&gsrlimit=3" +
    "&prop=extracts" +
    "&exintro=1" +
    "&explaintext=1" +
    "&format=json";

  return requestJson(url);
}

async function queryWikidata(question) {
  const url =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities" +
    "&search=" +
    encodeURIComponent(question) +
    "&language=en" +
    "&format=json" +
    "&limit=5";

  return requestJson(url);
}

async function queryPubChem(question) {
  const compound = String(question)
    .replace(/^(what is|find|calculate|give me|tell me)\s+/i, "")
    .trim();

  const url =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
    encodeURIComponent(compound) +
    "/property/MolecularFormula,MolecularWeight,IUPACName/JSON";

  return requestJson(url);
}

async function queryNCBI(question) {
  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    "?db=pubmed" +
    "&term=" +
    encodeURIComponent(question) +
    "&retmode=json" +
    "&retmax=5";

  return requestJson(url);
}

async function queryOpenAlex(question) {
  const url =
    "https://api.openalex.org/works?search=" +
    encodeURIComponent(question) +
    "&per-page=5";

  return requestJson(url);
}

async function queryCrossref(question) {
  const url =
    "https://api.crossref.org/works?query.bibliographic=" +
    encodeURIComponent(question) +
    "&rows=5";

  return requestJson(url);
}

async function querySemanticScholar(question) {
  const url =
    "https://api.semanticscholar.org/graph/v1/paper/search?query=" +
    encodeURIComponent(question) +
    "&limit=5&fields=title,authors,year,url";

  return requestJson(url);
}

async function queryArxiv(question) {
  const url =
    "https://export.arxiv.org/api/query?search_query=all:" +
    encodeURIComponent(question) +
    "&start=0&max_results=5";

  return requestJson(url);
}

async function queryEurostat(question) {
  return {
    source: "eurostat",
    status: "AVAILABLE",
    message: "Eurostat requires dataset-specific routing before querying."
  };
}

async function queryNASA(question) {
  return {
    source: "nasa",
    status: "AVAILABLE",
    message: "NASA requires endpoint-specific routing before querying."
  };
}

async function queryCalculatorFree(question) {
  return {
    source: "calculator_free",
    status: "AVAILABLE",
    message: "Calculator.Free requires calculation-expression routing."
  };
}

async function querySageMathCell(question) {
  return {
    source: "sagemathcell",
    status: "AVAILABLE",
    message: "SageMathCell requires computation-expression routing."
  };
}

async function queryWiktionary(question) {
  const url =
    "https://en.wiktionary.org/w/api.php?action=query" +
    "&generator=search" +
    "&gsrsearch=" +
    encodeURIComponent(question) +
    "&gsrlimit=3" +
    "&prop=extracts" +
    "&explaintext=1" +
    "&format=json";

  return requestJson(url);
}

const handlers = {
  wikipedia: queryWikipedia,
  wikimedia: queryWikipedia,
  wikidata: queryWikidata,
  pubchem: queryPubChem,
  ncbi_entrez: queryNCBI,
  openalex: queryOpenAlex,
  crossref: queryCrossref,
  semantic_scholar: querySemanticScholar,
  arxiv: queryArxiv,
  eurostat: queryEurostat,
  nasa: queryNASA,
  calculator_free: queryCalculatorFree,
  sagemathcell: querySageMathCell,
  wiktionary: queryWiktionary
};

async function queryFreeSource(sourceId, question) {
  const handler = handlers[sourceId];

  if (!handler) {
    return {
      success: false,
      source: sourceId,
      error: "No gateway handler implemented."
    };
  }

  try {
    const data = await handler(question);

    return {
      success: true,
      source: sourceId,
      data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      source: sourceId,
      data: null,
      error: error?.message || "Free source request failed."
    };
  }
}

module.exports = {
  queryFreeSource,
  handlers
};
