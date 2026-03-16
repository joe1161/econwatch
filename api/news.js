// api/news.js — Vercel Serverless Function (CommonJS)
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const QUERIES = [
  { q: 'Iran OR Israel OR nuclear OR war OR Ukraine OR Gaza OR conflict OR ceasefire OR "military operation"', label: 'CONFLICT/WAR', timespan: '4h' },
  { q: 'sanctions OR OFAC OR SDN OR "dark fleet" OR "oil embargo" OR "export control" OR tariff OR "trade war"', label: 'SANCTIONS/TRADE', timespan: '4h' },
  { q: 'shipping OR "Red Sea" OR "Strait of Hormuz" OR "Suez Canal" OR vessel OR port OR blockade OR pipeline', label: 'SHIPPING/INFRA', timespan: '4h' },
  { q: '"crude oil" OR "natural gas" OR gold OR copper OR "supply chain" OR PMI OR inflation OR "central bank"', label: 'COMMODITIES/MACRO', timespan: '4h' }
];

async function fetchQuery(q) {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q.q)}&mode=artlist&maxrecords=10&timespan=${q.timespan}&sourcelang=english&format=json`;
  try {
    const data = await fetchUrl(url);
    if (!data || !data.articles) return [];
    return data.articles.map(a => ({
      title: (a.title || '').slice(0, 85),
      url: a.url || '',
      domain: (a.domain || q.label).replace(/^www\./, ''),
      seendate: a.seendate || '',
      label: q.label
    })).filter(a => a.title);
  } catch(e) { return []; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const results = await Promise.all(QUERIES.map(fetchQuery));
    const all = results.flat();
    const seen = new Set();
    const deduped = all.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url); return true;
    });
    res.status(200).json({ articles: deduped, ts: Date.now() });
  } catch(e) {
    res.status(500).json({ error: e.message, articles: [] });
  }
};
