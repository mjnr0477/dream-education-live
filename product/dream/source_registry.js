const SOURCES=[
{name:'OpenAlex',kind:'research',access:'free',license:'CC0 data; API terms/rate limits apply',url:'https://openalex.org/'},
{name:'Crossref',kind:'research',access:'free',license:'metadata/API terms apply',url:'https://www.crossref.org/'},
{name:'PubMed',kind:'research',access:'free',license:'source-specific',url:'https://pubmed.ncbi.nlm.nih.gov/'},
{name:'Europe PMC',kind:'research',access:'free',license:'source-specific',url:'https://europepmc.org/'},
{name:'arXiv',kind:'research',access:'free',license:'source-specific',url:'https://arxiv.org/'},
{name:'DOAJ',kind:'research',access:'free',license:'source-specific',url:'https://doaj.org/'},
{name:'Wikidata',kind:'knowledge',access:'free',license:'CC0',url:'https://www.wikidata.org/'},
{name:'Wikimedia Commons',kind:'media',access:'free/open',license:'per-file license',url:'https://commons.wikimedia.org/'},
{name:'Open Library',kind:'books',access:'free/open',license:'API/service terms; book rights vary',url:'https://openlibrary.org/'},
{name:'UNESCO UIS',kind:'education',access:'free/open data',license:'terms/attribution apply',url:'https://uis.unesco.org/'},
{name:'World Bank Open Data',kind:'development',access:'free/open',license:'terms/license vary',url:'https://data.worldbank.org/'},
{name:'ESCO',kind:'skills',access:'free/open',license:'EUPL/data terms vary',url:'https://esco.ec.europa.eu/'},
{name:'O*NET',kind:'occupations',access:'free/open',license:'CC BY 4.0',url:'https://www.onetcenter.org/database.html'},
{name:'Common Crawl',kind:'web-corpus',access:'free/open corpus',license:'original content rights vary',url:'https://commoncrawl.org/'},
{name:'NASA',kind:'science',access:'free/open resources',license:'resource-specific',url:'https://www.nasa.gov/'},
{name:'NOAA',kind:'science',access:'free/open data',license:'resource-specific',url:'https://www.noaa.gov/'},
{name:'USGS',kind:'science',access:'free/open data',license:'resource-specific',url:'https://www.usgs.gov/'},
{name:'GBIF',kind:'biodiversity',access:'free/open data',license:'dataset-specific',url:'https://www.gbif.org/'}
];
module.exports={SOURCES,getSource:(name)=>SOURCES.find(s=>s.name.toLowerCase()===String(name).toLowerCase())};
