"use strict";

const crypto = require("crypto");

const ATTENDANCE_STATUSES = new Set(["present", "absent", "late", "excused"]);
const DAYS = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

function clean(value, max = 180) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function validDate(value) {
  const date = clean(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(date + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

function getSchoolRoster(store = {}, schoolId) {
  const school = (store.schools || {})[schoolId] || {};
  const ids = new Set();
  const addIds = value => {
    if (!Array.isArray(value)) return;
    value.forEach(item => {
      const id = typeof item === "string" ? item : item && (item.learner_id || item.id);
      if (id) ids.add(String(id));
    });
  };
  addIds(school.learners);
  Object.values(store.classes || {}).forEach(classroom => {
    if (!classroom || String(classroom.school_id || classroom.tenant_id || "") !== String(schoolId)) return;
    addIds(classroom.learners);
  });
  Object.values(store.learners || {}).forEach(learner => {
    if (learner && String(learner.school_id || learner.tenant_id || "") === String(schoolId) && learner.learner_id) {
      ids.add(String(learner.learner_id));
    }
  });
  return Array.from(ids).map(id => {
    const learner = (store.learners || {})[id] || {};
    return { learner_id: id, name: clean(learner.name || learner.full_name || id, 160), level: clean(learner.level || learner.grade || "", 80) || null };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function listAttendance(store = {}, schoolId, date = null) {
  const byDate = (store.school_attendance || {})[schoolId] || {};
  if (date) return byDate[date] ? [byDate[date]] : [];
  return Object.values(byDate).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function saveAttendanceRegister(store, { schoolId, date, records, roster = [] } = {}) {
  const normalizedSchoolId = clean(schoolId, 180);
  const normalizedDate = validDate(date);
  if (!normalizedSchoolId) return { success: false, error: "A school is required." };
  if (!normalizedDate) return { success: false, error: "Enter a valid register date." };
  if (!Array.isArray(records) || !records.length) return { success: false, error: "Add at least one learner to the attendance register." };
  const allowed = new Set((Array.isArray(roster) ? roster : []).map(item => String(item && (item.learner_id || item) || "")));
  const seen = new Set();
  const normalized = [];
  for (const row of records) {
    const learnerId = clean(row && row.learner_id, 180);
    const status = clean(row && row.status, 20).toLowerCase();
    if (!learnerId || !allowed.has(learnerId)) return { success: false, error: "Attendance can only be saved for learners on this school's connected roster." };
    if (seen.has(learnerId)) return { success: false, error: "A learner can appear only once in a daily register." };
    if (!ATTENDANCE_STATUSES.has(status)) return { success: false, error: "Each learner must have a valid attendance status." };
    seen.add(learnerId);
    normalized.push({ learner_id: learnerId, status, note: clean(row && row.note, 250) || null });
  }
  if (!store.school_attendance || typeof store.school_attendance !== "object") store.school_attendance = {};
  if (!store.school_attendance[normalizedSchoolId]) store.school_attendance[normalizedSchoolId] = {};
  const register = {
    register_id: crypto.createHash("sha256").update(normalizedSchoolId + "|" + normalizedDate).digest("hex").slice(0, 24),
    school_id: normalizedSchoolId,
    date: normalizedDate,
    records: normalized,
    counts: normalized.reduce((counts, row) => { counts[row.status] += 1; return counts; }, { present: 0, absent: 0, late: 0, excused: 0 }),
    updated_at: new Date().toISOString()
  };
  store.school_attendance[normalizedSchoolId][normalizedDate] = register;
  return { success: true, register };
}

function validTime(value) {
  const time = clean(value, 5);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return time;
}

function listTimetable(store = {}, schoolId) {
  return ((store.school_timetables || {})[schoolId] || []).slice().sort((a, b) =>
    DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day) || a.start_time.localeCompare(b.start_time)
  );
}

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function saveTimetableEntry(store, { schoolId, day, start_time, end_time, subject, class_name, class_id, teacher, room } = {}) {
  const normalizedSchoolId = clean(schoolId, 180);
  const normalizedDay = clean(day, 12).toLowerCase();
  const start = validTime(start_time);
  const end = validTime(end_time);
  const normalizedSubject = clean(subject, 120);
  const normalizedClass = clean(class_name || class_id, 120);
  const normalizedRoom = clean(room, 80) || null;
  const normalizedTeacher = clean(teacher, 120) || null;
  if (!normalizedSchoolId) return { success: false, error: "A school is required." };
  if (!DAYS.has(normalizedDay)) return { success: false, error: "Choose a valid day of the week." };
  if (!start || !end || start >= end) return { success: false, error: "Enter a valid start and end time; end time must be later." };
  if (!normalizedSubject || !normalizedClass) return { success: false, error: "Subject and class are required." };
  if (!store.school_timetables || typeof store.school_timetables !== "object") store.school_timetables = {};
  if (!Array.isArray(store.school_timetables[normalizedSchoolId])) store.school_timetables[normalizedSchoolId] = [];
  const entries = store.school_timetables[normalizedSchoolId];
  const overlap = entries.find(item => {
    if (item.day !== normalizedDay || start >= item.end_time || end <= item.start_time) return false;
    const sameClass = String(item.class_name || item.class_id).toLowerCase() === normalizedClass.toLowerCase();
    const sameTeacher = normalizedTeacher && item.teacher && item.teacher.toLowerCase() === normalizedTeacher.toLowerCase();
    const sameRoom = normalizedRoom && item.room && item.room.toLowerCase() === normalizedRoom.toLowerCase();
    return sameClass || sameTeacher || sameRoom;
  });
  if (overlap) return { success: false, error: "This time overlaps an existing lesson for the same class, teacher or room." };
  const entry = {
    entry_id: crypto.randomUUID(),
    school_id: normalizedSchoolId,
    day: normalizedDay,
    start_time: start,
    end_time: end,
    subject: normalizedSubject,
    class_name: normalizedClass,
    teacher: normalizedTeacher,
    room: normalizedRoom,
    created_at: new Date().toISOString()
  };
  entries.push(entry);
  return { success: true, entry, timetable: listTimetable(store, normalizedSchoolId) };
}

module.exports = { getSchoolRoster, listAttendance, saveAttendanceRegister, listTimetable, saveTimetableEntry, validDate, validTime };
