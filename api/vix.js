// api/vix.js — Vercel Serverless Function (CommonJS)
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const data = await fetchUrl('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1m&range=1d');
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('no meta in Yahoo response');
    res.status(200).json({
      price: meta.regularMarketPrice,
      open:  meta.chartPreviousClose || meta.previousClose,
      ts:    Date.now()
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
