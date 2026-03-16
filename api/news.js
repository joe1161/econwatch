// api/news.js — debug version
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, text: data.slice(0, 500) });
      });
    });
    req.on('error', (e) => resolve({ status: 0, text: 'ERROR: ' + e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, text: 'TIMEOUT' }); });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const testUrl = 'https://api.gdeltproject.org/api/v2/doc/doc?query=war&mode=artlist&maxrecords=3&timespan=24h&sourcelang=english&format=json';
  
  const result = await fetchUrl(testUrl);
  
  res.status(200).json({
    status: result.status,
    response_preview: result.text,
    ts: Date.now()
  });
};
