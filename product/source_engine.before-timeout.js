const https = require("https");

function searchWikipedia(query, limit = 5) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: String(limit),
      format: "json",
      origin: "*"
    });

    const url =
      "https://en.wikipedia.org/w/api.php?" + params.toString();

    https.get(
      url,
      {
        headers: {
          "User-Agent": "DreamEducation/1.0 knowledge-search"
        }
      },
      response => {
        let data = "";

        response.on("data", chunk => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const json = JSON.parse(data);

            const results =
              (json.query && json.query.search || []).map(item => ({
                title: item.title,
                snippet: item.snippet
                  .replace(/<[^>]+>/g, "")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&amp;/g, "&"),
                source: "Wikipedia",
                url:
                  "https://en.wikipedia.org/wiki/" +
                  encodeURIComponent(item.title.replace(/ /g, "_"))
              }));

            resolve(results);
          } catch (error) {
            reject(error);
          }
        });
      }
    ).on("error", reject);
  });
}

async function searchSources(query, limit = 5) {
  const wikipedia = await searchWikipedia(query, limit);

  return {
    success: true,
    query,
    sources: wikipedia
  };
}

module.exports = {
  searchWikipedia,
  searchSources
};

if (require.main === module) {
  const query = process.argv.slice(2).join(" ");

  if (!query) {
    console.log("Usage: node product/source_engine.js <question>");
    process.exit(1);
  }

  searchSources(query)
    .then(result => {
      console.log("=== DREAM EDUCATION SOURCE ENGINE ===");
      console.log("Query:", result.query);
      console.log("Sources found:", result.sources.length);

      result.sources.forEach((item, i) => {
        console.log(`\n--- ${i + 1} ---`);
        console.log("Title:", item.title);
        console.log("Snippet:", item.snippet);
        console.log("Source:", item.source);
        console.log("URL:", item.url);
      });

      console.log("\nStatus: SOURCE ENGINE READY");
    })
    .catch(error => {
      console.error("Source search failed:", error.message);
      process.exit(1);
    });
}

function getWikipediaPage(title) {
  return new Promise((resolve, reject) => {
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
      "https://en.wikipedia.org/w/api.php?" + params.toString();

    https.get(
      url,
      {
        headers: {
          "User-Agent": "DreamEducation/1.0 knowledge-search"
        }
      },
      response => {
        let data = "";

        response.on("data", chunk => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const json = JSON.parse(data);
            const pages = json.query.pages;
            const page = Object.values(pages)[0];

            resolve({
              title: page.title,
              extract: page.extract || "",
              source: "Wikipedia"
            });
          } catch (error) {
            reject(error);
          }
        });
      }
    ).on("error", reject);
  });
}

module.exports.getWikipediaPage = getWikipediaPage;
