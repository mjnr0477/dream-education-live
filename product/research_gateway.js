const BASE_URL = "https://api.openalex.org";

function normalizeResearchQuery(search) {
  return String(search || "")
    .trim()
    .replace(
      /^(what does research say about|what does research say regarding|what does the research say about|what does the research say regarding)\s+/i,
      ""
    )
    .replace(/\?$/, "")
    .trim();
}

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return "";
  }

  const words = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;

    for (const position of positions) {
      if (Number.isInteger(position)) {
        words[position] = word;
      }
    }
  }

  return words.filter(Boolean).join(" ").trim();
}

async function searchWorks(search, perPage = 5) {
  if (!search || typeof search !== "string") {
    throw new Error("Research search term is required");
  }

  const originalQuery = search.trim();
  const researchQuery = normalizeResearchQuery(originalQuery);

  const params = new URLSearchParams({
    search: researchQuery,
    per_page: String(perPage)
  });

  const response = await fetch(
    `${BASE_URL}/works?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`OpenAlex HTTP ${response.status}`);
  }

  const data = await response.json();

  return {
    success: true,
    source: "openalex",
    type: "research_search",
    query: originalQuery,
    search_query: researchQuery,
    result: {
      count: data.meta?.count || 0,

      works: (data.results || []).map((work) => ({
        id: work.id,
        title: work.title,
        publication_year: work.publication_year,
        doi: work.doi,
        cited_by_count: work.cited_by_count,

        open_access: work.open_access,

        authors: (work.authorships || [])
          .slice(0, 5)
          .map((a) => a.author?.display_name)
          .filter(Boolean),

        abstract: reconstructAbstract(
          work.abstract_inverted_index
        ),

        primary_location: work.primary_location
          ? {
              landing_page_url:
                work.primary_location.landing_page_url || null,
              pdf_url:
                work.primary_location.pdf_url || null
            }
          : null
      }))
    }
  };
}

module.exports = {
  BASE_URL,
  searchWorks
};
