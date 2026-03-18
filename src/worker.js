// Cloudflare Worker - DART API Proxy
// Handles /api/* requests as a proxy to DART OpenAPI
// Static files in /public are served automatically by [assets]

const DART_API_BASE = 'https://opendart.fss.or.kr/api';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle /api/* paths - everything else goes to static assets
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Extract DART API endpoint from path: /api/fnlttSinglAcnt.json -> fnlttSinglAcnt.json
    const apiPath = url.pathname.replace('/api/', '');

    if (!apiPath) {
      return jsonResponse({ error: 'No API path specified' }, 400);
    }

    // Get API key
    const apiKey = env.DART_API_KEY || '';

    if (!apiKey) {
      return jsonResponse({ error: 'API key not configured' }, 500);
    }

    // Build DART API URL
    const dartUrl = new URL(`${DART_API_BASE}/${apiPath}`);

    // Copy query params from request
    for (const [key, value] of url.searchParams.entries()) {
      dartUrl.searchParams.set(key, value);
    }

    // Inject API key
    dartUrl.searchParams.set('crtfc_key', apiKey);

    try {
      const dartResponse = await fetch(dartUrl.toString());
      const contentType = dartResponse.headers.get('content-type') || '';

      // Handle zip response (corpCode.xml)
      if (contentType.includes('zip') || contentType.includes('octet-stream')) {
        const blob = await dartResponse.arrayBuffer();
        return new Response(blob, {
          status: dartResponse.status,
          headers: {
            ...corsHeaders(),
            'Content-Type': 'application/zip',
          },
        });
      }

      // Handle JSON/XML response
      const data = await dartResponse.text();
      return new Response(data, {
        status: dartResponse.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': contentType || 'application/json; charset=utf-8',
        },
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
