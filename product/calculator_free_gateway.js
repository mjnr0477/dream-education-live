const BASE_URL = "https://calculator.free/api/v1";

async function getCatalog() {
  const response = await fetch(`${BASE_URL}/`);

  if (!response.ok) {
    throw new Error(`Calculator.Free catalog HTTP ${response.status}`);
  }

  return response.json();
}

async function calculate(slug, fields = {}, options = {}) {
  if (!slug || typeof slug !== "string") {
    throw new Error("Calculator.Free slug is required");
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(fields || {})) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  if (options.country) {
    params.set("country", options.country);
  }

  const url = `${BASE_URL}/${encodeURIComponent(slug)}/?${params.toString()}`;

  const response = await fetch(url);
  const data = await response.json();

  return {
    ok: response.ok && data.ok === true,
    status: response.status,
    solver: `calculator.free:${slug}`,
    slug,
    inputs: data.inputs || {},
    results: data.results || {},
    schedule: data.schedule || null,
    chart: data.chart || null,
    defaults_applied: data.defaults_applied || [],
    error: data.error || null,
    message: data.message || null,
    raw: data
  };
}

module.exports = {
  BASE_URL,
  getCatalog,
  calculate
};
