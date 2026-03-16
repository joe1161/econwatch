// api/news.js — usa fetch nativo Node 18+
const API_KEY = '37053415d99041018c225ef35ebf8133';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  try {
    const url = 'https://newsapi.org/v2/everything?q=war+sanctions+oil+geopolitical&language=en&sortBy=publishedAt&pageSize=15&apiKey=' + API_KEY;
    const r = await fetch(url);
    const data = await r.json();

    if (!data.articles) throw new Error(data.message || 'no articles');

    const mapped = data.articles
      .filter(a => a.title && a.title !== '[Removed]')
      .map(a => ({
        title:  a.title.slice(0, 90),
        url:    a.url,
        domain: (a.source && a.source.name) || '',
        seendate: (a.publishedAt || '').replace(/[^0-9]/g, '').slice(0, 14),
        label:  'NEWS'
      }));

    res.status(200).json({ articles: mapped, count: mapped.length, ts: Date.now() });
  } catch(e) {
    res.status(500).json({ error: e.message, articles: [] });
  }
}

