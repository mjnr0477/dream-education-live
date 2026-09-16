const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const oldBlock = `
  <!-- LESSON -->
  <section id="lessonCard" class="card hidden">

    <div class="section-label">LESSON</div>

    <h2>Let's understand it</h2>

    <div id="lessonAnswer" class="lesson-answer"></div>

  </section>
`;

const newBlock = `
  <!-- LESSON -->
  <section id="lessonCard" class="card lesson-card hidden">

    <div class="section-label">STEP 1 · LEARN</div>

    <h2>Let's understand the idea</h2>

    <p class="lesson-intro">
      Start by understanding the main idea. You don't need to memorize everything.
    </p>

    <div class="lesson-content">
      <div class="lesson-icon">💡</div>

      <div id="lessonAnswer" class="lesson-answer"></div>
    </div>

    <div class="lesson-tip">
      <strong>Think about it</strong>
      <p>
        Try to connect this idea to something you already know or see in everyday life.
      </p>
    </div>

  </section>
`;

if (!html.includes(oldBlock)) {
  throw new Error("Original lesson block not found. Nothing changed.");
}

html = html.replace(oldBlock, newBlock);

fs.writeFileSync(file, html);

console.log("Lesson UI updated.");
