const BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

async function getCompound(name) {
  if (!name || typeof name !== "string") {
    throw new Error("PubChem compound name is required");
  }

  const encoded = encodeURIComponent(name.trim());

  const url =
    `${BASE_URL}/compound/name/${encoded}` +
    `/property/MolecularFormula,MolecularWeight,IUPACName/JSON`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubChem HTTP ${response.status}`);
  }

  const data = await response.json();
  const property = data?.PropertyTable?.Properties?.[0];

  if (!property) {
    throw new Error("PubChem returned no compound property");
  }

  return {
    success: true,
    source: "pubchem",
    type: "compound",
    query: name,
    result: property
  };
}

module.exports = {
  BASE_URL,
  getCompound
};
