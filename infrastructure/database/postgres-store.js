"use strict";

const db = require("./postgres");

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function toJson(value, fallback) {
  const input = value === undefined || value === null ? fallback : value;

  if (typeof input === "string") {
    try {
      JSON.parse(input);
      return input;
    } catch {
      return JSON.stringify(input);
    }
  }

  return JSON.stringify(input);
}

function emptyStore() {
  return {
    learners: {},
    teachers: {},
    parents: {},
    schools: {},
    classes: {},
    accounts: {},
    connections: {},
    results: [],
    meetings: {}
  };
}

function json(value, fallback) {
  return value === undefined || value === null ? fallback : value;
}

function entityRow(entity, idField, columns) {
  const row = {};
  for (const column of columns) {
    if (column === idField) {
      row[column] = entity?.[idField];
    } else if (
      column === "data" ||
      column === "subjects" ||
      column === "progress" ||
      column === "analytics"
    ) {
      continue;
    } else {
      row[column] =
        entity?.[column] === undefined ? null : entity[column];
    }
  }
  return row;
}

async function countRows(client) {
  const tables = [
    "accounts",
    "learners",
    "teachers",
    "parents",
    "schools",
    "classes",
    "class_learners",
    "results",
    "connections",
    "meetings"
  ];

  const counts = {};
  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = result.rows[0].count;
  }
  return counts;
}

