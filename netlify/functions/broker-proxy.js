// netlify/functions/broker-proxy.js
// Generic broker API proxy — routes requests to the correct broker API server-side
// This avoids CORS issues and keeps API secrets off the client

const BROKER_CONFIG = {
  hdfc_securities: {
    name: 'HDFC Securities',
    baseUrl: 'https://developer.hdfcsec.com/oapi/v1',
    endpoints: {
      holdings: { method: 'GET', path: '/portfolio/holdings' },
      positions: { method: 'GET', path: '/portfolio/positions' },
      funds: { method: 'GET', path: '/funds' },
      profile: { method: 'GET', path: '/user/profile' },
    },
  },
  zerodha: {
    name: 'Zerodha Kite',
    baseUrl: 'https://api.kite.trade',
    endpoints: {
      holdings: { method: 'GET', path: '/portfolio/holdings' },
      positions: { method: 'GET', path: '/portfolio/positions' },
      funds: { method: 'GET', path: '/user/margins' },
      profile: { method: 'GET', path: '/user/profile' },
    },
  },
  groww: {
    name: 'Groww',
    baseUrl: 'https://api.groww.in',
    endpoints: {
      holdings: { method: 'GET', path: '/v1/user/holdings' },
      positions: { method: 'GET', path: '/v1/user/positions' },
      funds: { method: 'GET', path: '/v1/user/funds' },
      profile: { method: 'GET', path: '/v1/user/profile' },
    },
  },
  angel_one: {
    name: 'Angel One',
    baseUrl: 'https://apiconnect.angelone.in',
    endpoints: {
      holdings: { method: 'GET', path: '/rest/secure/angelbroking/portfolio/v1/getHolding' },
      positions: { method: 'GET', path: '/rest/secure/angelbroking/order/v1/getPosition' },
      funds: { method: 'GET', path: '/rest/secure/angelbroking/user/v1/getRMS' },
      profile: { method: 'GET', path: '/rest/secure/angelbroking/user/v1/getProfile' },
    },
  },
  upstox: {
    name: 'Upstox',
    baseUrl: 'https://api.upstox.com/v2',
    endpoints: {
      holdings: { method: 'GET', path: '/portfolio/long-term-holdings' },
      positions: { method: 'GET', path: '/portfolio/short-term-positions' },
      funds: { method: 'GET', path: '/user/get-funds-and-margin' },
      profile: { method: 'GET', path: '/user/profile' },
    },
  },
};

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  try {
    const { broker, endpoint, token, extra_headers } = JSON.parse(event.body || '{}');

    // Validate
    if (!broker || !endpoint || !token) {
      return respond(400, { error: 'Missing required fields: broker, endpoint, token' });
    }

    const config = BROKER_CONFIG[broker];
    if (!config) {
      return respond(400, { error: `Unknown broker: ${broker}. Supported: ${Object.keys(BROKER_CONFIG).join(', ')}` });
    }

    const ep = config.endpoints[endpoint];
    if (!ep) {
      return respond(400, { error: `Unknown endpoint: ${endpoint}. Supported: ${Object.keys(config.endpoints).join(', ')}` });
    }

    // Build the request to the broker API
    const url = config.baseUrl + ep.path;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...buildAuthHeaders(broker, token),
      ...(extra_headers || {}),
    };

    console.log(`[broker-proxy] ${broker} → ${ep.method} ${url}`);

    const response = await fetch(url, {
      method: ep.method,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { raw: await response.text() };
    }

    return respond(response.status, {
      broker,
      endpoint,
      status: response.status,
      data,
    });
  } catch (err) {
    console.error('[broker-proxy] Error:', err.message);
    return respond(500, { error: 'Proxy error: ' + err.message });
  }
};

// Build auth headers specific to each broker's requirements
function buildAuthHeaders(broker, token) {
  switch (broker) {
    case 'hdfc_securities':
      return { 'Authorization': `Bearer ${token}` };
    case 'zerodha':
      return { 'Authorization': `token ${process.env.ZERODHA_API_KEY}:${token}` };
    case 'groww':
      return { 'Authorization': `Bearer ${token}` };
    case 'angel_one':
      return {
        'Authorization': `Bearer ${token}`,
        'X-ClientLocalIP': '',
        'X-ClientPublicIP': '',
        'X-MACAddress': '',
        'X-PrivateKey': process.env.ANGEL_API_KEY || '',
      };
    case 'upstox':
      return { 'Authorization': `Bearer ${token}` };
    default:
      return { 'Authorization': `Bearer ${token}` };
  }
}

function corsHeaders() {
  // Restrict CORS to our own domain — prevents other sites from calling our broker proxy
  const allowedOrigin = process.env.URL || 'https://finfolio-app.netlify.app';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
