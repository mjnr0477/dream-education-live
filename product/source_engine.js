const https = require("https");
const queryEngine = require("./query_engine.js");
const globalSourceBridge = require("./global_sources/bridge.js");

const USER_AGENT = "DreamEducation/1.0 knowledge-search";
const PROVIDER_TIMEOUT = 3500;

function httpsGetJson(url, timeout = PROVIDER_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT
        }
      },
      response => {
        let data = "";

        response.on("data", chunk => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(
                new Error(
                  `HTTP ${response.statusCode || "unknown"}`
                )
              );
              return;
            }

            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", reject);

    request.setTimeout(timeout, () => {
      request.destroy(
        new Error(`Request timed out after ${timeout}ms`)
      );
    });
  });
}

async function searchWikipedia(query, limit = 5) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    format: "json",
    origin: "*"
  });

  const url =
    "https://en.wikipedia.org/w/api.php?" +
    params.toString();

  const json = await httpsGetJson(url);

  return (json.query?.search || []).map(item => ({
    title: item.title,
    snippet: String(item.snippet || "")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim(),
    extract: String(item.snippet || "")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim(),
    source: "Wikipedia",
    provider: "wikipedia",
    source_type: "reference",
    url:
      "https://en.wikipedia.org/wiki/" +
      encodeURIComponent(item.title.replace(/ /g, "_"))
  }));
}

async function searchCrossref(query, limit = 5) {
  const params = new URLSearchParams({
    query,
    rows: String(limit),
    select: "DOI,title,abstract,URL"
  });

  const url =
    "https://api.crossref.org/v1/works?" +
    params.toString();

  const json = await httpsGetJson(url);

  return (json.message?.items || []).map(item => {
    const abstract = String(item.abstract || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      title: Array.isArray(item.title)
        ? item.title[0]
        : "Untitled research work",
      snippet: abstract,
      extract: abstract,
      source: "Crossref",
      provider: "crossref",
      source_type: "academic",
      url:
        item.URL ||
        (item.DOI
          ? "https://doi.org/" + item.DOI
          : ""),
      has_usable_content: abstract.length >= 80,
      content_length: abstract.length
    };
  });
}

function prepareSource(item) {
  const extract = String(
    item.extract || item.snippet || ""
  )
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...item,
    extract,
    has_usable_content: extract.length >= 80,
    content_length: extract.length
  };
}

