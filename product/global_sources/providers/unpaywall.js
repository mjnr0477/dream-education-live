"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");

async function search(query) {
  const email = process.env.UNPAYWALL_EMAIL;

  if (!email) {
    return {
      provider:"unpaywall",
      source:"Unpaywall",
      configured:false,
      results:[]
    };
  }

  const doi = String(query || "").match(
    /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i
  );

  if (!doi) {
    return {
      provider:"unpaywall",
      source:"Unpaywall",
      configured:true,
      results:[]
    };
  }

  await waitFor("unpaywall", 1000);

  const data = await json(
    `https://api.unpaywall.org/v2/${encodeURIComponent(doi[0])}?email=${encodeURIComponent(email)}`
  );

  return {
    provider:"unpaywall",
    source:"Unpaywall",
    configured:true,
    results:[{
      provider:"unpaywall",
      source:"Unpaywall",
      title:String(data.title || ""),
      extract:String(data.z_authors || ""),
      url:String(
        data.best_oa_location?.url_for_landing_page ||
        data.best_oa_location?.url_for_pdf ||
        ""
      ),
      open_access:Boolean(data.is_oa)
    }]
  };
}

module.exports = {search};
