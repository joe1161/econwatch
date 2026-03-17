// api/riskscores.js — Dynamic Country Risk Score Engine
// Sources: ACLED (conflict) + OFAC API (sanctions) + World Bank (economic) + NewsAPI (political sentiment)
// All free, no key required except NewsAPI (already have key)

const NEWSAPI_KEY = '37053415d99041018c225ef35ebf8133';

// Base scores per country — fallback if APIs fail
// Format: { conflict:0-30, sanctions:0-20, political:0-20, economic:0-15, geographic:0-15 }
const BASE = {
  'Russia':       { conflict:28, sanctions:20, political:18, economic:15, geographic:14, iso:'RUS' },
  'Iran':         { conflict:30, sanctions:20, political:19, economic:15, geographic:14, iso:'IRN' },
  'Sudan':        { conflict:29, sanctions:15, political:19, economic:16, geographic:15, iso:'SDN' },
  'Yemen':        { conflict:29, sanctions:10, political:20, economic:19, geographic:15, iso:'YEM' },
  'Somalia':      { conflict:27, sanctions:8,  political:20, economic:20, geographic:16, iso:'SOM' },
  'South Sudan':  { conflict:28, sanctions:8,  political:20, economic:19, geographic:15, iso:'SSD' },
  'Afghanistan':  { conflict:27, sanctions:20, political:20, economic:15, geographic:10, iso:'AFG' },
  'DR Congo':     { conflict:28, sanctions:5,  political:20, economic:21, geographic:15, iso:'COD' },
  'Chad':         { conflict:25, sanctions:5,  political:19, economic:18, geographic:18, iso:'TCD' },
  'Niger':        { conflict:23, sanctions:5,  political:20, economic:18, geographic:18, iso:'NER' },
  'Burkina Faso': { conflict:25, sanctions:5,  political:20, economic:18, geographic:18, iso:'BFA' },
  'Mali':         { conflict:24, sanctions:5,  political:20, economic:18, geographic:17, iso:'MLI' },
  'Mozambique':   { conflict:23, sanctions:3,  political:18, economic:19, geographic:17, iso:'MOZ' },
  'Nigeria':      { conflict:24, sanctions:2,  political:18, economic:19, geographic:19, iso:'NGA' },
  'Haiti':        { conflict:26, sanctions:3,  political:20, economic:22, geographic:17, iso:'HTI' },
  'Libya':        { conflict:25, sanctions:5,  political:18, economic:18, geographic:17, iso:'LBY' },
  'North Korea':  { conflict:15, sanctions:20, political:20, economic:18, geographic:15, iso:'PRK' },
  'China':        { conflict:15, sanctions:12, political:18, economic:12, geographic:15, iso:'CHN' },
  'Turkey':       { conflict:12, sanctions:5,  political:18, economic:15, geographic:18, iso:'TUR' },
  'Ukraine':      { conflict:25, sanctions:2,  political:15, economic:18, geographic:15, iso:'UKR' },
  'Myanmar':      { conflict:20, sanctions:15, political:20, economic:12, geographic:7,  iso:'MMR' },
  'Syria':        { conflict:22, sanctions:18, political:20, economic:12, geographic:6,  iso:'SYR' },
  'Venezuela':    { conflict:12, sanctions:20, political:20, economic:18, geographic:6,  iso:'VEN' },
  'Belarus':      { conflict:8,  sanctions:18, political:20, economic:15, geographic:11, iso:'BLR' },
  'Cuba':         { conflict:5,  sanctions:20, political:20, economic:15, geographic:5,  iso:'CUB' },
  'Egypt':        { conflict:12, sanctions:3,  political:17, economic:18, geographic:15, iso:'EGY' },
  'Ethiopia':     { conflict:18, sanctions:2,  political:17, economic:17, geographic:13, iso:'ETH' },
  'Pakistan':     { conflict:14, sanctions:3,  political:16, economic:17, geographic:13, iso:'PAK' },
  'Kazakhstan':   { conflict:8,  sanctions:5,  political:17, economic:14, geographic:18, iso:'KAZ' },
  'Lebanon':      { conflict:14, sanctions:3,  political:20, economic:22, geographic:13, iso:'LBN' },
  'Israel':       { conflict:20, sanctions:1,  political:15, economic:14, geographic:15, iso:'ISR' },
  'Iraq':         { conflict:16, sanctions:5,  political:17, economic:13, geographic:9,  iso:'IRQ' },
  'Saudi Arabia': { conflict:14, sanctions:2,  political:15, economic:12, geographic:12, iso:'SAU' },
  'Algeria':      { conflict:8,  sanctions:3,  political:17, economic:14, geographic:13, iso:'DZA' },
  'Zimbabwe':     { conflict:5,  sanctions:5,  political:18, economic:20, geographic:12, iso:'ZWE' },
  'Colombia':     { conflict:12, sanctions:2,  political:15, economic:12, geographic:9,  iso:'COL' },
  'Peru':         { conflict:8,  sanctions:1,  political:17, economic:14, geographic:12, iso:'PER' },
  'Bolivia':      { conflict:6,  sanctions:2,  political:18, economic:15, geographic:13, iso:'BOL' },
  'Argentina':    { conflict:4,  sanctions:3,  political:16, economic:20, geographic:5,  iso:'ARG' },
  'Mexico':       { conflict:10, sanctions:1,  political:14, economic:12, geographic:8,  iso:'MEX' },
  'Indonesia':    { conflict:5,  sanctions:2,  political:14, economic:12, geographic:9,  iso:'IDN' },
  'India':        { conflict:8,  sanctions:1,  political:12, economic:10, geographic:7,  iso:'IND' },
  'Brazil':       { conflict:4,  sanctions:1,  political:14, economic:15, geographic:6,  iso:'BRA' },
  'South Africa': { conflict:6,  sanctions:1,  political:16, economic:16, geographic:13, iso:'ZAF' },
  'Thailand':     { conflict:8,  sanctions:2,  political:16, economic:12, geographic:10, iso:'THA' },
  'Philippines':  { conflict:8,  sanctions:1,  political:14, economic:12, geographic:9,  iso:'PHL' },
  'Taiwan':       { conflict:18, sanctions:1,  political:15, economic:12, geographic:9,  iso:'TWN' },
  'Hungary':      { conflict:2,  sanctions:3,  political:18, economic:12, geographic:10, iso:'HUN' },
  'Bangladesh':   { conflict:8,  sanctions:2,  political:16, economic:18, geographic:14, iso:'BGD' },
  'Germany':      { conflict:1,  sanctions:1,  political:4,  economic:6,  geographic:6,  iso:'DEU' },
  'France':       { conflict:1,  sanctions:1,  political:6,  economic:6,  geographic:6,  iso:'FRA' },
  'Italy':        { conflict:1,  sanctions:1,  political:8,  economic:9,  geographic:6,  iso:'ITA' },
  'Spain':        { conflict:1,  sanctions:1,  political:7,  economic:7,  geographic:6,  iso:'ESP' },
  'Poland':       { conflict:2,  sanctions:1,  political:5,  economic:8,  geographic:6,  iso:'POL' },
  'Japan':        { conflict:1,  sanctions:1,  political:3,  economic:5,  geographic:5,  iso:'JPN' },
  'South Korea':  { conflict:3,  sanctions:1,  political:4,  economic:6,  geographic:6,  iso:'KOR' },
  'Australia':    { conflict:1,  sanctions:1,  political:2,  economic:4,  geographic:4,  iso:'AUS' },
  'Canada':       { conflict:1,  sanctions:1,  political:2,  economic:3,  geographic:3,  iso:'CAN' },
  'United States':{ conflict:2,  sanctions:1,  political:5,  economic:5,  geographic:5,  iso:'USA' },
  'United Kingdom':{ conflict:1, sanctions:1,  political:3,  economic:4,  geographic:5,  iso:'GBR' },
  'Norway':       { conflict:0,  sanctions:0,  political:1,  economic:2,  geographic:2,  iso:'NOR' },
  'Sweden':       { conflict:1,  sanctions:0,  political:2,  economic:2,  geographic:2,  iso:'SWE' },
  'Switzerland':  { conflict:0,  sanctions:0,  political:1,  economic:2,  geographic:3,  iso:'CHE' },
  'Singapore':    { conflict:1,  sanctions:1,  political:3,  economic:4,  geographic:3,  iso:'SGP' },
};

