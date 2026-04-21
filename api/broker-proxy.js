// api/broker-proxy.js
// Generic broker API proxy — routes requests to the correct broker API server-side
// This avoids CORS issues and keeps API secrets off the client

const BROKER_CONFIG = {
  hdfc_securities: {
    name: 'HDFC Securities',
    baseUrl: 'https://developer.hdfcsec.com/oapi/v1',
    // HDFC requires ?api_key= on every request
    appendApiKey: true,
    endpoints: {
      holdings: { method: 'GET', path: '/portfolio/holdings' },
      positions: { method: 'GET', path: '/portfolio/positions' },
      funds: { method: 'GET', path: '/funds-and-margins' },
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
    return { statusCode: 200, headers: corsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(event, 405, { error: 'Method not allowed' });
  }

  try {
    const { broker, endpoint, token } = JSON.parse(event.body || '{}');

    // Validate
    if (!broker || !endpoint || !token) {
      return respond(event, 400, { error: 'Missing required fields: broker, endpoint, token' });
    }

    const config = BROKER_CONFIG[broker];
    if (!config) {
      return respond(event, 400, { error: `Unknown broker: ${broker}. Supported: ${Object.keys(BROKER_CONFIG).join(', ')}` });
    }

    const ep = config.endpoints[endpoint];
    if (!ep) {
      return respond(event, 400, { error: `Unknown endpoint: ${endpoint}. Supported: ${Object.keys(config.endpoints).join(', ')}` });
    }

    // Build the request URL
    let url = config.baseUrl + ep.path;
    // HDFC requires ?api_key= on every API request
    if (config.appendApiKey) {
      const apiKey = process.env.HDFC_API_KEY || '';
      url += (url.includes('?') ? '&' : '?') + `api_key=${apiKey}`;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      ...buildAuthHeaders(broker, token),
    };

    console.log(`[broker-proxy] ${broker} → ${ep.method} ${url.split('?')[0]}`);

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

    return respond(event, response.status, {
      broker,
      endpoint,
      status: response.status,
      data,
    });
  } catch (err) {
    console.error('[broker-proxy] Error:', err.message);
    return respond(event, 500, { error: 'Proxy error. Check server logs.' });
  }
};

// Build auth headers specific to each broker's requirements
function buildAuthHeaders(broker, token) {
  switch (broker) {
    case 'hdfc_securities':
      // HDFC uses raw accessToken in Authorization header (no "Bearer" prefix)
      return { 'Authorization': token };
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
