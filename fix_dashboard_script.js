const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const marker = `/* =========================
   DASHBOARD CONTINUE
========================= */`;

const markerIndex = html.indexOf(marker);

if (markerIndex === -1) {
  throw new Error("Dashboard continue marker not found.");
}

const scriptStart = html.lastIndexOf("<script>", markerIndex);

if (scriptStart === -1) {
  throw new Error("Dashboard script opening tag not found.");
}

const scriptEnd = html.indexOf("</script>", markerIndex);

if (scriptEnd === -1) {
  throw new Error("Dashboard script closing tag not found.");
}

const dashboardScript =
  html.slice(scriptStart, scriptEnd + "</script>".length);

html =
  html.slice(0, scriptStart) +
  html.slice(scriptEnd + "</script>".length);

const bodyEnd = html.indexOf("</body>");

if (bodyEnd === -1) {
  throw new Error("Closing body tag not found.");
}

html =
  html.slice(0, bodyEnd) +
  "\n\n" +
  dashboardScript +
  "\n" +
  html.slice(bodyEnd);

fs.writeFileSync(file, html);

console.log("Dashboard script moved inside the HTML document.");