function deduplicateSources(sources) {
  const seen = new Set();

  return sources.filter(source => {
    const key = [
      source.provider || source.source || "",
      source.title || "",
      source.url || ""
    ]
      .join("|")
      .toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function rankSources(sources) {
  const authority = {
    official: 10,
    academic_research: 8,
    academic: 8,
    technical: 7,
    educational: 7,
    reference: 6,
    structured_knowledge: 5,
    scientific_research: 8,
    scientific_reference: 7,
    web_reference: 4,
    general: 2
  };

  return [...(sources || [])]
    .map(source => ({
      source,
      score:
        (source.has_usable_content ? 20 : 0) +
        (authority[source.source_type] || 0) +
        Math.min(source.content_length || 0, 1000) / 1000
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.source);
}

async function searchWikidata(query, limit = 5) {
  const url =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities" +
    "&search=" + encodeURIComponent(query) +
    "&language=en&format=json&limit=" + limit;

  const data = await httpsGetJson(url);

  return (data.search || []).map(item => ({
    title: item.label || item.id,
    snippet: item.description || "",
    extract: item.description || "",
    source: "Wikidata",
    provider: "wikidata",
    source_type: "structured_knowledge",
    url: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`,
    has_usable_content: Boolean(item.description)
  }));
}

async function searchDuckDuckGo(query, limit = 5) {
  const url =
    "https://api.duckduckgo.com/?q=" +
    encodeURIComponent(query) +
    "&format=json&no_html=1&skip_disambig=1";

  const data = await httpsGetJson(url);
  const results = [];

  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      snippet: data.AbstractText,
      extract: data.AbstractText,
      source: "DuckDuckGo",
      provider: "duckduckgo",
      source_type: "web_reference",
      url: data.AbstractURL || "",
      has_usable_content: data.AbstractText.length >= 80
    });
  }

  for (const item of data.RelatedTopics || []) {
    if (results.length >= limit) break;

    if (item.Text) {
      results.push({
        title: item.Text.split(" - ")[0] || query,
        snippet: item.Text,
        extract: item.Text,
        source: "DuckDuckGo",
        provider: "duckduckgo",
        source_type: "web_reference",
        url: item.FirstURL || "",
        has_usable_content: item.Text.length >= 80
      });
    }
  }

  return results.slice(0, limit);
}

async function searchOpenAlex(query, limit = 5) {
  const url =
    "https://api.openalex.org/works?search=" +
    encodeURIComponent(query) +
    "&per-page=" + limit +
    "&select=id,title,doi,publication_year,primary_location,open_access,abstract_inverted_index";

  const data = await httpsGetJson(url);

  return (data.results || []).map(item => {
    let extract = "";

    if (item.abstract_inverted_index) {
      extract = Object.entries(item.abstract_inverted_index)
        .sort((a, b) => a[1][0] - b[1][0])
        .map(([word]) => word)
        .join(" ");
    }

    return {
      title: item.title || query,
      snippet: extract || item.title || "",
      extract,
      source: "OpenAlex",
      provider: "openalex",
      source_type: "academic_research",
      url:
        item.doi ||
        item.id ||
        "",
      publication_year: item.publication_year || null,
      has_usable_content: extract.length >= 80
    };
  });
}


async function searchNCBIPubMed(query, limit = 5) {
  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmode: "json",
    retmax: String(limit)
  });

  const searchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?" +
    params.toString();

  const searchData = await httpsGetJson(searchUrl);
  const ids = searchData.esearchresult?.idlist || [];

  if (!ids.length) return [];

  const summaryParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json"
  });

  const summaryUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?" +
    summaryParams.toString();

  const summaryData = await httpsGetJson(summaryUrl);

  return ids.map(id => {
    const item = summaryData.result?.[id] || {};
    const title = String(item.title || query).trim();

    return {
      title,
      snippet: title,
      extract: title,
      source: "NCBI PubMed",
      provider: "ncbi_pubmed",
      source_type: "biomedical_research",
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      has_usable_content: title.length >= 20
    };
  });
}

async function searchEuropePMC(query, limit = 5) {
  const params = new URLSearchParams({
    query,
    format: "json",
    pageSize: String(limit)
  });

  const url =
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" +
    params.toString();

  const data = await httpsGetJson(url);

  return (data.resultList?.result || []).map(item => {
    const title = String(item.title || query).trim();
    const abstract = String(item.abstractText || "").trim();

    return {
      title,
      snippet: abstract || title,
      extract: abstract || title,
      source: "Europe PMC",
      provider: "europe_pmc",
      source_type: "life_science_research",
      url: item.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`
        : item.doi
          ? `https://doi.org/${item.doi}`
          : "https://europepmc.org/",
      publication_year: item.pubYear || null,
      has_usable_content: (abstract || title).length >= 40
    };
  });
}

async function httpsGetText(url, timeout = PROVIDER_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/xml,text/xml,text/plain,application/json"
        }
      },
      response => {
        let data = "";

        response.on("data", chunk => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(`HTTP ${response.statusCode || "unknown"}`)
            );
            return;
          }

          resolve(data);
        });
      }
    );

    request.on("error", reject);

    request.setTimeout(timeout, () => {
      request.destroy(
        new Error(`Request timed out after ${timeout}ms`)
      );
    });
  });
}

function xmlTagValue(xml, tag) {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i")
  );

  if (!match) return "";

  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchArxiv(query, limit = 5) {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: "0",
    max_results: String(limit)
  });

  const url =
    "https://export.arxiv.org/api/query?" +
    params.toString();

  const xml = await httpsGetText(url);
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/gi) || [];

  return entries.map(entry => {
    const title = xmlTagValue(entry, "title") || query;
    const summary = xmlTagValue(entry, "summary");
    const id = xmlTagValue(entry, "id");

    return {
      title,
      snippet: summary || title,
      extract: summary || title,
      source: "arXiv",
      provider: "arxiv",
      source_type: "scientific_research",
      url: id || "https://arxiv.org/",
      has_usable_content: (summary || title).length >= 40
    };
  });
}

