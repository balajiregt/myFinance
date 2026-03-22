// netlify/functions/portfolio-sync.js
// Cloud sync endpoint for FinFolio portfolio data
// POST: save portfolio JSON (requires SYNC_SECRET)
// GET:  retrieve portfolio JSON (requires SYNC_SECRET)

const { getStore } = require('@netlify/blobs');

function corsHeaders(origin) {
  const allowed = process.env.URL || 'https://finfolio-app.netlify.app';
  return {
    'Access-Control-Allow-Origin': (origin && (origin === allowed || origin.includes('localhost'))) ? origin : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

function respond(statusCode, body, origin) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  const secret = process.env.SYNC_SECRET;
  if (!secret) return respond(500, { error: 'SYNC_SECRET not configured on server' }, origin);

  const provided = event.headers['x-sync-secret'] || event.queryStringParameters?.secret;
  if (provided !== secret) return respond(401, { error: 'Invalid sync secret' }, origin);

  const store = getStore('portfolio');

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      data._synced = new Date().toISOString();
      await store.set('current', JSON.stringify(data));
      return respond(200, { ok: true, synced: data._synced }, origin);
    } catch (e) {
      return respond(400, { error: 'Invalid JSON body' }, origin);
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get('current');
      if (!raw) return respond(404, { error: 'No portfolio data synced yet' }, origin);
      return respond(200, JSON.parse(raw), origin);
    } catch (e) {
      return respond(500, { error: 'Failed to read portfolio data' }, origin);
    }
  }

  return respond(405, { error: 'Method not allowed' }, origin);
};
