const BASE_URL =
  "https://physics.nist.gov/cuu/Constants";

async function getConstantsTable() {
  const response = await fetch(
    `${BASE_URL}/Table/allascii.txt`
  );

  if (!response.ok) {
    throw new Error(`NIST HTTP ${response.status}`);
  }

  return response.text();
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function findConstant(name) {
  if (!name || typeof name !== "string") {
    throw new Error("NIST constant name is required");
  }

  const table = await getConstantsTable();
  const target = normalizeName(name)
    .replace(/\ba\b/g, "")
    .replace(/\ban\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const lines = table.split(/\r?\n/);

  const matches = lines
    .map(line => line.trim().replace(/\s+/g, " "))
    .filter(line => line)
    .filter(line => {
      const normalizedLine = normalizeName(line);

      return (
        normalizedLine.includes(target) ||
        target.includes(normalizedLine)
      );
    });

  if (!matches.length) {
    return {
      success: false,
      source: "nist",
      type: "codata_constant",
      query: name,
      result: null,
      error: "Constant not found"
    };
  }

  return {
    success: true,
    source: "nist",
    type: "codata_constant",
    query: name,
    result: matches.slice(0, 10)
  };
}

module.exports = {
  BASE_URL,
  getConstantsTable,
  findConstant
};
