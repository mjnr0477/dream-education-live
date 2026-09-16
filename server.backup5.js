require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const AI_MODE = process.env.AI_MODE || "live";

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

function developmentAnswer(question, subject, level) {
  return `Welcome to Dream Education.

Subject: ${subject || "General"}
Level: ${level || "General"}

Let's learn about your question:

"${question}"

This is Dream Education development mode. The learning engine has received your question and is ready to teach you.

In the live version, Dream Education's AI teacher will provide:
1. A clear explanation.
2. Examples suitable for your level.
3. Step-by-step guidance.
4. A short practice question.

Practice:
In your own words, what do you already know about this topic?`;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    app: "Dream Education",
    cache: "enabled",
    supabase: "enabled",
    ai_mode: AI_MODE,
    learning_history: "enabled"
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

    let answer;
    let cached = false;

    // 1. Check cache
    if (cache[cacheKey]) {

      console.log("CACHE HIT");

      answer = cache[cacheKey].answer;
      cached = true;

    } else {

      console.log("CACHE MISS");

      // 2. Development mode
      if (AI_MODE === "development") {

        console.log("DEVELOPMENT MODE - using local learning engine");

        answer = developmentAnswer(
          question,
          subject,
          level
        );

      } else {

        // 3. Live OpenAI mode
        console.log("LIVE MODE - asking AI");

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
6. End with a short question or practice activity.

Learner question:
${question}
`;

        try {

          const response = await client.responses.create({
            model: process.env.AI_MODEL || "gpt-5",
            input: prompt
          });

          answer = response.output_text;

        } catch (aiError) {

          console.error("AI ERROR:", aiError);

          if (
            aiError.code === "credit_balance_exhausted" ||
            aiError.code === "insufficient_quota" ||
            aiError.status === 429
          ) {
            return res.status(503).json({
              success: false,
              message: "Dream Education AI is temporarily unavailable. Please try again later."
            });
          }

          return res.status(500).json({
            success: false,
            message: "Dream Education could not complete the lesson."
          });
        }
      }

      // 4. Save answer to cache
      cache[cacheKey] = {
        question,
        subject: subject || "General",
        level: level || "General",
        answer,
        createdAt: new Date().toISOString()
      };

      saveCache(cache);
    }

    // 5. Save learner
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
        console.log("LEARNER SAVED");
      }

      // 6. Save learning history
      const { error: historyError } = await supabase
        .from("learning_history")
        .insert([
          {
            learner_id,
            question,
            subject: subject || "General",
            level: level || "General",
            answer,
            cached
          }
        ]);

      if (historyError) {
        console.error("HISTORY SAVE ERROR:", historyError);
      } else {
        console.log("LEARNING HISTORY SAVED");
      }
    }

    res.json({
      success: true,
      answer,
      cached,
      ai_mode: AI_MODE,
      saved_to_supabase: !!learner_id,
      learning_history_saved: !!learner_id
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
  console.log(`AI mode: ${AI_MODE}`);
});
