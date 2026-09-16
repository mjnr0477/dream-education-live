const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "product.json");

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(
      FILE,
      JSON.stringify(
        {
          learners: {},
          teachers: {},
          parents: {},
          schools: {},
          accounts: {},
          connections: {}
        },
        null,
        2
      )
    );
    return;
  }

  const store = JSON.parse(fs.readFileSync(FILE, "utf8"));

  if (!store.connections) {
    store.connections = {};
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
  }
}

function loadStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveStore(store) {
  ensureStore();
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}

function saveLearner(profile) {
  const store = loadStore();

  profile.updated_at = new Date().toISOString();
  store.learners[profile.learner_id] = profile;

  saveStore(store);

  return profile;
}

function getLearner(learnerId) {
  const store = loadStore();
  return store.learners[learnerId] || null;
}

module.exports = {
  loadStore,
  saveStore,
  saveLearner,
  getLearner
};

function saveTeacher(profile) {
  const store = loadStore();
  profile.updated_at = new Date().toISOString();
  store.teachers[profile.teacher_id] = profile;
  saveStore(store);
  return profile;
}

function getTeacher(teacherId) {
  const store = loadStore();
  return store.teachers[teacherId] || null;
}

module.exports.saveTeacher = saveTeacher;
module.exports.getTeacher = getTeacher;

function saveParent(profile) {
  const store = loadStore();
  profile.updated_at = new Date().toISOString();
  store.parents[profile.parent_id] = profile;
  saveStore(store);
  return profile;
}

function getParent(parentId) {
  const store = loadStore();
  return store.parents[parentId] || null;
}

module.exports.saveParent = saveParent;
module.exports.getParent = getParent;

function saveSchool(profile) {
  const store = loadStore();
  profile.updated_at = new Date().toISOString();
  store.schools[profile.school_id] = profile;
  saveStore(store);
  return profile;
}

function getSchool(schoolId) {
  const store = loadStore();
  return store.schools[schoolId] || null;
}

module.exports.saveSchool = saveSchool;
module.exports.getSchool = getSchool;

function saveClass(classData) {
  const store = loadStore();
  classData.updated_at = new Date().toISOString();

  if (!store.classes) {
    store.classes = {};
  }

  store.classes[classData.class_id] = classData;
  saveStore(store);

  return classData;
}

function getClass(classId) {
  const store = loadStore();
  return store.classes?.[classId] || null;
}

module.exports.saveClass = saveClass;
module.exports.getClass = getClass;

function saveResults(results = []) {
  const store = loadStore();

  if (!store.results) {
    store.results = [];
  }

  store.results.push(...results);

  saveStore(store);

  return results;
}

function getResults(filters = {}) {
  const store = loadStore();
  let results = store.results || [];

  if (filters.learner_id) {
    results = results.filter(r => r.learner_id === filters.learner_id);
  }

  if (filters.class_id) {
    results = results.filter(r => r.class_id === filters.class_id);
  }

  if (filters.subject) {
    results = results.filter(r => r.subject === filters.subject);
  }

  return results;
}

module.exports.saveResults = saveResults;
module.exports.getResults = getResults;

function syncLearnerRelations() {
  const store = loadStore();

  const classes = Object.values(store.classes || {});
  const learners = store.learners || {};

  Object.values(learners).forEach(learner => {
    const learnerClasses = classes.filter(classData =>
      Array.isArray(classData.learners) &&
      classData.learners.includes(learner.learner_id)
    );

    learner.classes = learnerClasses.map(classData => classData.class_id);
    learner.class_names = learnerClasses.map(classData => classData.name);

    const schoolIds = [
      ...new Set(
        learnerClasses
          .map(classData => classData.school_id)
          .filter(Boolean)
      )
    ];

    learner.schools = schoolIds;

    learner.school =
      schoolIds.length === 1
        ? store.schools?.[schoolIds[0]]?.name || null
        : null;

    learner.school_ids = schoolIds;

    const teacherIds = [
      ...new Set(
        learnerClasses
          .map(classData => classData.teacher_id)
          .filter(Boolean)
      )
    ];

    learner.teachers = teacherIds;

    learner.updated_at = new Date().toISOString();
  });

  saveStore(store);

  return learners;
}

module.exports.syncLearnerRelations = syncLearnerRelations;

