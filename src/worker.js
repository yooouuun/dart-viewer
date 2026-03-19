var DART_API_BASE = "https://opendart.fss.or.kr/api";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function jsonResp(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({}, corsHeaders(), { "Content-Type": "application/json" })
  });
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    var apiPath = url.pathname.replace("/api/", "");
    if (!apiPath) {
      return jsonResp({ error: "No API path" }, 400);
    }

    // ===== G2B (조달청) API 라우팅 =====
    if (apiPath.startsWith("g2b/")) {
      return handleG2B(apiPath.replace("g2b/", ""), url, env);
    }

    var apiKey = env.DART_API_KEY || "";
    var dartUrl = new URL(DART_API_BASE + "/" + apiPath);

    url.searchParams.forEach(function(v, k) {
      dartUrl.searchParams.set(k, v);
    });
    dartUrl.searchParams.set("crtfc_key", apiKey);

    try {
      var r = await fetch(dartUrl.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json, text/xml, */*",
          "Accept-Language": "ko-KR,ko;q=0.9"
        }
      });

      if (r.status >= 300 && r.status < 400) {
        var location = r.headers.get("location") || "";
        return jsonResp({
          error: "DART API rejected the request",
          status: r.status,
          redirect: location
        }, 502);
      }

      var ct = r.headers.get("content-type") || "";

      if (ct.indexOf("zip") !== -1 || ct.indexOf("octet") !== -1) {
        var buf = await r.arrayBuffer();
        return new Response(buf, {
          status: r.status,
          headers: Object.assign({}, corsHeaders(), { "Content-Type": "application/zip" })
        });
      }

      var text = await r.text();
      return new Response(text, {
        status: r.status,
        headers: Object.assign({}, corsHeaders(), { "Content-Type": ct || "application/json; charset=utf-8" })
      });
    } catch (e) {
      return jsonResp({ error: e.message }, 500);
    }
  }
};

// ===== G2B (조달청 종합쇼핑몰) API 프록시 =====
var G2B_ENDPOINTS = {
  "shopping-items": "https://apis.data.go.kr/1230000/MSSrvcProdInfoService",
  "delivery": "https://apis.data.go.kr/1230000/MSSrvcDeliveryInfoService",
  "standard": "https://apis.data.go.kr/1230000/PubDataOpnStdService"
};

async function handleG2B(subPath, url, env) {
  var parts = subPath.split("/");
  var group = parts[0];
  var operation = parts.slice(1).join("/");

  var serviceKey = env.G2B_API_KEY || env.DATA_GO_KR_API_KEY || "";
  if (!serviceKey) {
    return jsonResp({ error: "G2B_API_KEY 환경변수를 설정하세요" }, 500);
  }

  var baseUrl = G2B_ENDPOINTS[group];
  if (!baseUrl) {
    return jsonResp({ error: "Unknown G2B API group: " + group, available: Object.keys(G2B_ENDPOINTS) }, 400);
  }

  try {
    var target = new URL(operation ? baseUrl + "/" + operation : baseUrl);

    url.searchParams.forEach(function(v, k) {
      if (k !== "serviceKey" && k !== "ServiceKey") {
        target.searchParams.set(k, v);
      }
    });
    target.searchParams.set("serviceKey", serviceKey);

    if (!target.searchParams.has("type")) {
      target.searchParams.set("type", "json");
    }

    var resp = await fetch(target.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json, application/xml, text/xml, */*"
      }
    });

    var body = await resp.text();
    var ct = resp.headers.get("content-type") || "application/json";

    return new Response(body, {
      status: resp.status,
      headers: Object.assign({}, corsHeaders(), {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=300"
      })
    });
  } catch (e) {
    return jsonResp({ error: "G2B API 호출 실패: " + e.message }, 502);
  }
}
