const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const marker = '<main class="container">';

if (!html.includes(marker)) {
  throw new Error("Main container not found.");
}

if (html.includes('class="welcome"')) {
  console.log("Welcome section already exists.");
  process.exit(0);
}

const welcome = `
  <section class="welcome">
    <div class="welcome-badge">DREAM EDUCATION</div>
    <h2>Learn something. Understand it. Grow from it.</h2>
    <p>
      Choose what you want to learn, explore the idea, and show what you understand.
      Dream Education adapts the next step to you.
    </p>
  </section>

`;

html = html.replace(marker, marker + "\n" + welcome);

fs.writeFileSync(file, html);

console.log("Welcome section added.");
