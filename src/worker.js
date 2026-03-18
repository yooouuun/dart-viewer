const DART_API_BASE = "https://opendart.fss.or.kr/api";

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
      var r = await fetch(dartUrl.toString());
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
