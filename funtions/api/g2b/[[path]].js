/**
 * G2B (조달청) API Proxy for Cloudflare Pages Functions
 * Routes /api/g2b/* requests to appropriate data.go.kr / data.g2b.go.kr endpoints
 */

// API endpoint mappings
const API_ENDPOINTS = {
  // 종합쇼핑몰 품목정보 서비스 (data.go.kr/15129471)
  'shopping-items': 'https://apis.data.go.kr/1230000/MSSrvcProdInfoService',
  // 종합쇼핑몰 납품요구 물품 내역 (조달데이터허브)
  'delivery': 'https://apis.data.go.kr/1230000/MSSrvcDeliveryInfoService',
  // 나라장터 공공데이터개방표준서비스
  'standard': 'https://apis.data.go.kr/1230000/PubDataOpnStdService',
  // 종합쇼핑몰 품목 등록 내역 (조달데이터허브 대용량 보고서 API)
  'hub-items': 'https://api.odcloud.kr/api/3070383/v1/uddi:ce603a37-e11e-4ac0-8dee-d50e5c32e223',
  // 종합쇼핑몰 납품요구 물품 내역 (조달데이터허브 대용량 보고서 API)  
  'hub-delivery': 'https://api.odcloud.kr/api/3070383/v1/uddi:a8e53b67-7c89-4e0c-88f5-2eb1a7b2a924',
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Extract the sub-path after /api/g2b/
  const pathParts = url.pathname.replace('/api/g2b/', '').split('/');
  const apiGroup = pathParts[0]; // e.g., 'shopping-items', 'delivery'
  const operation = pathParts.slice(1).join('/'); // e.g., 'getProductInfoList'

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get API key from environment
  const serviceKey = env.G2B_API_KEY || env.DATA_GO_KR_API_KEY;
  
  if (!serviceKey) {
    return new Response(JSON.stringify({
      error: 'G2B API Key가 설정되지 않았습니다. wrangler.toml 또는 환경변수에 G2B_API_KEY를 설정하세요.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Resolve base URL
  const baseUrl = API_ENDPOINTS[apiGroup];
  if (!baseUrl) {
    return new Response(JSON.stringify({
      error: `Unknown API group: ${apiGroup}`,
      available: Object.keys(API_ENDPOINTS)
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Build the target URL
    const targetUrl = new URL(operation ? `${baseUrl}/${operation}` : baseUrl);
    
    // Forward all query parameters
    for (const [key, value] of url.searchParams) {
      if (key !== 'serviceKey' && key !== 'ServiceKey') {
        targetUrl.searchParams.set(key, value);
      }
    }
    
    // Add service key
    targetUrl.searchParams.set('serviceKey', serviceKey);
    
    // Default to JSON response if not specified
    if (!targetUrl.searchParams.has('type') && !targetUrl.searchParams.has('returnType')) {
      targetUrl.searchParams.set('type', 'json');
    }

    console.log(`[G2B Proxy] ${apiGroup}/${operation} -> ${targetUrl.toString().replace(serviceKey, '***')}`);

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    let body;

    if (contentType.includes('json')) {
      body = await response.text();
    } else if (contentType.includes('xml')) {
      // Return XML as-is with a flag
      body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml',
        }
      });
    } else {
      body = await response.text();
    }

    return new Response(body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5min cache
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'API 호출 중 오류가 발생했습니다.',
      detail: err.message
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
