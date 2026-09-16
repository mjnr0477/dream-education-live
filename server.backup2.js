require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
    cache: "enabled",
    supabase: "enabled",
    ai: "enabled"
  });
});

app.post("/api/learn", async (req, res) => {

  try {

    const {
      question,
      subject,
      level,
      learner_id,
      learner_name
    } = req.body;

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

    // 1. Check local cache first
    if (cache[cacheKey]) {

      console.log("CACHE HIT");

      return res.json({
        success: true,
        answer: cache[cacheKey].answer,
        cached: true
      });

    }

    console.log("CACHE MISS - asking AI");

    // 2. Ask AI
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

    // 3. Save response to local cache
    cache[cacheKey] = {
      question,
      subject: subject || "General",
      level: level || "General",
      answer,
      createdAt: new Date().toISOString()
    };

    saveCache(cache);

    // 4. Save learner to Supabase if learner_id is provided
    if (learner_id) {

      const { error: learnerError } = await supabase
        .from("dream_learners")
        .upsert(
          {
            learner_id,
            name: learner_name || null,
            level: level || null
          },
          {
            onConflict: "learner_id"
          }
        );

      if (learnerError) {
        console.error("LEARNER SAVE ERROR:", learnerError);
      } else {
        console.log("LEARNER SAVED TO SUPABASE");
      }
    }

    res.json({
      success: true,
      answer,
      cached: false,
      saved_to_supabase: !!learner_id
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
