// Run: node tests/worker.test.mjs — checks the unlock server with a fake KV store.
import worker from "../licence-proxy/worker.js";
import { createHmac } from "node:crypto";
import assert from "node:assert";
const store = new Map();
const env = { LS_WEBHOOK_SECRET: "s3cret-test", ALLOWED_ORIGIN: "https://frozone1107.github.io",
  CLAIMS: { get: async k => store.get(k) ?? null, put: async (k, v) => void store.set(k, v), delete: async k => void store.delete(k) } };
const claim = "0f8fad5b-d9cb-469f-a165-70867728950e";
const send = (body, secret = env.LS_WEBHOOK_SECRET) => { const raw = JSON.stringify(body); return worker.fetch(new Request("https://w.example/webhook", { method: "POST", body: raw, headers: { "X-Signature": createHmac("sha256", secret).update(raw).digest("hex") } }), env); };
const get = c => worker.fetch(new Request("https://w.example/claim/" + c), env).then(r => r.json());
// bad signature rejected
assert.equal((await send({ meta: { event_name: "license_key_created", custom_data: { claim } }, data: { attributes: { key: "K-1" } } }, "wrong")).status, 401);
assert.deepEqual(await get(claim), { ready: false });
// order then licence without custom data: linked through the order id
await send({ meta: { event_name: "order_created", custom_data: { claim } }, data: { id: "77", attributes: {} } });
await send({ meta: { event_name: "license_key_created" }, data: { id: "9", attributes: { key: "AAAA-BBBB", order_id: 77, user_email: "a@b.c" } } });
const r = await get(claim); assert.equal(r.ready, true); assert.equal(r.key, "AAAA-BBBB");
// handed over once only
assert.deepEqual(await get(claim), { ready: false });
// licence event with custom data directly
const c2 = "1c9e6679-7425-40de-944b-e07fc1f90ae7";
await send({ meta: { event_name: "license_key_created", custom_data: { claim: c2 } }, data: { attributes: { key: "CCCC" } } });
assert.equal((await get(c2)).key, "CCCC");
// invalid claim code shapes ignored
assert.equal((await worker.fetch(new Request("https://w.example/claim/abc"), env)).status, 404);
// CORS header present
const res = await worker.fetch(new Request("https://w.example/claim/" + c2), env);
assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://frozone1107.github.io");
console.log("Unlock server: all checks passed.");