async function searchNOAA(query, limit = 5) {
  const searchUrl =
    "https://www.ncei.noaa.gov/access/services/search/v1/datasets?text=" +
    encodeURIComponent(query) +
    "&limit=" +
    encodeURIComponent(limit);

  const data = await httpsGetJson(searchUrl);

  const results = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.datasets)
      ? data.datasets
      : [];

  return results.slice(0, limit).map(item => {
    const title =
      item.name ||
      item.title ||
      item.datasetName ||
      "NOAA dataset";

    const description =
      item.description ||
      item.summary ||
      item.abstract ||
      "";

    const datasetId =
      item.id ||
      item.datasetId ||
      item.uid ||
      "";

    const url =
      item.url ||
      item.href ||
      (
        datasetId
          ? "https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=" +
            encodeURIComponent(datasetId)
          : "https://www.ncei.noaa.gov/"
      );

    return {
      title: String(title).trim(),
      snippet: String(description).trim(),
      extract: String(description).trim(),
      source: "NOAA NCEI",
      provider: "noaa",
      source_type: "official",
      url,
      has_usable_content:
        String(description).trim().length >= 40
    };
  });
}
async function searchNASA(query, limit = 5) {
  const params = new URLSearchParams({
    q: query,
    media_type: "image,video",
    page_size: String(limit)
  });

  const url =
    "https://images-api.nasa.gov/search?" +
    params.toString();

  const data = await httpsGetJson(url);

  const items = data.collection?.items || [];

  return items.slice(0, limit).map(item => {
    const meta = item.data?.[0] || {};
    const title = String(meta.title || query).trim();
    const description = String(meta.description || "").trim();

    return {
      title,
      snippet: description || title,
      extract: description || title,
      source: "NASA",
      provider: "nasa",
      source_type: "scientific_reference",
      url: item.href || "https://images.nasa.gov/",
      has_usable_content: (description || title).length >= 40
    };
  });
}

async function searchInternetArchive(query, limit = 5) {
  const params = new URLSearchParams();
  params.append("q", query);
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "description");
  params.append("fl[]", "creator");
  params.append("rows", String(limit));
  params.append("output", "json");

  const url =
    "https://archive.org/advancedsearch.php?" +
    params.toString();

  const data = await httpsGetJson(url);
  const docs = data.response?.docs || [];

  return docs.map(item => {
    const title = String(item.title || query).trim();
    const description = Array.isArray(item.description)
      ? item.description.join(" ")
      : String(item.description || "").trim();

    return {
      title,
      snippet: description || title,
      extract: description || title,
      source: "Internet Archive",
      provider: "internet_archive",
      source_type: "digital_library",
      url: item.identifier
        ? `https://archive.org/details/${item.identifier}`
        : "https://archive.org/",
      has_usable_content: (description || title).length >= 40
    };
  });
}

async function searchLibraryOfCongress(query, limit = 5) {
  const params = new URLSearchParams({
    q: query,
    fo: "json",
    c: String(limit)
  });

  const url =
    "https://www.loc.gov/books/?" +
    params.toString();

  const data = await httpsGetJson(url);

  return (data.results || []).slice(0, limit).map(item => {
    const title = String(item.title || query).trim();
    const description = String(
      item.description?.[0] ||
      item.notes?.[0] ||
      ""
    ).trim();

    return {
      title,
      snippet: description || title,
      extract: description || title,
      source: "Library of Congress",
      provider: "library_of_congress",
      source_type: "library_reference",
      url: item.id || "https://www.loc.gov/",
      has_usable_content: (description || title).length >= 30
    };
  });
}

async function searchDataCite(query, limit = 5) {
  const params = new URLSearchParams({
    query,
    "page[size]": String(limit)
  });

  const url =
    "https://api.datacite.org/dois?" +
    params.toString();

  const data = await httpsGetJson(url);

  return (data.data || []).map(item => {
    const attributes = item.attributes || {};
    const title = String(
      attributes.titles?.[0]?.title ||
      query
    ).trim();

    const descriptions = attributes.descriptions || [];
    const description =
      descriptions.find(item => item.descriptionType === "Abstract")
        ?.description ||
      descriptions[0]?.description ||
      "";

    return {
      title,
      snippet: description || title,
      extract: description || title,
      source: "DataCite",
      provider: "datacite",
      source_type: "research_metadata",
      url: attributes.url ||
        (item.id
          ? `https://doi.org/${item.id}`
          : "https://datacite.org/"),
      publication_year: attributes.publicationYear || null,
      has_usable_content: (description || title).length >= 40
    };
  });
}

