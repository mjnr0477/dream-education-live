"use strict";

const catalog = require("./catalog");
const router = require("./router");

function status() {
  const sources = catalog.listSources();

  return {
    success:true,
    total_sources:sources.length,
    connected:sources.filter(x => x.status === "connected").length,
    ready:sources.filter(x => x.status === "ready").length,
    planned:sources.filter(x => x.status === "planned").length,
    families:[...new Set(sources.map(x => x.family))],
    sources
  };
}

module.exports = {
  catalog,
  router,
  status
};
