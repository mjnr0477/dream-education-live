"use strict";

function buildProjectPortfolio({ learnerId, projects = [], credentials = [] } = {}) {
  const normalized = (Array.isArray(projects) ? projects : []).map((project, index) => ({
    project_id: String(project.project_id || "project_" + (index + 1)),
    title: String(project.title || "Untitled project"),
    description: String(project.description || ""),
    skills: Array.isArray(project.skills) ? project.skills.map(String) : [],
    evidence: Array.isArray(project.evidence) ? project.evidence : [],
    status: String(project.status || "draft"),
    updated_at: project.updated_at || null
  }));

  return {
    version: "1.0.0",
    learner_id: String(learnerId || ""),
    projects: normalized,
    verified_credentials: Array.isArray(credentials) ? credentials : [],
    project_count: normalized.length
  };
}

module.exports = { buildProjectPortfolio };
