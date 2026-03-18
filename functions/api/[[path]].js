// Cloudflare Pages Function - DART API Proxy
// This handles CORS issues by proxying DART API requests server-side

const DART_API_BASE = 'https://opendart.fss.or.kr/api';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Extract the DART API path from our proxy path
  // /api/fnlttSinglAcntAll.json -> fnlttSinglAcntAll.json
  const pathParts = url.pathname.replace('/api/', '');
  
  if (!pathParts) {
    return new Response(JSON.stringify({ error: 'No API path specified' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Get API key from environment variable or fallback
  const apiKey = env.DART_API_KEY || 'a9a1b6d42a2414cc31a9f0f809369d8eab15a2ba';
  
  // Build DART API URL with all query params
  const dartUrl = new URL(`${DART_API_BASE}/${pathParts}`);
  
  // Copy all query params from the request
  for (const [key, value] of url.searchParams.entries()) {
    dartUrl.searchParams.set(key, value);
  }
  
  // Always inject the API key
  dartUrl.searchParams.set('crtfc_key', apiKey);

  try {
    const dartResponse = await fetch(dartUrl.toString());
    
    // Check if response is a zip file (for corpCode.xml)
    const contentType = dartResponse.headers.get('content-type') || '';
    
    if (contentType.includes('application/zip') || contentType.includes('application/octet-stream')) {
      const blob = await dartResponse.arrayBuffer();
      return new Response(blob, {
        status: dartResponse.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="corpCode.zip"',
        },
      });
    }

    const data = await dartResponse.text();
    
    return new Response(data, {
      status: dartResponse.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': contentType || 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
}
