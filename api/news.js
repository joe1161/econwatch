// api/news.js — Vercel Serverless Function
// Proxies GDELT DOC 2.0 API — called by EconWatch frontend
// No CORS issues: browser calls /api/news on same domain

export default async function handler(req, res) {
  // CORS headers — allow requests from same origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate'); // cache 3 min

  const QUERIES = [
    {
      q: 'Iran OR Israel OR nuclear OR strike OR war OR "military operation" OR Ukraine OR Gaza OR conflict OR ceasefire',
      label: 'CONFLICT/WAR',
      timespan: '4h'
    },
    {
      q: 'sanctions OR OFAC OR SDN OR "dark fleet" OR "oil embargo" OR "export control" OR tariff OR "trade war"',
      label: 'SANCTIONS/TRADE',
      timespan: '4h'
    },
    {
      q: 'shipping OR "Red Sea" OR "Strait of Hormuz" OR "Suez Canal" OR vessel OR port OR blockade OR pipeline',
      label: 'SHIPPING/INFRA',
      timespan: '4h'
    },
    {
      q: '"crude oil" OR "natural gas" OR gold OR copper OR "supply chain" OR PMI OR inflation OR "central bank" OR "interest rate"',
      label: 'COMMODITIES/MACRO',
      timespan: '4h'
    }
  ];

  const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';

  async function fetchQuery(q) {
    const url = `${GDELT}?query=${encodeURIComponent(q.q)}&mode=artlist&maxrecords=10&timespan=${q.timespan}&sourcelang=english&format=json`;
    try {
      const r = await fetch(url);
      if (!r.ok) return [];
      const data = await r.json();
      if (!data || !data.articles) return [];
      return data.articles.map(a => ({
        title: (a.title || '').slice(0, 85),
        url:   a.url || '',
        domain: (a.domain || q.label).replace(/^www\./, ''),
        seendate: a.seendate || '',
        label: q.label
      })).filter(a => a.title);
    } catch (e) {
      return [];
    }
  }

  try {
    const results = await Promise.all(QUERIES.map(fetchQuery));
    const all = results.flat();

    // Deduplicate by URL
    const seen = new Set();
    const deduped = all.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    res.status(200).json({ articles: deduped, ts: Date.now() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

