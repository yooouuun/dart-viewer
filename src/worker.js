const DART_API_BASE = 'https://opendart.fss.or.kr/api';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 404 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const apiPath = url.pathname.replace('/api/', '');
    if (!apiPath) {
      return resp({ error: 'No API path' }, 400);
    }

    const apiKey = env.DART_API_KEY || '';
    const dartUrl = new URL(DART_API_BASE + '/' + apiPath);

    for (const [k, v] of url.searchParams.entries()) {
      dartUrl.searchParams.set(k, v);
    }
    dartUrl.searchParams.set('crtfc_key', apiKey);

    try {
      const r = await fetch(dartUrl.toString());
      const ct = r.headers.get('content-type') || '';

      if (ct.includes('zip') || ct.includes('octet')) {
        return new Response(await r.arrayBuffer(), {
          status: r.status,
          headers: { ...corsHeaders(), 'Content-Type': 'application/zip' },
        });
      }

      return new Response(await r.text(), {
        status: r.status,
        headers: { ...corsHeaders(), 'Content-Type': ct || 'application/json; charset=utf-8' },
      });
    } catch (e) {
      return resp({ error: e.message }, 500);
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

function resp(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
```

**Commit changes** 클릭 후 Cloudflare 자동 배포를 기다렸다가, 다시 아래 주소를 테스트해주세요:
```
https://dart-viewer.yooouuun.workers.dev/api/fnlttSinglAcnt.json?corp_code=00126380&bsns_year=2024&reprt_code=11011
