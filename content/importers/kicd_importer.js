const fs = require("fs");
const path = require("path");

const KICD_INDEX =
  "https://kicd.ac.ke/cbc-materials/curriculum-designs/regular-curriculum-designs/";

const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "curriculum",
  "kenya",
  "kicd_catalog.json"
);

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 Dream-Education/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return await response.text();
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /(?:href|data-url|onclick)\s*=\s*["']([^"']+)["']/gi;

  let match;

  while ((match = regex.exec(html))) {
    let value = match[1];

    const navigateMatch = value.match(
      /navigateToPage\(['"]([^'"]+)['"]\)/
    );

    if (navigateMatch) {
      value = navigateMatch[1];
    }

    const url = absoluteUrl(value, baseUrl);

    if (url) {
      links.push(url);
    }
  }

  return [...new Set(links)];
}

function isCurriculumPage(url) {
  return (
    url.includes("/cbc-materials/") &&
    (
      url.includes("pre-primary") ||
      url.includes("lower-primary") ||
      url.includes("grade-four") ||
      url.includes("grade-five") ||
      url.includes("grade-six") ||
      url.includes("grade-seven") ||
      url.includes("grade-eight") ||
      url.includes("grade-nine") ||
      url.includes("grade-ten") ||
      url.includes("grade-eleven") ||
      url.includes("grade-twelve")
    )
  );
}

function isPdf(url) {
  return /\.pdf(?:[?#].*)?$/i.test(url);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPageTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : "";
}

async function discoverCurriculumPage(url) {
  const html = await fetchText(url);
  const links = extractLinks(html, url);

  return {
    page_url: url,
    page_title: extractPageTitle(html),
    pdf_documents: links
      .filter(isPdf)
      .map(pdf => ({
        url: pdf,
        status: "discovered",
        local_file: null
      }))
  };
}

async function main() {
  console.log("Dream Education KICD discovery");
  console.log("Master source:", KICD_INDEX);
  console.log("");

  const masterHtml = await fetchText(KICD_INDEX);
  const masterLinks = extractLinks(masterHtml, KICD_INDEX);

  const curriculumPages = masterLinks
    .filter(isCurriculumPage)
    .filter(url => url !== KICD_INDEX);

  console.log(
    "Curriculum pages discovered:",
    curriculumPages.length
  );

  const catalog = {
    version: "2.0",
    source: {
      authority: "Kenya Institute of Curriculum Development",
      country: "Kenya",
      curriculum: "CBC",
      index: KICD_INDEX,
      discovered_at: new Date().toISOString()
    },
    curriculum_pages: [],
    ingestion: {
      curriculum_pages_discovered: curriculumPages.length,
      documents_discovered: 0,
      downloaded_documents: 0,
      parsed_documents: 0,
      imported_content_nodes: 0
    }
  };

  for (const page of curriculumPages) {
    console.log("Scanning:", page);

    try {
      const result = await discoverCurriculumPage(page);

      catalog.curriculum_pages.push(result);

      console.log(
        "  PDFs found:",
        result.pdf_documents.length
      );
    } catch (error) {
      console.log(
        "  WARNING:",
        error.message
      );

      catalog.curriculum_pages.push({
        page_url: page,
        error: error.message,
        pdf_documents: []
      });
    }
  }

  catalog.ingestion.documents_discovered =
    catalog.curriculum_pages.reduce(
      (total, page) =>
        total + (page.pdf_documents || []).length,
      0
    );

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(catalog, null, 2)
  );

  console.log("");
  console.log("KICD discovery completed.");
  console.log(
    "Curriculum pages:",
    catalog.ingestion.curriculum_pages_discovered
  );
  console.log(
    "Documents discovered:",
    catalog.ingestion.documents_discovered
  );
  console.log("Catalog:", OUTPUT_FILE);
}

main().catch(error => {
  console.error("Discovery failed:", error.message);
  process.exit(1);
});
