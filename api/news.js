// api/news.js — NewsAPI.org (Vercel Serverless, CommonJS)
const https = require('https');

const API_KEY = '37053415d99041018c225ef35ebf8133';

function fetchUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-Api-Key': API_KEY }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode === 200, body: JSON.parse(data) }); }
        catch(e) { resolve({ ok: false, body: null }); }
      });
    });
    req.on('error', () => resolve({ ok: false, body: null }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, body: null }); });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // NewsAPI — top headlines + geopolitical search
    const urls = [
      'https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=10&apiKey=' + API_KEY,
      'https://newsapi.org/v2/everything?q=war+sanctions+oil+conflict+geopolitical&language=en&sortBy=publishedAt&pageSize=10&apiKey=' + API_KEY
    ];

    const results = await Promise.all(urls.map(fetchUrl));
    const articles = results
      .filter(r => r.ok && r.body && r.body.articles)
      .flatMap(r => r.body.articles)
      .filter(a => a.title && a.title !== '[Removed]' && a.url);

    // Deduplicate by URL
    const seen = new Set();
    const deduped = articles.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url); return true;
    });

    // Map to EconWatch format
    const mapped = deduped.slice(0, 20).map(a => ({
      title:    a.title.slice(0, 90),
      url:      a.url,
      domain:   (a.source && a.source.name) || '',
      seendate: (a.publishedAt || '').replace(/[^0-9]/g, '').slice(0, 14),
      label:    'NEWS'
    }));

    res.status(200).json({ articles: mapped, count: mapped.length, ts: Date.now() });
  } catch(e) {
    res.status(500).json({ error: e.message, articles: [], count: 0 });
  }
};
