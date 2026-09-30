"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");

async function worldBank(query, limit = 5) {
  await waitFor("world_bank", 250);
  const params = new URLSearchParams({
    format:"json",
    qterm:String(query || "").trim(),
    rows:String(Math.min(Math.max(limit,1),10)),
    os:"0",
    fl:"display_title,abstract,docdt,url,docty"
  });
  const data = await json(
    "https://search.worldbank.org/api/v3/wds?" + params
  );
  const rows = Array.isArray(data)
    ? (data[1] || [])
    : Object.values(data?.documents || data?.result || {});
  return rows.map(item => ({
    provider:"world_bank",
    source:"World Bank Open Data",
    title:String(item.display_title || item.title || query),
    extract:[
      `World Bank public document record: ${item.display_title || query}.`,
      item.abstract ? String(item.abstract) : "",
      item.docty ? `Document type: ${item.docty}.` : ""
    ].filter(Boolean).join(" "),
    url:String(item.url || "https://www.worldbank.org/en/research")
  })).filter(x => x.title);
}

module.exports = {worldBank};
