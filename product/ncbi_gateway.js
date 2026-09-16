const BASE_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

async function searchPubMed(term, retmax = 5) {
  if (!term || typeof term !== "string") {
    throw new Error("NCBI search term is required");
  }

  const params = new URLSearchParams({
    db: "pubmed",
    term: term.trim(),
    retmode: "json",
    retmax: String(retmax)
  });

  const response = await fetch(
    `${BASE_URL}/esearch.fcgi?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`NCBI HTTP ${response.status}`);
  }

  const data = await response.json();
  const searchResult = data.esearchresult || {};
  const ids = searchResult.idlist || [];

  if (!ids.length) {
    return {
      success: true,
      source: "ncbi",
      type: "pubmed_search",
      query: term,
      result: {
        count: Number(searchResult.count || 0),
        ids: [],
        articles: []
      }
    };
  }

  const summaryParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json"
  });

  const summaryResponse = await fetch(
    `${BASE_URL}/esummary.fcgi?${summaryParams.toString()}`
  );

  if (!summaryResponse.ok) {
    throw new Error(
      `NCBI summary HTTP ${summaryResponse.status}`
    );
  }

  const summaryData = await summaryResponse.json();
  const result = summaryData.result || {};

  const articles = ids
    .map(id => {
      const article = result[id];

      if (!article || typeof article !== "object") {
        return null;
      }

      return {
        pmid: id,
        title: article.title || "",
        journal: article.fulljournalname || article.source || "",
        publication_date:
          article.pubdate || article.epubdate || "",
        authors: Array.isArray(article.authors)
          ? article.authors
              .slice(0, 5)
              .map(author => author.name)
              .filter(Boolean)
          : []
      };
    })
    .filter(Boolean);

  return {
    success: true,
    source: "ncbi",
    type: "pubmed_search",
    query: term,
    result: {
      count: Number(searchResult.count || 0),
      ids,
      articles
    }
  };
}

module.exports = {
  BASE_URL,
  searchPubMed
};