function applyActiveConnectionsToRelations(store) {
  const connections = Object.values(store.connections || {});
  const activeConnections = connections.filter(
    connection => connection.status === "active"
  );

  const classes = store.classes || {};
  const teachers = store.teachers || {};
  const schools = store.schools || {};
  const learners = store.learners || {};
  const parents = store.parents || {};

  Object.values(classes).forEach(classData => {
    if (!Array.isArray(classData.learners)) {
      classData.learners = [];
    }

    classData.learners = [...new Set(classData.learners)];

    activeConnections
      .filter(c =>
        c.type === "class_learner" &&
        c.from_id === classData.class_id &&
        learners[c.to_id]
      )
      .forEach(c => {
        if (!classData.learners.includes(c.to_id)) {
          classData.learners.push(c.to_id);
        }
      });

    const teacherConnection = activeConnections.find(c =>
      c.type === "teacher_class" &&
      c.to_id === classData.class_id
    );

    if (
      teacherConnection &&
      teachers[teacherConnection.from_id] &&
      (!classData.teacher_id ||
        classData.teacher_id === teacherConnection.from_id)
    ) {
      classData.teacher_id = teacherConnection.from_id;
    }

    const schoolConnection = activeConnections.find(c =>
      c.type === "school_class" &&
      c.to_id === classData.class_id
    );

    if (
      schoolConnection &&
      schools[schoolConnection.from_id] &&
      (!classData.school_id ||
        classData.school_id === schoolConnection.from_id)
    ) {
      classData.school_id = schoolConnection.from_id;
    }
  });

  Object.values(teachers).forEach(teacher => {
    const classLearners = Object.values(classes)
      .filter(c => c.teacher_id === teacher.teacher_id)
      .flatMap(c => Array.isArray(c.learners) ? c.learners : []);

    const directLearners = activeConnections
      .filter(c =>
        c.type === "teacher_learner" &&
        c.from_id === teacher.teacher_id
      )
      .map(c => c.to_id);

    teacher.learners = [
      ...new Set([
        ...classLearners,
        ...directLearners
      ])
    ];

    const classIds = Object.values(classes)
      .filter(c => c.teacher_id === teacher.teacher_id)
      .map(c => c.class_id);

    const connectedClassIds = activeConnections
      .filter(c =>
        c.type === "teacher_class" &&
        c.from_id === teacher.teacher_id
      )
      .map(c => c.to_id);

    teacher.classes = [
      ...new Set([
        ...classIds,
        ...connectedClassIds
      ])
    ];
  });

  Object.values(learners).forEach(learner => {
    const learnerClasses = Object.values(classes).filter(c =>
      Array.isArray(c.learners) &&
      c.learners.includes(learner.learner_id)
    );

    const classTeachers = learnerClasses
      .map(c => c.teacher_id)
      .filter(Boolean);

    const directTeachers = activeConnections
      .filter(c =>
        c.type === "teacher_learner" &&
        c.to_id === learner.learner_id
      )
      .map(c => c.from_id);

    learner.teachers = [
      ...new Set([
        ...classTeachers,
        ...directTeachers
      ])
    ];

    const classIds = learnerClasses.map(c => c.class_id);

    const connectedClassIds = activeConnections
      .filter(c =>
        c.type === "class_learner" &&
        c.to_id === learner.learner_id
      )
      .map(c => c.from_id);

    learner.classes = [
      ...new Set([
        ...classIds,
        ...connectedClassIds
      ])
    ];

    const classSchoolIds = learnerClasses
      .map(c => c.school_id)
      .filter(Boolean);

    const directSchoolIds = activeConnections
      .filter(c =>
        c.type === "school_learner" &&
        c.to_id === learner.learner_id
      )
      .map(c => c.from_id);

    const schoolIds = [
      ...new Set([
        ...classSchoolIds,
        ...directSchoolIds
      ])
    ];

    learner.school_ids = schoolIds;
    learner.schools = schoolIds;

    learner.school =
      schoolIds.length === 1
        ? schools[schoolIds[0]]?.name || null
        : null;
  });

  Object.values(schools).forEach(school => {
    const schoolClasses = Object.values(classes)
      .filter(c => c.school_id === school.school_id)
      .map(c => c.class_id);

    const connectedClasses = activeConnections
      .filter(c =>
        c.type === "school_class" &&
        c.from_id === school.school_id
      )
      .map(c => c.to_id);

    school.classes = [
      ...new Set([
        ...schoolClasses,
        ...connectedClasses
      ])
    ];

    const classTeachers = Object.values(classes)
      .filter(c =>
        c.school_id === school.school_id &&
        c.teacher_id
      )
      .map(c => c.teacher_id);

    const directTeachers = activeConnections
      .filter(c =>
        c.type === "school_teacher" &&
        c.from_id === school.school_id
      )
      .map(c => c.to_id);

    school.teachers = [
      ...new Set([
        ...classTeachers,
        ...directTeachers
      ])
    ];

    const classLearners = Object.values(classes)
      .filter(c => c.school_id === school.school_id)
      .flatMap(c => Array.isArray(c.learners) ? c.learners : []);

    const directLearners = activeConnections
      .filter(c =>
        c.type === "school_learner" &&
        c.from_id === school.school_id
      )
      .map(c => c.to_id);

    school.learners = [
      ...new Set([
        ...classLearners,
        ...directLearners
      ])
    ];
  });

  Object.values(parents).forEach(parent => {
    parent.children = activeConnections
      .filter(c =>
        c.type === "parent_learner" &&
        c.from_id === parent.parent_id
      )
      .map(c => c.to_id)
      .filter(learnerId => Boolean(learners[learnerId]));
  });

  return store;
}


