// api/news.js — CommonJS, fetch nativo Node 18
const API_KEY = '37053415d99041018c225ef35ebf8133';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    const url = `https://newsapi.org/v2/everything?q=war+sanctions+oil+geopolitical+conflict&language=en&sortBy=publishedAt&pageSize=15&apiKey=${API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data.articles) throw new Error(data.message || 'no articles');
    const articles = data.articles
      .filter(a => a.title && a.title !== '[Removed]' && a.url)
      .map(a => ({
        title:    a.title.slice(0, 90),
        url:      a.url,
        domain:   (a.source && a.source.name) || '',
        seendate: (a.publishedAt || '').replace(/[^0-9]/g, '').slice(0, 14),
        label:    'NEWS'
      }));
    res.status(200).json({ articles, count: articles.length, ts: Date.now() });
  } catch(e) {
    res.status(500).json({ error: e.message, articles: [] });
  }
};
