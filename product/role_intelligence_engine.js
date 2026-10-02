"use strict";

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}

function avg(values) {
  const xs = values.map(n).filter(Number.isFinite);
  return xs.length ? Math.round(xs.reduce((a,b)=>a+b,0) / xs.length) : 0;
}

function learnerSummary(learner, assessments = [], evidence = []) {
  const rows = assessments.filter(a => a.learner_id === learner.learner_id);
  const scores = rows.map(a => n(a.score)).filter(x => x >= 0 && x <= 100);
  const recent = rows.slice(0, 8);
  const weak = recent.filter(a => n(a.score) < 60).slice(0, 5);
  const strong = recent.filter(a => n(a.score) >= 80).slice(0, 5);
  const evidenceRows = Array.isArray(evidence) ? evidence : [];
  const evidenceConfidences = evidenceRows
    .map(row => n(row.confidence))
    .filter(x => x >= 0 && x <= 1);
  const evidenceConfidence = evidenceConfidences.length
    ? Math.round((evidenceConfidences.reduce((a,b)=>a+b,0) / evidenceConfidences.length) * 100) / 100
    : null;
  const evidenceByType = evidenceRows.reduce((out, row) => {
    const type = String(row.evidence_type || "interaction");
    out[type] = (out[type] || 0) + 1;
    return out;
  }, {});
  return {
    learner_id: learner.learner_id,
    name: learner.name || "Learner",
    level: learner.level || "",
    average_score: avg(scores),
    assessments: scores.length,
    recent_scores: recent.map(a => n(a.score)),
    focus_topics: weak.map(a => a.topic || a.subject).filter(Boolean).slice(0, 5),
    strengths: strong.map(a => a.topic || a.subject).filter(Boolean).slice(0, 5),
    last_activity: rows[0]?.created_at || null,
    evidence: {
      count: evidenceRows.length,
      confidence: evidenceConfidence,
      by_type: evidenceByType,
      latest_observed_at: evidenceRows[0]?.observed_at || null
    }
  };
}

function buildTeacherIntelligence({teacher, learners = [], assessments = [], evidenceByLearner = {}} = {}) {
  const summaries = learners.map(l => learnerSummary(l, assessments, evidenceByLearner[l.learner_id] || []));
  return {
    role: "teacher",
    headline: "Know who needs teaching next.",
    teaching_priorities: summaries
      .filter(x => x.average_score < 70 || x.focus_topics.length)
      .sort((a,b) => a.average_score - b.average_score)
      .slice(0, 12),
    class_signal: {
      learners: summaries.length,
      assessments: assessments.length,
      average_score: avg(assessments.map(a => a.score))
    },
    teacher: { teacher_id: teacher?.teacher_id || null, name: teacher?.name || "Teacher", subjects: teacher?.subjects || [] }
  };
}

function buildParentIntelligence({parent, children = [], assessments = [], evidenceByLearner = {}} = {}) {
  const summaries = children.map(l => learnerSummary(l, assessments, evidenceByLearner[l.learner_id] || []));
  return {
    role: "parent",
    headline: "Understand progress and know how to support learning.",
    children: summaries,
    family_signal: {
      children: summaries.length,
      average_score: avg(summaries.map(x => x.average_score)),
      children_needing_support: summaries.filter(x => x.average_score < 70).length
    },
    parent: { parent_id: parent?.parent_id || null, name: parent?.name || "Parent" }
  };
}

function buildSchoolIntelligence({school, learners = [], assessments = [], teachers = [], evidenceByLearner = {}} = {}) {
  const summaries = learners.map(l => learnerSummary(l, assessments, evidenceByLearner[l.learner_id] || []));
  return {
    role: "school",
    headline: "See learning patterns across the institution.",
    institution_signal: {
      learners: summaries.length,
      teachers: teachers.length,
      assessments: assessments.length,
      average_score: avg(assessments.map(a => a.score)),
      learners_needing_support: summaries.filter(x => x.average_score < 70).length
    },
    priority_learners: summaries
      .filter(x => x.average_score < 70)
      .sort((a,b) => a.average_score - b.average_score)
      .slice(0, 20),
    school: { school_id: school?.school_id || null, name: school?.name || "School", location: school?.location || null }
  };
}

module.exports = {
  learnerSummary,
  buildTeacherIntelligence,
  buildParentIntelligence,
  buildSchoolIntelligence
};
