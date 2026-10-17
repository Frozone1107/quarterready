// QuarterReady unlock server — a free Cloudflare Worker.
//
// What it does
//  1. POST /webhook          Lemon Squeezy calls this after each purchase. The request is signed
//                            (X-Signature, HMAC-SHA256 hex of the raw body with your signing secret).
//                            We keep the new licence key for a short time, filed under the random
//                            "claim" code the app passed to the checkout (checkout[custom][claim]).
//  2. GET  /claim/<code>     The app asks for its key with that code. The key is handed over once
//                            and then deleted. Codes are random 128-bit values, so they can't be guessed.
//  3. POST /v1/licenses/...  Optional pass-through for licence checks, in case a browser blocks
//                            direct calls to api.lemonsqueezy.com.
//
// Setup (Cloudflare dashboard → Workers & Pages)
//  - Create a KV namespace called QR_CLAIMS and bind it to this worker as CLAIMS.
//  - Add a secret LS_WEBHOOK_SECRET (the same text you type as "Signing secret" in Lemon Squeezy).
//  - Add a variable ALLOWED_ORIGIN = https://frozone1107.github.io
// No API key is needed and nothing secret ever reaches the website.

const KEEP_SECONDS = 2 * 24 * 3600; // a claim waits at most 2 days

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Vary": "Origin",
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);

    // 1. Webhook from Lemon Squeezy
    if (request.method === "POST" && url.pathname === "/webhook") {
      const raw = await request.text();
      if (!env.LS_WEBHOOK_SECRET || !(await validSignature(raw, request.headers.get("X-Signature") || "", env.LS_WEBHOOK_SECRET))) {
        return new Response("Invalid signature", { status: 401 });
      }
      let body; try { body = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
      const event = body?.meta?.event_name;
      const claim = cleanClaim(body?.meta?.custom_data?.claim);
      const a = body?.data?.attributes || {};
      if (event === "order_created" && claim) {
        // Remember which claim this order belongs to, in case the licence event arrives without custom data.
        await env.CLAIMS.put("order:" + body.data.id, claim, { expirationTtl: KEEP_SECONDS });
      }
      if (event === "license_key_created" && a.key) {
        const code = claim || (a.order_id ? await env.CLAIMS.get("order:" + a.order_id) : null);
        if (code) await env.CLAIMS.put("claim:" + code, JSON.stringify({ key: a.key, email: a.user_email || "" }), { expirationTtl: KEEP_SECONDS });
      }
      return new Response("ok");
    }

    // 2. The app collects its key
    const m = url.pathname.match(/^\/claim\/([A-Za-z0-9-]{20,64})$/);
    if (request.method === "GET" && m) {
      const code = cleanClaim(m[1]);
      const v = code && await env.CLAIMS.get("claim:" + code);
      if (!v) return json({ ready: false });
      await env.CLAIMS.delete("claim:" + code);
      return json({ ready: true, ...JSON.parse(v) });
    }

    // 3. Optional licence pass-through
    if (request.method === "POST" && ["/v1/licenses/activate", "/v1/licenses/validate", "/v1/licenses/deactivate"].includes(url.pathname)) {
      const up = await fetch("https://api.lemonsqueezy.com" + url.pathname, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: await request.text(),
      });
      return new Response(await up.text(), { status: up.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response("Not found", { status: 404, headers: cors });
  },
};

function cleanClaim(c) { return typeof c === "string" && /^[A-Za-z0-9-]{20,64}$/.test(c) ? c : null; }

async function validSignature(raw, sigHex, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== sigHex.length) return false;
  let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sigHex.charCodeAt(i);
  return diff === 0;
}
