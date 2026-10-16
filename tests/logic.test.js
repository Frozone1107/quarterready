// Run: node tests/logic.test.js  (from the project folder). Exits non-zero on any failure.
// Loads rules.js, then the pure logic of app.html and index.html, and checks results against HMRC rules.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.join(__dirname, "..");
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "rules.js"), "utf8"), ctx);
const R = ctx.window.QR_RULES;

const app = fs.readFileSync(path.join(root, "app.html"), "utf8");
const logic = app.slice(app.indexOf("/* ===== LOGIC START"), app.indexOf("/* ===== LOGIC END"));
vm.runInContext(logic + "\nthis.__ = { deadlines, mileageRates, mileageClaims, quarterOf, parseAmount, summarise, parseCSV, icsCalendar, RULES };", ctx);
const A = ctx.__;
let n = 0; const t = (name, fn) => { fn(); n++; };
const ymd = dt => dt.toISOString().slice(0, 10);

// --- rules file sanity
t("rules shape", () => {
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(R.checked));
  assert.ok(R.thresholds.length >= 3 && R.thresholds.every(r => r.limit > 0 && r.start > r.year));
  assert.strictEqual(R.deadlines.quarters.length, 4);
  assert.ok(R.mileage.some(m => m.from === 0), "mileage needs a fallback entry with from: 0");
  assert.ok(R.news.every(x => x.title && x.body && /^https:\/\//.test(x.url)));
  assert.strictEqual(A.RULES, R, "app must use rules.js");
});
// --- deadlines for 2027-28
t("deadlines", () => {
  assert.strictEqual(JSON.stringify([...A.deadlines(2027)].map(ymd)), JSON.stringify(["2027-08-07", "2027-11-07", "2028-02-07", "2028-05-07", "2029-01-31"]));
});
// --- quarters
t("quarters", () => {
  assert.strictEqual(A.quarterOf("2027-04-06", 2027, "standard"), "Q1");
  assert.strictEqual(A.quarterOf("2027-07-06", 2027, "standard"), "Q2");
  assert.strictEqual(A.quarterOf("2028-04-05", 2027, "standard"), "Q4");
  assert.strictEqual(A.quarterOf("2028-04-06", 2027, "standard"), null);
  assert.strictEqual(A.quarterOf("2027-06-30", 2027, "calendar"), "Q1");
});
// --- mileage: current rates and the 10,000-mile band per vehicle
t("mileage", () => {
  const cur = R.mileage.find(m => m.from <= 2026);
  const r = A.mileageRates(2026);
  assert.strictEqual(r.car1, cur.car1); assert.strictEqual(r.car2, cur.car2);
  const trips = [{ id: "a", date: "2026-05-01", miles: cur.band - 10, vehicle: "car", vname: "Golf" }, { id: "b", date: "2026-06-01", miles: 20, vehicle: "car", vname: "Golf" }];
  const c = A.mileageClaims(trips, 2026);
  assert.strictEqual(c.b, 10 * cur.car1 + 10 * cur.car2);
  assert.strictEqual(A.mileageRates(2025).car1, R.mileage.find(m => m.from <= 2025).car1);
});
t("amounts", () => { assert.strictEqual(A.parseAmount("£1,234.50"), 123450); assert.strictEqual(A.parseAmount("1.234"), null); });
t("csv", () => { const rows = A.parseCSV('Date,Desc,Amount\n01/05/2026,"Smith, J",12.00\n'); assert.strictEqual(rows[1][1], "Smith, J"); });
t("ics", () => { const ics = A.icsCalendar(2027, "Test"); assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 5); });

// --- home page checker
const idx = fs.readFileSync(path.join(root, "index.html"), "utf8");
const m = idx.match(/<script>\s*\(\(\) => \{[\s\S]*?window\.__qrDecide = decide;/);
assert.ok(m, "checker script not found");
const decideSrc = m[0].replace(/^<script>\s*\(\(\) => \{/, "").replace(/window\.__qrDecide = decide;$/, "");
const dctx = { window: { QR_RULES: R }, document: { getElementById: () => null }, console };
vm.createContext(dctx);
vm.runInContext(decideSrc.split("function read()")[0] + "\nthis.decide = decide;", dctx);
t("checker", () => {
  for (const r of R.thresholds) {
    const over = { registered: true }; over[r.year] = { se: r.limit + 1, pr: 0 };
    assert.strictEqual(dctx.decide(over).big, "From 6 April " + r.start);
    const at = { registered: true }; at[r.year] = { se: r.limit, pr: 0 };
    assert.notStrictEqual(dctx.decide(at).big, "From 6 April " + r.start, "exactly the limit is not over it");
  }
});
console.log("All " + n + " logic checks passed (rules checked " + R.checked + ").");