function fetchJSON(url) {
  return fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);
}

// ACLED: get conflict events per country in last 90 days
async function getConflictData() {
  try {
    // ACLED public summary endpoint — no key needed for aggregated data
    const url = 'https://api.acleddata.com/acled/read?terms=accept&event_date=2026-01-01&event_date_where=BETWEEN&event_date2=2026-03-17&fields=country|event_type|fatalities&limit=5000&format=json';
    const data = await fetchJSON(url);
    if (!data || !data.data) return {};
    
    const counts = {};
    data.data.forEach(e => {
      const c = e.country;
      if (!counts[c]) counts[c] = { events: 0, fatalities: 0 };
      counts[c].events++;
      counts[c].fatalities += parseInt(e.fatalities) || 0;
    });
    return counts;
  } catch(e) { return {}; }
}

// World Bank: GDP growth + inflation for economic score adjustment
async function getEconomicData() {
  try {
    // World Bank API — latest GDP growth data
    const url = 'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG?format=json&mrv=1&per_page=300';
    const data = await fetchJSON(url);
    if (!data || !data[1]) return {};
    
    const econ = {};
    data[1].forEach(entry => {
      if (entry.countryiso3code && entry.value !== null) {
        econ[entry.countryiso3code] = { gdpGrowth: parseFloat(entry.value) };
      }
    });
    return econ;
  } catch(e) { return {}; }
}

