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
      return new Response(null, { status: 404 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    var apiPath = url.pathname.replace("/api/", "");
    if (!apiPath) {
      return jsonResp({ error: "No API path" }, 400);
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
        if (location.indexOf("error") !== -1) {
          return jsonResp({
            error: "DART API rejected the request. The API key may be invalid or expired.",
            status: r.status,
            redirect: location
          }, 502);
        }
        var r2 = await fetch(location, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/xml, */*"
          }
        });
        var t2 = await r2.text();
        return new Response(t2, {
          status: r2.status,
          headers: Object.assign({}, corsHeaders(), { "Content-Type": r2.headers.get("content-type") || "application/json" })
        });
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
