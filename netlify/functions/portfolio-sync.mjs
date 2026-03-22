// netlify/functions/portfolio-sync.mjs
// Cloud sync endpoint for FinFolio portfolio data
// POST: save portfolio JSON (requires SYNC_SECRET)
// GET:  retrieve portfolio JSON (requires SYNC_SECRET)

import { getStore } from "@netlify/blobs";

function corsHeaders(origin) {
  const allowed = process.env.URL || 'https://finfolio-app.netlify.app';
  return {
    'Access-Control-Allow-Origin': (origin && (origin === allowed || origin.includes('localhost'))) ? origin : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

export default async (req, context) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(origin) };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders(origin) });
  }

  const secret = Netlify.env.get('SYNC_SECRET');
  if (!secret) return new Response(JSON.stringify({ error: 'SYNC_SECRET not configured on server' }), { status: 500, headers });

  const provided = req.headers.get('x-sync-secret') || new URL(req.url).searchParams.get('secret');
  if (provided !== secret) return new Response(JSON.stringify({ error: 'Invalid sync secret' }), { status: 401, headers });

  const store = getStore('portfolio');

  if (req.method === 'POST') {
    try {
      const data = await req.json();
      data._synced = new Date().toISOString();
      await store.set('current', JSON.stringify(data));
      return new Response(JSON.stringify({ ok: true, synced: data._synced }), { status: 200, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
    }
  }

  if (req.method === 'GET') {
    try {
      const raw = await store.get('current');
      if (!raw) return new Response(JSON.stringify({ error: 'No portfolio data synced yet' }), { status: 404, headers });
      return new Response(raw, { status: 200, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to read portfolio data' }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
};

export const config = {
  path: "/.netlify/functions/portfolio-sync"
};