async function searchSources(query, limit = 5) {
  const started = Date.now();

  const queryInfo = queryEngine.analyzeQuery(query);
  const searchQuery =
    queryInfo.search_query ||
    queryInfo.search_terms.join(" ") ||
    query;

  console.log(
    "Knowledge search query:",
    JSON.stringify({
      original: query,
      search_query: searchQuery,
      subject: queryInfo.subject,
      topic: queryInfo.topic,
      intent: queryInfo.intent
    })
  );
  const FAST_RETRIEVAL_DEADLINE = 4000;

  const providers = [
    // EXISTING PROVIDERS — PRESERVED
    { name: "wikipedia", run: () => searchWikipedia(searchQuery, limit) },
    { name: "crossref", run: () => searchCrossref(searchQuery, limit) },
    { name: "wikidata", run: () => searchWikidata(searchQuery, limit) },
    { name: "duckduckgo", run: () => searchDuckDuckGo(searchQuery, limit) },
    { name: "openalex", run: () => searchOpenAlex(searchQuery, limit) },

    // NEW FREE / OPEN PROVIDERS — ADDITIVE
    { name: "ncbi_pubmed", run: () => searchNCBIPubMed(searchQuery, limit) },
    { name: "europe_pmc", run: () => searchEuropePMC(searchQuery, limit) },
    { name: "arxiv", run: () => searchArxiv(searchQuery, limit) },
    { name: "nasa", run: () => searchNASA(searchQuery, limit) },
    { name: "noaa", run: () => searchNOAA(searchQuery, limit) },
    { name: "internet_archive", run: () => searchInternetArchive(searchQuery, limit) },
    { name: "library_of_congress", run: () => searchLibraryOfCongress(searchQuery, limit) },
    { name: "datacite", run: () => searchDataCite(searchQuery, limit) },

    // GLOBAL SOURCE EXPANSION — ADDITIVE
    {
      name: "global_source_expansion",
      run: () => globalSourceBridge.searchGlobalSources(
        searchQuery,
        limit,
        queryInfo
      )
    }
  ];

  const tasks = providers.map(provider =>
    Promise.resolve()
      .then(() => provider.run())
      .then(sources => ({
        provider: provider.name,
        sources: Array.isArray(sources) ? sources : []
      }))
      .catch(error => ({
        provider: provider.name,
        sources: [],
        error: error.message
      }))
  );

  const pending = new Set(tasks);
  const completed = [];

  while (pending.size > 0) {
    const remaining = FAST_RETRIEVAL_DEADLINE - (Date.now() - started);
    if (remaining <= 0) break;

    const wrapped = [...pending].map(promise =>
      promise.then(result => ({
        promise,
        result
      }))
    );

    const winner = await Promise.race([
      ...wrapped,
      new Promise(resolve =>
        setTimeout(() => resolve(null), remaining)
      )
    ]);

    if (!winner) break;

    pending.delete(winner.promise);
    completed.push(winner.result);
  }

  const sources = completed
    .flatMap(result => result.sources)
    .map(prepareSource)
    .filter(source =>
      source &&
      String(source.extract || "").trim().length >= 80
    );

  const rankedSources = rankSources(
    deduplicateSources(sources),
    searchQuery
  );

  return {
    success: rankedSources.length > 0,
    query,
    sources: rankedSources,
    providers: Object.fromEntries(
      providers.map(provider => {
        const result = completed.find(
          item => item.provider === provider.name
        );

        return [
          provider.name,
          Boolean(result && result.sources.length > 0)
        ];
      })
    ),
    completed_providers: completed.map(
      result => result.provider
    ),
    retrieval_time_ms: Date.now() - started,
    fast_retrieval_deadline_ms: FAST_RETRIEVAL_DEADLINE
  };
}

async function getWikipediaPage(title) {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "true",
    explaintext: "true",
    redirects: "1",
    titles: title,
    format: "json",
    origin: "*"
  });

  const url =
    "https://en.wikipedia.org/w/api.php?" +
    params.toString();

  const json = await httpsGetJson(url);

  const pages = json.query?.pages || {};
  const page = Object.values(pages)[0];

  if (!page) {
    return {
      title,
      extract: "",
      source: "Wikipedia"
    };
  }

  return {
    title: page.title,
    extract: page.extract || "",
    source: "Wikipedia"
  };
}

module.exports = {
  searchWikidata,
  searchDuckDuckGo,
  searchOpenAlex,
  searchWikipedia,
  searchCrossref,
  searchSources,
  getWikipediaPage
};

if (require.main === module) {
  const query = process.argv.slice(2).join(" ");

  if (!query) {
    console.log(
      "Usage: node product/source_engine.js <question>"
    );
    process.exit(1);
  }

  const started = Date.now();

  searchSources(query)
    .then(result => {
      console.log(
        "=== DREAM EDUCATION SOURCE ENGINE ==="
      );
      console.log("Query:", result.query);
      console.log(
        "Time:",
        Date.now() - started,
        "ms"
      );
      console.log(
        "Sources found:",
        result.sources.length
      );

      result.sources.forEach((item, i) => {
        console.log(`\n--- ${i + 1} ---`);
        console.log("Title:", item.title);
        console.log("Source:", item.source);
        console.log(
          "Usable:",
          item.has_usable_content
        );
        console.log(
          "Content length:",
          item.content_length
        );
        console.log("URL:", item.url);
      });

      console.log(
        "\nStatus: SOURCE ENGINE READY"
      );
    })
    .catch(error => {
      console.error(
        "Source search failed:",
        error.message
      );
      process.exit(1);
    });
}
