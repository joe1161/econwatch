// api/vix.js — Vercel Serverless Function
// Proxies Yahoo Finance ^VIX — no CORS issues server-side

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1m&range=1d';
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!r.ok) throw new Error('Yahoo HTTP ' + r.status);
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('no meta');
    res.status(200).json({
      price: meta.regularMarketPrice,
      open:  meta.chartPreviousClose || meta.previousClose,
      ts:    Date.now()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
