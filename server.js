// server.js — Zero-dependency Node.js server for Fly.io deployment
// Reuses existing Netlify function handlers via adapter pattern
const http = require('http');
const fs = require('fs');
const path = require('path');

const brokerAuth = require('./netlify/functions/broker-auth.js');
const brokerProxy = require('./netlify/functions/broker-proxy.js');

const PORT = process.env.PORT || 8080;

// Security headers (matching netlify.toml)
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "connect-src 'self' https://*.supabase.co https://api.mfapi.in https://api.gold-api.com https://finnhub.io https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://openrouter.ai https://gmail.googleapis.com https://cdn.jsdelivr.net https://query1.finance.yahoo.com https://overpass-api.de",
    "img-src 'self' data: https://*.tile.openstreetmap.org",
    "frame-src https://accounts.google.com",
  ].join('; '),
};

// Read request body as string
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Adapt Netlify function handler to Node http
async function netlifyAdapter(handler, req, res) {
  const body = await readBody(req);
  const event = {
    httpMethod: req.method,
    headers: req.headers,
    body: body || null,
    path: req.url,
  };

  try {
    const result = await handler(event);
    const headers = { ...SECURITY_HEADERS, ...result.headers };
    res.writeHead(result.statusCode, headers);
    res.end(result.body);
  } catch (err) {
    console.error('[server] Handler error:', err);
    res.writeHead(500, { ...SECURITY_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Serve static file
function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, SECURITY_HEADERS);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API routes — delegate to Netlify function handlers
  if (pathname === '/api/broker-auth') {
    return netlifyAdapter(brokerAuth.handler, req, res);
  }
  if (pathname === '/api/broker-proxy') {
    return netlifyAdapter(brokerProxy.handler, req, res);
  }

  // Only handle GET for static files
  if (req.method !== 'GET') {
    res.writeHead(405, SECURITY_HEADERS);
    res.end('Method not allowed');
    return;
  }

  // OAuth callback + root → serve index.html
  if (pathname === '/' || pathname === '/auth/callback') {
    return serveFile(path.join(__dirname, 'index.html'), res);
  }

  // Other static files
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end('Forbidden');
    return;
  }

  serveFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`[finfolio] Server running on port ${PORT}`);
  console.log(`[finfolio] Static IP deployment for broker API compliance`);
});