function syncAllRelations() {
  const store = loadStore();

  const classes = Object.values(store.classes || {});
  const teachers = store.teachers || {};
  const schools = store.schools || {};
  const learners = store.learners || {};
  const parents = store.parents || {};

  Object.values(teachers).forEach(teacher => {
    const teacherClasses = classes.filter(
      classData => classData.teacher_id === teacher.teacher_id
    );

    teacher.classes = teacherClasses.map(c => c.class_id);

    teacher.learners = [
      ...new Set(
        teacherClasses.flatMap(c =>
          Array.isArray(c.learners) ? c.learners : []
        )
      )
    ];

    teacher.updated_at = new Date().toISOString();
  });

  Object.values(schools).forEach(school => {
    const schoolClasses = classes.filter(
      classData => classData.school_id === school.school_id
    );

    school.classes = schoolClasses.map(c => c.class_id);

    school.teachers = [
      ...new Set(
        schoolClasses
          .map(c => c.teacher_id)
          .filter(Boolean)
      )
    ];

    school.learners = [
      ...new Set(
        schoolClasses.flatMap(c =>
          Array.isArray(c.learners) ? c.learners : []
        )
      )
    ];

    school.updated_at = new Date().toISOString();
  });

  Object.values(learners).forEach(learner => {
    const learnerClasses = classes.filter(c =>
      Array.isArray(c.learners) &&
      c.learners.includes(learner.learner_id)
    );

    learner.classes = learnerClasses.map(c => c.class_id);
    learner.class_names = learnerClasses.map(c => c.name);

    learner.school_ids = [
      ...new Set(
        learnerClasses
          .map(c => c.school_id)
          .filter(Boolean)
      )
    ];

    learner.schools = learner.school_ids;

    learner.school =
      learner.school_ids.length === 1
        ? schools[learner.school_ids[0]]?.name || null
        : null;

    learner.teachers = [
      ...new Set(
        learnerClasses
          .map(c => c.teacher_id)
          .filter(Boolean)
      )
    ];

    learner.updated_at = new Date().toISOString();
  });

  applyActiveConnectionsToRelations(store);

  saveStore(store);

  return {
    teachers,
    schools,
    learners
  };
}


function saveAccount(account) {
  const store = loadStore();

  if (!store.accounts) {
    store.accounts = {};
  }

  account.updated_at = new Date().toISOString();
  store.accounts[account.account_id] = account;

  saveStore(store);
  return account;
}

function getAccount(accountId) {
  const store = loadStore();
  return store.accounts?.[accountId] || null;
}

function getAccountByEmail(email) {
  const store = loadStore();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  return Object.values(store.accounts || {}).find(
    account =>
      String(account.email || "").trim().toLowerCase() === normalizedEmail
  ) || null;
}

module.exports.saveAccount = saveAccount;
module.exports.getAccount = getAccount;
module.exports.getAccountByEmail = getAccountByEmail;

module.exports.syncAllRelations = syncAllRelations;


function getAccountByPhone(phone) {
  const store = loadStore();
  const normalizedPhone = String(phone || "").trim().replace(/[\s()-]/g, "");

  if (!normalizedPhone) {
    return null;
  }

  return Object.values(store.accounts || {}).find(
    account =>
      String(account.phone || "").trim().replace(/[\s()-]/g, "") === normalizedPhone
  ) || null;
}

module.exports.getAccountByPhone = getAccountByPhone;
