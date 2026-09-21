const crypto = require("crypto");

const VALID_ROLES = new Set([
  "learner",
  "teacher",
  "parent",
  "school",
  "class"
]);

const VALID_STATUSES = new Set([
  "pending",
  "active",
  "rejected",
  "revoked"
]);

const VALID_CONNECTION_TYPES = new Set([
  "parent_learner",
  "teacher_learner",
  "school_teacher",
  "school_learner",
  "school_class",
  "teacher_class",
  "class_learner",
  "general"
]);

function createConnection({
  connection_id = null,
  type,
  from_role,
  from_id,
  to_role,
  to_id,
  status = "pending"
} = {}) {
  if (!VALID_CONNECTION_TYPES.has(type)) {
    throw new Error("Invalid connection type.");
  }

  if (!VALID_ROLES.has(from_role) || !VALID_ROLES.has(to_role)) {
    throw new Error("Invalid connection role.");
  }

  if (!from_id || !to_id) {
    throw new Error("Both connection endpoints are required.");
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error("Invalid connection status.");
  }

  const now = new Date().toISOString();

  return {
    connection_id:
      connection_id || `connection_${crypto.randomUUID()}`,
    type,
    from_role,
    from_id,
    to_role,
    to_id,
    status,
    created_at: now,
    updated_at: now
  };
}

function getConnection(store, connectionId) {
  return store.connections?.[connectionId] || null;
}

function listConnections(store, filters = {}) {
  let connections = Object.values(store.connections || {});

  if (filters.status) {
    connections = connections.filter(
      connection => connection.status === filters.status
    );
  }

  if (filters.type) {
    connections = connections.filter(
      connection => connection.type === filters.type
    );
  }

  if (filters.role && filters.id) {
    connections = connections.filter(connection =>
      (
        connection.from_role === filters.role &&
        connection.from_id === filters.id
      ) ||
      (
        connection.to_role === filters.role &&
        connection.to_id === filters.id
      )
    );
  }

  return connections;
}

function findConnection(store, {
  type,
  from_id,
  to_id
} = {}) {
  return Object.values(store.connections || {}).find(
    connection =>
      connection.type === type &&
      connection.from_id === from_id &&
      connection.to_id === to_id
  ) || null;
}

function updateConnectionStatus(store, connectionId, status) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error("Invalid connection status.");
  }

  const connection = store.connections?.[connectionId];

  if (!connection) {
    return null;
  }

  connection.status = status;
  connection.updated_at = new Date().toISOString();

  return connection;
}

function ensureConnectionsStore(store) {
  if (!store.connections) {
    store.connections = {};
  }

  return store.connections;
}

module.exports = {
  VALID_ROLES,
  VALID_STATUSES,
  VALID_CONNECTION_TYPES,
  createConnection,
  getConnection,
  listConnections,
  findConnection,
  updateConnectionStatus,
  ensureConnectionsStore
};

function saveConnection(store, connection) {
  ensureConnectionsStore(store);

  if (!connection || !connection.connection_id) {
    throw new Error("Valid connection is required.");
  }

  connection.updated_at = new Date().toISOString();
  store.connections[connection.connection_id] = connection;

  return connection;
}

module.exports.saveConnection = saveConnection;

function getEndpoint(store, role, id) {
  if (!store || !role || !id) {
    return null;
  }

  const collections = {
    learner: store.learners,
    teacher: store.teachers,
    parent: store.parents,
    school: store.schools,
    class: store.classes
  };

  const collection = collections[role];

  if (!collection) {
    return null;
  }

  return collection[id] || null;
}

function validateConnectionEndpoints(store, {
  from_role,
  from_id,
  to_role,
  to_id
} = {}) {
  if (!VALID_ROLES.has(from_role) || !VALID_ROLES.has(to_role)) {
    throw new Error("Invalid connection role.");
  }

  if (!getEndpoint(store, from_role, from_id)) {
    throw new Error(
      `Source ${from_role} does not exist.`
    );
  }

  if (!getEndpoint(store, to_role, to_id)) {
    throw new Error(
      `Target ${to_role} does not exist.`
    );
  }

  return true;
}

