"use strict";

const ROLES = ["learner", "teacher", "parent", "school"];

function createOrganizationContext(input = {}) {
  return {
    organization_id: input.organization_id || null,
    school_id: input.school_id || null,
    class_id: input.class_id || null,
    role: ROLES.includes(input.role) ? input.role : null,
    active_connections: Array.isArray(input.active_connections)
      ? input.active_connections
      : []
  };
}

module.exports = {
  ROLES,
  createOrganizationContext
};
