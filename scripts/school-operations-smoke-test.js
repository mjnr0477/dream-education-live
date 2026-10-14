"use strict";

const assert = require("node:assert/strict");
const { getSchoolRoster, listAttendance, saveAttendanceRegister, listTimetable, saveTimetableEntry } = require("../product/school_operations_engine");

const store = {
  schools: { s1: { school_id: "s1", learners: ["l1"] } },
  learners: {
    l1: { learner_id: "l1", name: "Amina" },
    l2: { learner_id: "l2", name: "Brian", school_id: "s1" },
    outside: { learner_id: "outside", name: "Not enrolled" }
  },
  classes: { c1: { class_id: "c1", school_id: "s1", learners: ["l1"] } }
};
const roster = getSchoolRoster(store, "s1");
assert.deepEqual(roster.map(item => item.learner_id).sort(), ["l1", "l2"]);
assert.equal(saveAttendanceRegister(store, { schoolId: "s1", date: "2026-10-15", records: [
  { learner_id: "l1", status: "present" }, { learner_id: "l2", status: "late", note: "Arrived after start" }
], roster }).success, true);
assert.deepEqual(listAttendance(store, "s1", "2026-10-15")[0].counts, { present: 1, absent: 0, late: 1, excused: 0 });
assert.equal(saveAttendanceRegister(store, { schoolId: "s1", date: "2026-02-30", records: [{ learner_id: "l1", status: "present" }], roster }).success, false);
assert.equal(saveAttendanceRegister(store, { schoolId: "s1", date: "2026-10-15", records: [{ learner_id: "outside", status: "present" }], roster }).success, false);
assert.equal(saveAttendanceRegister(store, { schoolId: "s1", date: "2026-10-15", records: [{ learner_id: "l1", status: "present" }, { learner_id: "l1", status: "absent" }], roster }).success, false);
assert.equal(saveAttendanceRegister(store, { schoolId: "s1", date: "2026-10-15", records: [{ learner_id: "l1", status: "unknown" }], roster }).success, false);

assert.equal(saveTimetableEntry(store, { schoolId: "s1", day: "monday", start_time: "09:00", end_time: "10:00", subject: "Math", class_name: "Grade 6", teacher: "Ms A", room: "R1" }).success, true);
assert.equal(saveTimetableEntry(store, { schoolId: "s1", day: "monday", start_time: "09:30", end_time: "10:30", subject: "Science", class_name: "Grade 6", teacher: "Mr B", room: "R2" }).success, false);
assert.equal(saveTimetableEntry(store, { schoolId: "s1", day: "monday", start_time: "10:00", end_time: "11:00", subject: "Science", class_name: "Grade 7", teacher: "Ms A", room: "R2" }).success, false);
assert.equal(saveTimetableEntry(store, { schoolId: "s1", day: "monday", start_time: "10:00", end_time: "11:00", subject: "Science", class_name: "Grade 7", teacher: "Mr B", room: "R1" }).success, false);
assert.equal(saveTimetableEntry(store, { schoolId: "s1", day: "monday", start_time: "09:30", end_time: "09:00", subject: "Math", class_name: "Grade 6" }).success, false);
assert.equal(listTimetable(store, "s1").length, 1);
assert.equal(saveTimetableEntry(store, { schoolId: "s1", day: "tuesday", start_time: "09:00", end_time: "10:00", subject: "Science", class_name: "Grade 7" }).success, true);
assert.equal(listTimetable(store, "s1").length, 2);

console.log("School operations smoke test passed.");