function findExistingConnection(store, {
  type,
  from_role,
  from_id,
  to_role,
  to_id
} = {}) {
  const connections = Object.values(store.connections || {});

  const existing = connections.find(connection => {
    if (
      connection.type !== type ||
      !["pending", "active"].includes(connection.status)
    ) {
      return false;
    }

    const sameDirection =
      connection.from_role === from_role &&
      connection.from_id === from_id &&
      connection.to_role === to_role &&
      connection.to_id === to_id;

    if (sameDirection) {
      return true;
    }

    if (type === "general") {
      return (
        connection.from_role === to_role &&
        connection.from_id === to_id &&
        connection.to_role === from_role &&
        connection.to_id === from_id
      );
    }

    return false;
  });

  return existing || null;
}

function createValidatedConnection(store, options = {}) {
  validateConnectionEndpoints(store, options);

  const existing = findExistingConnection(store, options);

  if (existing) {
    throw new Error(
      "A pending or active connection already exists."
    );
  }

  return createConnection(options);
}

module.exports.getEndpoint = getEndpoint;
module.exports.validateConnectionEndpoints =
  validateConnectionEndpoints;
module.exports.findExistingConnection =
  findExistingConnection;
module.exports.createValidatedConnection =
  createValidatedConnection;

function requestConnection(store, options = {}) {
  const connection = createValidatedConnection(store, {
    ...options,
    status: "pending"
  });

  return saveConnection(store, connection);
}

function changeConnectionStatus(
  store,
  connectionId,
  status
) {
  const connection = getConnection(store, connectionId);

  if (!connection) {
    throw new Error("Connection not found.");
  }

  return updateConnectionStatus(
    store,
    connectionId,
    status
  );
}

function approveConnection(store, connectionId) {
  return changeConnectionStatus(
    store,
    connectionId,
    "active"
  );
}

function rejectConnection(store, connectionId) {
  return changeConnectionStatus(
    store,
    connectionId,
    "rejected"
  );
}

function revokeConnection(store, connectionId) {
  return changeConnectionStatus(
    store,
    connectionId,
    "revoked"
  );
}

module.exports.requestConnection = requestConnection;
module.exports.changeConnectionStatus =
  changeConnectionStatus;
module.exports.approveConnection = approveConnection;
module.exports.rejectConnection = rejectConnection;
module.exports.revokeConnection = revokeConnection;

function getAccountEntityId(account) {
  if (!account) {
    return null;
  }

  const roleToIdField = {
    learner: "learner_id",
    teacher: "teacher_id",
    parent: "parent_id",
    school: "school_id"
  };

  const field = roleToIdField[account.role];

  return field ? account[field] || null : null;
}

function authorizeSourceAccount(account, sourceRole, sourceId) {
  if (!account) {
    throw new Error("Authenticated account is required.");
  }

  if (account.role !== sourceRole) {
    throw new Error(
      "Authenticated account role cannot act as this source."
    );
  }

  const accountEntityId = getAccountEntityId(account);

  if (!accountEntityId || accountEntityId !== sourceId) {
    throw new Error(
      "Authenticated account is not authorized for this source."
    );
  }

  return true;
}

function authorizeDestinationAccount(account, destinationRole, destinationId) {
  if (!account) {
    throw new Error("Authenticated account is required.");
  }

  if (account.role !== destinationRole) {
    throw new Error(
      "Authenticated account cannot approve for this destination."
    );
  }

  const accountEntityId = getAccountEntityId(account);

  if (!accountEntityId || accountEntityId !== destinationId) {
    throw new Error(
      "Authenticated account is not authorized for this destination."
    );
  }

  return true;
}

module.exports.getAccountEntityId = getAccountEntityId;
module.exports.authorizeSourceAccount =
  authorizeSourceAccount;
module.exports.authorizeDestinationAccount =
  authorizeDestinationAccount;

function authorizeClassAccount(store, account, classId) {
  if (!store || !account || !classId) {
    throw new Error("Store, authenticated account and class are required.");
  }

  const classData = store.classes?.[classId];

  if (!classData) {
    throw new Error("Class not found.");
  }

  if (account.role === "teacher") {
    if (classData.teacher_id !== account.teacher_id) {
      throw new Error(
        "Authenticated teacher is not authorized for this class."
      );
    }

    return true;
  }

  if (account.role === "school") {
    if (classData.school_id !== account.school_id) {
      throw new Error(
        "Authenticated school is not authorized for this class."
      );
    }

    return true;
  }

  throw new Error(
    "Authenticated account cannot act on a class."
  );
}

function authorizeAccountForEntity(store, account, role, entityId) {
  if (role === "class") {
    return authorizeClassAccount(store, account, entityId);
  }

  return authorizeSourceAccount(account, role, entityId);
}