function totalRows(counts) {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

async function loadStore() {
  if (!hasDatabase()) {
    return null;
  }

  const result = emptyStore();

  const [
    accounts,
    learners,
    teachers,
    parents,
    schools,
    classes,
    classLearners,
    results,
    connections,
    meetings
  ] = await Promise.all([
    db.query("SELECT * FROM accounts"),
    db.query("SELECT * FROM learners"),
    db.query("SELECT * FROM teachers"),
    db.query("SELECT * FROM parents"),
    db.query("SELECT * FROM schools"),
    db.query("SELECT * FROM classes"),
    db.query("SELECT * FROM class_learners"),
    db.query("SELECT * FROM results ORDER BY result_id"),
    db.query("SELECT * FROM connections"),
    db.query("SELECT * FROM meetings")
  ]);

  for (const row of accounts.rows) {
    result.accounts[row.account_id] = {
      ...(row.data || {}),
      account_id: row.account_id,
      role: row.role,
      email: row.email,
      phone: row.phone,
      learner_id: row.learner_id,
      teacher_id: row.teacher_id,
      parent_id: row.parent_id,
      school_id: row.school_id,
      plan_type: row.plan_type,
      subscription_status: row.subscription_status,
      free_forever: row.free_forever,
      trial_started_at: row.trial_started_at,
      trial_expires_at: row.trial_expires_at,
      subscription_started_at: row.subscription_started_at,
      subscription_expires_at: row.subscription_expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  for (const row of learners.rows) {
    result.learners[row.learner_id] = {
      ...(row.data || {}),
      learner_id: row.learner_id,
      name: row.name,
      role: row.role,
      level: row.level,
      grade: row.grade,
      school: row.school,
      preferred_learning_method: row.preferred_learning_method,
      custom_learning_method: row.custom_learning_method,
      active_subject: row.active_subject,
      active_topic: row.active_topic,
      subjects: row.subjects || [],
      progress: row.progress || {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  for (const row of teachers.rows) {
    result.teachers[row.teacher_id] = {
      ...(row.data || {}),
      teacher_id: row.teacher_id,
      role: row.role,
      name: row.name,
      school: row.school,
      subjects: row.subjects || [],
      analytics: row.analytics || {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  for (const row of parents.rows) {
    result.parents[row.parent_id] = {
      ...(row.data || {}),
      parent_id: row.parent_id,
      role: row.role,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  for (const row of schools.rows) {
    result.schools[row.school_id] = {
      ...(row.data || {}),
      school_id: row.school_id,
      role: row.role,
      name: row.name,
      location: row.location,
      analytics: row.analytics || {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  for (const row of classes.rows) {
    result.classes[row.class_id] = {
      ...(row.data || {}),
      class_id: row.class_id,
      name: row.name,
      level: row.level,
      teacher_id: row.teacher_id,
      school_id: row.school_id,
      subjects: row.subjects || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      learners: []
    };
  }

  for (const row of classLearners.rows) {
    if (!result.classes[row.class_id]) {
      result.classes[row.class_id] = {
        class_id: row.class_id,
        learners: []
      };
    }

    if (!Array.isArray(result.classes[row.class_id].learners)) {
      result.classes[row.class_id].learners = [];
    }

    result.classes[row.class_id].learners.push(row.learner_id);
  }

  result.results = results.rows.map(row => ({
    ...(row.data || {}),
    result_id: row.result_id,
    learner_id: row.learner_id,
    class_id: row.class_id,
    subject: row.subject,
    topic: row.topic,
    score: row.score,
    assessment_type: row.assessment_type,
    recorded_at: row.recorded_at
  }));

  for (const row of connections.rows) {
    result.connections[row.connection_id] = {
      ...(row.data || {}),
      connection_id: row.connection_id,
      type: row.type,
      from_role: row.from_role,
      from_id: row.from_id,
      to_role: row.to_role,
      to_id: row.to_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  for (const row of meetings.rows) {
    result.meetings[row.meeting_id] = {
      ...(row.data || {}),
      meeting_id: row.meeting_id,
      connection_id: row.connection_id,
      created_by_role: row.created_by_role,
      created_by_id: row.created_by_id,
      title: row.title,
      type: row.type,
      scheduled_date: row.scheduled_date,
      scheduled_time: row.scheduled_time,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  return result;
}

async function replaceStore(store) {
  if (!hasDatabase()) {
    return false;
  }

  const pool = db.getPool();
  if (!pool) {
    return false;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("TRUNCATE TABLE class_learners, results, meetings, connections, classes, learners, teachers, parents, schools, accounts");

    for (const account of Object.values(store.accounts || {})) {
      const known = new Set([
        "account_id","role","email","phone","learner_id","teacher_id",
        "parent_id","school_id","plan_type","subscription_status",
        "free_forever","trial_started_at","trial_expires_at",
        "subscription_started_at","subscription_expires_at",
        "created_at","updated_at"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(account)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO accounts
        (account_id,role,email,phone,learner_id,teacher_id,parent_id,school_id,
         plan_type,subscription_status,free_forever,trial_started_at,
         trial_expires_at,subscription_started_at,subscription_expires_at,
         data,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          account.account_id,
          account.role,
          account.email || null,
          account.phone || null,
          account.learner_id || null,
          account.teacher_id || null,
          account.parent_id || null,
          account.school_id || null,
          account.plan_type || null,
          account.subscription_status || null,
          account.free_forever === true,
          account.trial_started_at || null,
          account.trial_expires_at || null,
          account.subscription_started_at || null,
          account.subscription_expires_at || null,
          data,
          account.created_at || null,
          account.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const learner of Object.values(store.learners || {})) {
      const known = new Set([
        "learner_id","name","role","level","grade","school",
        "preferred_learning_method","custom_learning_method",
        "active_subject","active_topic","subjects","progress",
        "created_at","updated_at","classes","class_names","schools",
        "school_ids","teachers"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(learner)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO learners
        (learner_id,name,role,level,grade,school,preferred_learning_method,
         custom_learning_method,active_subject,active_topic,subjects,progress,
         data,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          learner.learner_id,
          learner.name || null,
          learner.role || "learner",
          learner.level || null,
          learner.grade || null,
          learner.school || null,
          learner.preferred_learning_method || null,
          learner.custom_learning_method || null,
          learner.active_subject || null,
          learner.active_topic || null,
          toJson(learner.subjects, []),
          toJson(learner.progress, {}),
          data,
          learner.created_at || null,
          learner.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const teacher of Object.values(store.teachers || {})) {
      const known = new Set([
        "teacher_id","role","name","school","subjects","analytics",
        "created_at","updated_at","classes","learners"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(teacher)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO teachers
        (teacher_id,role,name,school,subjects,analytics,data,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          teacher.teacher_id,
          teacher.role || "teacher",
          teacher.name || null,
          teacher.school || null,
          toJson(teacher.subjects, []),
          toJson(teacher.analytics, {}),
          data,
          teacher.created_at || null,
          teacher.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const parent of Object.values(store.parents || {})) {
      const known = new Set([
        "parent_id","role","name","created_at","updated_at","children"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(parent)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO parents
        (parent_id,role,name,data,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          parent.parent_id,
          parent.role || "parent",
          parent.name || null,
          data,
          parent.created_at || null,
          parent.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const school of Object.values(store.schools || {})) {
      const known = new Set([
        "school_id","role","name","location","analytics",
        "created_at","updated_at","classes","teachers","learners"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(school)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO schools
        (school_id,role,name,location,analytics,data,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          school.school_id,
          school.role || "school",
          school.name || null,
          school.location || null,
          toJson(school.analytics, {}),
          data,
          school.created_at || null,
          school.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const classData of Object.values(store.classes || {})) {
      const learners = Array.isArray(classData.learners)
        ? classData.learners
        : [];

      const known = new Set([
        "class_id","name","level","teacher_id","school_id",
        "subjects","learners","created_at","updated_at",
        "class_names"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(classData)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO classes
        (class_id,name,level,teacher_id,school_id,subjects,data,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          classData.class_id,
          classData.name || null,
          classData.level || null,
          classData.teacher_id || null,
          classData.school_id || null,
          toJson(classData.subjects, []),
          data,
          classData.created_at || null,
          classData.updated_at || new Date().toISOString()
        ]
      );

      for (const learnerId of [...new Set(learners)]) {
        await client.query(
          `INSERT INTO class_learners (class_id,learner_id)
           VALUES ($1,$2)
           ON CONFLICT (class_id,learner_id) DO NOTHING`,
          [classData.class_id, learnerId]
        );
      }
    }

    for (const item of store.results || []) {
      const known = new Set([
        "result_id","learner_id","class_id","subject","topic",
        "score","assessment_type","recorded_at"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(item)) {
        if (!known.has(key)) data[key] = value;
      }

      if (item.result_id !== undefined && item.result_id !== null) {
        await client.query(
          `INSERT INTO results
          (result_id,learner_id,class_id,subject,topic,score,assessment_type,recorded_at,data)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            item.result_id,
            item.learner_id || null,
            item.class_id || null,
            item.subject || null,
            item.topic || null,
            item.score ?? null,
            item.assessment_type || null,
            item.recorded_at || null,
            data
          ]
        );
      } else {
        await client.query(
          `INSERT INTO results
          (learner_id,class_id,subject,topic,score,assessment_type,recorded_at,data)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            item.learner_id || null,
            item.class_id || null,
            item.subject || null,
            item.topic || null,
            item.score ?? null,
            item.assessment_type || null,
            item.recorded_at || null,
            data
          ]
        );
      }
    }

    for (const connection of Object.values(store.connections || {})) {
      const known = new Set([
        "connection_id","type","from_role","from_id","to_role","to_id",
        "status","created_at","updated_at"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(connection)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO connections
        (connection_id,type,from_role,from_id,to_role,to_id,status,created_at,updated_at,data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          connection.connection_id,
          connection.type,
          connection.from_role,
          connection.from_id,
          connection.to_role,
          connection.to_id,
          connection.status,
          connection.created_at || null,
          connection.updated_at || new Date().toISOString(),
          data
        ]
      );
    }

    for (const meeting of Object.values(store.meetings || {})) {
      const known = new Set([
        "meeting_id","connection_id","created_by_role","created_by_id",
        "title","type","scheduled_date","scheduled_time","status",
        "created_at","updated_at"
      ]);

      const data = {};
      for (const [key, value] of Object.entries(meeting)) {
        if (!known.has(key)) data[key] = value;
      }

      await client.query(
        `INSERT INTO meetings
        (meeting_id,connection_id,created_by_role,created_by_id,title,type,
         scheduled_date,scheduled_time,status,created_at,updated_at,data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          meeting.meeting_id,
          meeting.connection_id,
          meeting.created_by_role,
          meeting.created_by_id,
          meeting.title,
          meeting.type,
          meeting.scheduled_date,
          meeting.scheduled_time,
          meeting.status,
          meeting.created_at || null,
          meeting.updated_at || new Date().toISOString(),
          data
        ]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getCounts() {
  if (!hasDatabase()) return null;
  const pool = db.getPool();
  if (!pool) return null;
  return countRows(pool);
}

module.exports = {
  hasDatabase,
  emptyStore,
  loadStore,
  replaceStore,
  getCounts,
  totalRows
};
