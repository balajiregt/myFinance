// api/broker-auth.js
// Handles OAuth token exchange for all supported brokers
// The client sends the auth code received from broker's OAuth redirect,
// this function exchanges it for an access token server-side (keeping secrets safe)

const BROKER_AUTH_CONFIG = {
  hdfc_securities: {
    // HDFC uses: POST /oapi/v1/access-token?api_key=XXX&request_token=XXX
    // Body: { "apiSecret": "XXX" }
    // Returns: { accessToken: "eyJ..." }
    tokenUrl: 'https://developer.hdfcsec.com/oapi/v1/access-token',
    buildTokenRequest: (code, redirectUri) => {
      const apiKey = process.env.HDFC_API_KEY || '';
      const apiSecret = process.env.HDFC_API_SECRET || '';
      const url = `https://developer.hdfcsec.com/oapi/v1/access-token?api_key=${apiKey}&request_token=${code}`;
      return {
        _fullUrl: url, // Custom field — handler uses this instead of tokenUrl
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        body: JSON.stringify({ apiSecret }),
      };
    },
    parseToken: (data) => ({
      access_token: data.accessToken || data.access_token,
      expires_in: 86400,
      token_type: 'raw', // HDFC uses raw token, not "Bearer" prefix
    }),
  },
  zerodha: {
    tokenUrl: 'https://api.kite.trade/session/token',
    buildTokenRequest: (code, redirectUri) => {
      // Zerodha uses api_key + request_token + checksum
      const crypto = require('crypto');
      const apiKey = process.env.ZERODHA_API_KEY || '';
      const apiSecret = process.env.ZERODHA_API_SECRET || '';
      const checksum = crypto
        .createHash('sha256')
        .update(apiKey + code + apiSecret)
        .digest('hex');
      return {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          api_key: apiKey,
          request_token: code,
          checksum,
        }).toString(),
      };
    },
    parseToken: (data) => ({
      access_token: data.data?.access_token,
      expires_in: 86400, // Zerodha tokens valid for 1 day
      token_type: 'token',
    }),
  },
  groww: {
    tokenUrl: 'https://api.groww.in/v1/auth/token',
    buildTokenRequest: (code, redirectUri) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.GROWW_API_KEY || '',
        client_secret: process.env.GROWW_API_SECRET || '',
      }),
    }),
    parseToken: (data) => ({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: 'Bearer',
    }),
  },
  angel_one: {
    tokenUrl: 'https://apiconnect.angelone.in/rest/auth/angelbroking/jwt/v1/generateTokens',
    buildTokenRequest: (code, redirectUri) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PrivateKey': process.env.ANGEL_API_KEY || '',
      },
      body: JSON.stringify({
        clientcode: process.env.ANGEL_CLIENT_ID || '',
        password: code, // Angel One uses TOTP as the "code"
        totp: code,
      }),
    }),
    parseToken: (data) => ({
      access_token: data.data?.jwtToken,
      refresh_token: data.data?.refreshToken,
      expires_in: 86400,
      token_type: 'Bearer',
    }),
  },
  upstox: {
    tokenUrl: 'https://api.upstox.com/v2/login/authorization/token',
    buildTokenRequest: (code, redirectUri) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.UPSTOX_API_KEY || '',
        client_secret: process.env.UPSTOX_API_SECRET || '',
      }).toString(),
    }),
    parseToken: (data) => ({
      access_token: data.access_token,
      expires_in: data.expires_in || 86400,
      token_type: 'Bearer',
    }),
  },
};

// OAuth login URL builders — uses server-side env vars so API keys stay secret
const BROKER_LOGIN_URLS = {
  hdfc_securities: (redirectUri) => {
    const apiKey = process.env.HDFC_API_KEY || '';
    if (!apiKey) return null;
    return `https://developer.hdfcsec.com/oapi/v1/login?api_key=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  },
  zerodha: (redirectUri) => {
    const apiKey = process.env.ZERODHA_API_KEY || '';
    if (!apiKey) return null;
    return `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3`;
  },
  upstox: (redirectUri) => {
    const apiKey = process.env.UPSTOX_API_KEY || '';
    if (!apiKey) return null;
    return `https://api.upstox.com/v2/login/authorization/dialog?client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  },
  groww: (redirectUri) => {
    const apiKey = process.env.GROWW_API_KEY || '';
    if (!apiKey) return null;
    return `https://api.groww.in/v1/auth/authorize?client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  },
  // Angel One uses TOTP, not OAuth redirect
  angel_one: () => null,
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(event, 405, { error: 'Method not allowed' });
  }

  try {
    const { broker, code, redirect_uri, action } = JSON.parse(event.body || '{}');

    if (!broker) {
      return respond(event, 400, { error: 'Missing required field: broker' });
    }

    // ── ACTION: get_auth_url — return the OAuth login URL with API key baked in ──
    if (action === 'get_auth_url') {
      const urlBuilder = BROKER_LOGIN_URLS[broker];
      if (!urlBuilder) {
        return respond(event, 400, { error: `No OAuth URL builder for broker: ${broker}` });
      }
      const siteUrl = redirect_uri || process.env.URL || 'http://localhost:8888';
      const authUrl = urlBuilder(siteUrl + '/auth/callback');
      if (!authUrl) {
        return respond(event, 400, {
          error: `API key not configured for ${broker}. Set via: fly secrets set.`,
          needs_env: true,
        });
      }
      return respond(event, 200, { broker, auth_url: authUrl });
    }

    // ── ACTION: token exchange (default) — exchange auth code for access token ──
    if (!code) {
      return respond(event, 400, { error: 'Missing required field: code' });
    }

    const config = BROKER_AUTH_CONFIG[broker];
    if (!config) {
      return respond(event, 400, {
        error: `Unknown broker: ${broker}. Supported: ${Object.keys(BROKER_AUTH_CONFIG).join(', ')}`,
      });
    }

    // Check if env vars are configured for this broker
    const envPrefix = broker.toUpperCase().replace(/_/g, '_');
    // We just try — if secrets are missing, the broker will reject

    const siteUrl = redirect_uri || process.env.URL || 'http://localhost:8888';
    const reqOpts = config.buildTokenRequest(code, siteUrl + '/auth/callback');

    // Some brokers (HDFC) need the full URL with query params
    const fetchUrl = reqOpts._fullUrl || config.tokenUrl;
    delete reqOpts._fullUrl; // Clean up before passing to fetch

    console.log(`[broker-auth] Exchanging token for ${broker} → ${fetchUrl.split('?')[0]}`);

    const response = await fetch(fetchUrl, reqOpts);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[broker-auth] ${broker} token exchange failed:`, data);
      return respond(event, response.status, {
        error: 'Token exchange failed',
        broker,
      });
    }

    const tokenInfo = config.parseToken(data);

    if (!tokenInfo.access_token) {
      console.error(`[broker-auth] ${broker} no access_token in response:`, data);
      return respond(event, 400, {
        error: 'No access token in response',
        broker,
      });
    }

    return respond(event, 200, {
      broker,
      ...tokenInfo,
      authenticated: true,
    });
  } catch (err) {
    console.error('[broker-auth] Error:', err.message);
    return respond(event, 500, { error: 'Auth error. Check server logs.' });
  }
};

function corsHeaders(event) {
  const allowedOrigin = process.env.URL || event?.headers?.origin || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function respond(event, statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
