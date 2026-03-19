// functions/api/g2b/[[path]].js
// G2B (조달청) API Proxy — Cloudflare Pages Function
// /api/g2b/{group}/{operation} → data.go.kr API

const ENDPOINTS = {
  'shopping-items': 'https://apis.data.go.kr/1230000/MSSrvcProdInfoService',
  'delivery': 'https://apis.data.go.kr/1230000/MSSrvcDeliveryInfoService',
  'standard': 'https://apis.data.go.kr/1230000/PubDataOpnStdService',
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const subPath = url.pathname.replace('/api/g2b/', '').split('/');
  const group = subPath[0];
  const operation = subPath.slice(1).join('/');
  const serviceKey = env.G2B_API_KEY || env.DATA_GO_KR_API_KEY;

  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'G2B_API_KEY 환경변수를 설정하세요' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  const baseUrl = ENDPOINTS[group];
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: 'Unknown API group: ' + group }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  try {
    const target = new URL(operation ? baseUrl + '/' + operation : baseUrl);
    for (const [k, v] of url.searchParams) {
      if (k !== 'serviceKey') target.searchParams.set(k, v);
    }
    target.searchParams.set('serviceKey', serviceKey);
    if (!target.searchParams.has('type')) target.searchParams.set('type', 'json');

    const resp = await fetch(target.toString());
    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: { ...cors, 'Content-Type': resp.headers.get('content-type') || 'application/json', 'Cache-Control': 'public, max-age=300' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