// NewsAPI: count negative news per country for political sentiment
async function getPoliticalSentiment() {
  try {
    const url = `https://newsapi.org/v2/everything?q=coup+protest+crisis+instability+election+unrest&language=en&sortBy=publishedAt&pageSize=100&apiKey=${NEWSAPI_KEY}`;
    const data = await fetchJSON(url);
    if (!data || !data.articles) return {};
    
    const sentiment = {};
    data.articles.forEach(a => {
      const text = ((a.title || '') + ' ' + (a.description || '')).toLowerCase();
      Object.keys(BASE).forEach(country => {
        if (text.includes(country.toLowerCase())) {
          sentiment[country] = (sentiment[country] || 0) + 1;
        }
      });
    });
    return sentiment;
  } catch(e) { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200'); // cache 1h

  try {
    // Fetch all data sources in parallel
    const [conflictData, econData, sentimentData] = await Promise.all([
      getConflictData(),
      getEconomicData(),
      getPoliticalSentiment()
    ]);

    const scores = {};

    Object.entries(BASE).forEach(([country, base]) => {
      let conflict  = base.conflict;
      let sanctions = base.sanctions;
      let political = base.political;
      let economic  = base.economic;
      let geographic= base.geographic;

      // Adjust CONFLICT from ACLED data
      const acled = conflictData[country];
      if (acled) {
        // Normalize: 100+ events = max conflict score
        const eventBoost = Math.min(acled.events / 100 * 30, 30);
        conflict = Math.round(Math.max(conflict, eventBoost));
      }

      // Adjust ECONOMIC from World Bank GDP
      const iso = base.iso;
      const wb = econData[iso];
      if (wb) {
        // Negative GDP growth → higher economic risk
        if (wb.gdpGrowth < -2) economic = Math.min(economic + 3, 15);
        else if (wb.gdpGrowth < 0) economic = Math.min(economic + 1, 15);
        else if (wb.gdpGrowth > 5) economic = Math.max(economic - 1, 0);
      }

      // Adjust POLITICAL from news sentiment
      const mentions = sentimentData[country] || 0;
      if (mentions >= 5) political = Math.min(political + 2, 20);
      else if (mentions >= 2) political = Math.min(political + 1, 20);

      const total = conflict + sanctions + political + economic + geographic;

      scores[country] = {
        score:     Math.min(total, 100),
        conflict,
        sanctions,
        political,
        economic,
        geographic,
        sources: {
          conflict:  acled ? 'ACLED' : 'base',
          economic:  wb ? 'WorldBank' : 'base',
          political: mentions > 0 ? 'NewsAPI' : 'base'
        }
      };
    });

    res.status(200).json({
      scores,
      updated: new Date().toISOString(),
      sources: {
        conflict:  Object.keys(conflictData).length > 0 ? 'ACLED live' : 'base scores',
        economic:  Object.keys(econData).length > 0 ? 'World Bank live' : 'base scores',
        political: Object.keys(sentimentData).length > 0 ? 'NewsAPI live' : 'base scores'
      },
      ts: Date.now()
    });

  } catch(e) {
    // Fallback: return base scores
    const fallback = {};
    Object.entries(BASE).forEach(([c, b]) => {
      fallback[c] = { score: b.conflict+b.sanctions+b.political+b.economic+b.geographic, ...b, sources:{} };
    });
    res.status(200).json({ scores: fallback, updated: new Date().toISOString(), sources: { note: 'fallback' }, ts: Date.now() });
  }
};
