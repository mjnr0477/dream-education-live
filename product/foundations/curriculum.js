"use strict";

/*
 * International curriculum contract.
 * Kenya is supported as one curriculum source, not the platform boundary.
 */

function createCurriculumContext(input = {}) {
  return {
    country: input.country || null,
    region: input.region || null,
    curriculum: input.curriculum || null,
    framework: input.framework || null,
    level: input.level || null,
    grade: input.grade || null,
    subject: input.subject || null,
    topic: input.topic || null,
    language: input.language || null
  };
}

module.exports = { createCurriculumContext };
