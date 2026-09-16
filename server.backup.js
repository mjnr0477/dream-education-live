require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
});

const CACHE_FILE = path.join(__dirname, "data", "cache.json");

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      fs.writeFileSync(CACHE_FILE, "{}");
    }

    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch (error) {
    console.error("Cache read error:", error);
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify(cache, null, 2),
    "utf8"
  );
}

function createCacheKey(question, subject, level) {
  const normalized = [
    question.trim().toLowerCase(),
    (subject || "General").trim().toLowerCase(),
    (level || "General").trim().toLowerCase()
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    app: "Dream Education",
    cache: "enabled"
  });
});

app.post("/api/learn", async (req, res) => {

  try {

    const { question, subject, level } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a question."
      });
    }

    const cache = loadCache();

    const cacheKey = createCacheKey(
      question,
      subject,
      level
    );

    // Check cache before using the AI API
    if (cache[cacheKey]) {

      console.log("CACHE HIT");

      return res.json({
        success: true,
        answer: cache[cacheKey].answer,
        cached: true
      });

    }

    console.log("CACHE MISS - asking AI");

    const prompt = `
You are Dream Education, an adaptive learning assistant.

Your purpose is not simply to give answers.
Your purpose is to help the learner understand.

Learner level: ${level || "General"}
Subject: ${subject || "General"}

Teaching principles:
1. Start with a clear explanation.
2. Use language appropriate for the learner's level.
3. Give a simple example.
4. Break difficult ideas into smaller parts.
5. Encourage the learner to think.
6. End with a short question or practice activity to check understanding.

Learner question:
${question}
`;

    const response = await client.responses.create({
      model: process.env.AI_MODEL || "gpt-5",
      input: prompt
    });

    const answer = response.output_text;

    // Save useful response to cache
    cache[cacheKey] = {
      question,
      subject: subject || "General",
      level: level || "General",
      answer,
      createdAt: new Date().toISOString()
    };

    saveCache(cache);

    res.json({
      success: true,
      answer,
      cached: false
    });

  } catch (error) {

    console.error("Learning error:", error);

    res.status(500).json({
      success: false,
      message: "Dream Education could not complete the lesson."
    });

  }

});

app.listen(PORT, () => {
  console.log(`Dream Education running on http://localhost:${PORT}`);
});
