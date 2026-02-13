const UPSTREAM_URL = 'https://otistx.com/api/x7k9m2p4/voucher-configs';

async function fetchUpstream(url, init) {
  if (typeof fetch === 'function') {
    return fetch(url, init);
  }

  const nodeFetch = await import('node-fetch');
  return nodeFetch.default(url, init);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const upstream = await fetchUpstream(UPSTREAM_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': 'save100-proxy/1.0',
      },
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return res.status(upstream.status).send(body);
  } catch (err) {
    return res.status(502).json({
      message: 'Upstream fetch failed',
      error: err?.message || 'Unknown error',
    });
  }
};
