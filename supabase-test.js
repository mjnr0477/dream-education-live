require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from("dream_learners")
    .insert([
      {
        learner_id: "test001",
        name: "Test Learner",
        level: "Junior Secondary"
      }
    ])
    .select();

  if (error) {
    console.error("SUPABASE ERROR:", error);
    return;
  }

  console.log("SUPABASE SUCCESS:");
  console.log(data);
}

test();