module.exports.authorizeClassAccount =
  authorizeClassAccount;

module.exports.authorizeAccountForEntity =
  authorizeAccountForEntity;

const CONNECTION_TYPE_ROLES = {
  general: null,

  parent_learner: {
    from_role: "parent",
    to_role: "learner"
  },
  teacher_learner: {
    from_role: "teacher",
    to_role: "learner"
  },
  school_teacher: {
    from_role: "school",
    to_role: "teacher"
  },
  school_learner: {
    from_role: "school",
    to_role: "learner"
  },
  school_class: {
    from_role: "school",
    to_role: "class"
  },
  teacher_class: {
    from_role: "teacher",
    to_role: "class"
  },
  class_learner: {
    from_role: "class",
    to_role: "learner"
  }
};

function validateConnectionTypeRoles({
  type,
  from_role,
  to_role
} = {}) {
  const expected = CONNECTION_TYPE_ROLES[type];

  if (type === "general") {
    const generalRoles = new Set([
      "learner",
      "teacher",
      "parent",
      "school"
    ]);

    if (
      !generalRoles.has(from_role) ||
      !generalRoles.has(to_role)
    ) {
      throw new Error(
        "General connections require valid user roles."
      );
    }

    if (from_role === to_role && !from_role) {
      throw new Error(
        "Invalid general connection."
      );
    }

    return true;
  }

  if (!expected) {
    throw new Error("Invalid connection type.");
  }

  if (
    from_role !== expected.from_role ||
    to_role !== expected.to_role
  ) {
    throw new Error(
      `Connection type ${type} requires ${expected.from_role} -> ${expected.to_role}.`
    );
  }

  return true;
}

const originalCreateValidatedConnection =
  createValidatedConnection;

function createValidatedConnectionWithTypeValidation(
  store,
  options = {}
) {
  validateConnectionTypeRoles(options);

  return originalCreateValidatedConnection(
    store,
    options
  );
}

module.exports.CONNECTION_TYPE_ROLES =
  CONNECTION_TYPE_ROLES;

module.exports.validateConnectionTypeRoles =
  validateConnectionTypeRoles;

module.exports.createValidatedConnection =
  createValidatedConnectionWithTypeValidation;

const CONNECTION_STATUS_TRANSITIONS = {
  pending: new Set(["active", "rejected", "revoked"]),
  active: new Set(["revoked"]),
  rejected: new Set([]),
  revoked: new Set([])
};

function validateConnectionStatusTransition(
  currentStatus,
  nextStatus
) {
  if (!VALID_STATUSES.has(currentStatus)) {
    throw new Error("Invalid current connection status.");
  }

  if (!VALID_STATUSES.has(nextStatus)) {
    throw new Error("Invalid next connection status.");
  }

  const allowed =
    CONNECTION_STATUS_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.has(nextStatus)) {
    throw new Error(
      `Invalid connection status transition: ${currentStatus} -> ${nextStatus}.`
    );
  }

  return true;
}

const originalChangeConnectionStatus =
  changeConnectionStatus;

function changeConnectionStatusWithTransitionValidation(
  store,
  connectionId,
  status
) {
  const connection = getConnection(store, connectionId);

  if (!connection) {
    throw new Error("Connection not found.");
  }

  validateConnectionStatusTransition(
    connection.status,
    status
  );

  return originalChangeConnectionStatus(
    store,
    connectionId,
    status
  );
}

module.exports.CONNECTION_STATUS_TRANSITIONS =
  CONNECTION_STATUS_TRANSITIONS;

module.exports.validateConnectionStatusTransition =
  validateConnectionStatusTransition;

module.exports.changeConnectionStatus =
  changeConnectionStatusWithTransitionValidation;

function authorizeAccountForConnection(account, connection) {
  if (!account) {
    throw new Error("Authenticated account is required.");
  }

  if (!connection) {
    throw new Error("Connection is required.");
  }

  const accountEntityId = getAccountEntityId(account);

  if (!accountEntityId) {
    throw new Error("Authenticated account is not linked to an entity.");
  }

  const isEndpoint =
    (connection.from_role === account.role &&
      connection.from_id === accountEntityId) ||
    (connection.to_role === account.role &&
      connection.to_id === accountEntityId);

  if (!isEndpoint) {
    throw new Error("Authenticated account is not authorized to view this connection.");
  }

  return true;
}

module.exports.authorizeAccountForConnection =
  authorizeAccountForConnection;
