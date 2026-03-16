// api/news.js — v3 debug
const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  // Step 1: test basic outbound connectivity
  const testGoogle = await new Promise((resolve) => {
    const req2 = https.get('https://www.google.com', (r) => {
      resolve({ ok: true, status: r.statusCode });
      r.resume();
    });
    req2.on('error', (e) => resolve({ ok: false, err: e.message }));
    req2.setTimeout(5000, () => { req2.destroy(); resolve({ ok: false, err: 'timeout' }); });
  });

  // Step 2: test GDELT
  const gdeltUrl = 'https://api.gdeltproject.org/api/v2/doc/doc?query=war&mode=artlist&maxrecords=3&timespan=24h&sourcelang=english&format=json';
  const testGdelt = await new Promise((resolve) => {
    const req3 = https.get(gdeltUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => resolve({ ok: r.statusCode === 200, status: r.statusCode, preview: data.slice(0, 300) }));
    });
    req3.on('error', (e) => resolve({ ok: false, err: e.message }));
    req3.setTimeout(10000, () => { req3.destroy(); resolve({ ok: false, err: 'timeout' }); });
  });

  res.status(200).json({ google: testGoogle, gdelt: testGdelt, v: 3, ts: Date.now() });
};
