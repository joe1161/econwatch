// api/news.js — Vercel Serverless Function (CommonJS)
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode === 200, body: JSON.parse(data) }); }
        catch(e) { resolve({ ok: false, body: null }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, body: null, err: e.message }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ ok: false, body: null, err: 'timeout' }); });
  });
}

// Single broad query — more reliable than multiple narrow ones
const QUERIES = [
  'geopolitical conflict war sanctions',
  'oil energy market economy inflation',
  'trade tariff military diplomacy'
];

async function fetchQuery(q) {
  const url = 'https://api.gdeltproject.org/api/v2/doc/doc'
    + '?query=' + encodeURIComponent(q)
    + '&mode=artlist'
    + '&maxrecords=10'
    + '&timespan=24h'
    + '&sort=datedesc'
    + '&sourcelang=english'
    + '&format=json';

  const result = await fetchUrl(url);
  if (!result.ok || !result.body || !result.body.articles) return [];

  return result.body.articles.map(a => ({
    title:    (a.title || '').replace(/[<>]/g, '').trim().slice(0, 90),
    url:      a.url || '',
    domain:   (a.domain || '').replace(/^www\./, ''),
    seendate: a.seendate || '',
    label:    q.split(' ')[0].toUpperCase()
  })).filter(a => a.title && a.url);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // Run queries sequentially to avoid overwhelming GDELT
    let all = [];
    for (const q of QUERIES) {
      const articles = await fetchQuery(q);
      all = all.concat(articles);
    }

    // Deduplicate by URL
    const seen = new Set();
    const deduped = all.filter(a => {
      if (!a.url || seen.has(a.url)) return false;
      seen.add(a.url); return true;
    });

    // Sort by date descending
    deduped.sort((a, b) => (b.seendate || '').localeCompare(a.seendate || ''));

    res.status(200).json({ articles: deduped, count: deduped.length, ts: Date.now() });
  } catch(e) {
    res.status(500).json({ error: e.message, articles: [], count: 0 });
  }
};
