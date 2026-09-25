const M2_PER_TSUBO = 3.305785;
const TO_TSUBO = 0.3025;
const PRESET = { S: 114, RC: 120, SRC: 135 };
const TYPE = { oneroom: { unitM2: 25, eff: 0.75 }, family: { unitM2: 65, eff: 0.82 } };
const PAGE_SCALES = [0.85, 0.92, 1, 1.08, 1.18, 1.28, 1.4];
const STEPS_PX = [10, 11, 12, 14, 16, 18, 21];
const FS_MID = 2;
let priceMem = { S: 114, RC: 120, SRC: 135 };
let typeMem = { oneroom: { unitM2: 25, eff: 0.75 }, family: { unitM2: 65, eff: 0.82 } };
const land = document.getElementById("land");
const kenpei = document.getElementById("kenpei");
const yoseki = document.getElementById("yoseki");
const floors = document.getElementById("floors");
const price = document.getElementById("price");
const unitM2 = document.getElementById("unitM2");
const eff = document.getElementById("eff");
const coeff = document.getElementById("coeff");
const extra = document.getElementById("extra");
const extraPct = document.getElementById("extraPct");
const unitsIn = document.getElementById("unitsIn");
const landLabel = document.getElementById("landLabel");
const landConv = document.getElementById("landConv");
const priceLabel = document.getElementById("priceLabel");
const archIn = document.getElementById("archIn");
const farIn = document.getElementById("farIn");
let dispUnit = "m2";
let unitsManual = false;
let syncing = false;
let pageFsIndex = FS_MID;
let stepsFsIndex = FS_MID;
let lastTotal = null;
let lastBody = null;
let extraMode = "pct";

function yen(n) {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  n = Math.abs(n);
  if (n <= 0) return sign + "0円";
  const oku = Math.floor(n / 100000000);
  const man = Math.floor((n % 100000000) / 10000);
  const yenPart = Math.round(n % 10000);
  const parts = [];
  if (oku) parts.push(oku.toLocaleString("ja-JP") + "億");
  if (man) parts.push(man.toLocaleString("ja-JP") + "万");
  if (yenPart && !oku) parts.push(yenPart.toLocaleString("ja-JP"));
  return sign + (parts.join(" ") || "0") + "円";
}
function fmt(n, d) {
  if (!isFinite(n)) return "—";
  const p = Math.pow(10, d);
  const v = Math.round(n * p) / p;
  return v.toLocaleString("ja-JP", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function area(m2) {
  if (!isFinite(m2) || m2 <= 0) return "—";
  const tsubo = m2 * TO_TSUBO;
  if (dispUnit === "tsubo") return fmt(tsubo, 1) + "坪（" + fmt(m2, 1) + "㎡）";
  return fmt(m2, 1) + "㎡（" + fmt(tsubo, 1) + "坪）";
}
function pairArea(m2) {
  if (!isFinite(m2) || m2 <= 0) return "—";
  if (dispUnit === "tsubo") return fmt(m2, 1) + "㎡";
  return fmt(m2 * TO_TSUBO, 1) + "坪";
}
function num(n, d) { return fmt(n, d).replace(/,/g, ""); }
function trimNum(n, d) {
  const r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
  if (Math.abs(r - Math.round(r)) < Math.pow(10, -d) / 2) return String(Math.round(r));
  return String(parseFloat(r.toFixed(d)));
}
function commaM2(n) {
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("ja-JP");
  return (Math.round(n * 10) / 10).toLocaleString("ja-JP");
}
function fmtPct(p) {
  if (!isFinite(p)) return "0";
  const a = Math.abs(p);
  if (a === 0) return "0";
  if (a >= 10) return trimNum(p, 1);
  if (a >= 1) return trimNum(p, 2);
  if (a >= 0.01) return trimNum(p, 3);
  if (a >= 0.001) return trimNum(p, 4);
  return trimNum(p, 6);
}
function signedPct(p) {
  if (!isFinite(p) || p === 0) return "0%";
  return (p > 0 ? "+" : "") + fmtPct(p) + "%";
}
function bindSeg(id, attr, onPick) {
  const root = document.getElementById(id);
  if (!root) return;
  root.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    root.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    onPick(btn.getAttribute(attr));
    calc();
  });
}
function setDispUnit(v, fromInput) {
  const m2Now = landM2();
  const tsuboNow = priceTsubo();
  dispUnit = v;
  document.querySelectorAll("[data-unit-seg] button").forEach(function (b) {
    b.classList.toggle("on", b.getAttribute("data-disp") === v);
  });
  const landUnitEl = document.getElementById("landUnit");
  const u = dispUnit === "m2" ? "㎡" : "坪";
  landUnitEl.textContent = u;
  const archUnit = document.getElementById("archUnit");
  const farUnit = document.getElementById("farUnit");
  if (archUnit) archUnit.textContent = u;
  if (farUnit) farUnit.textContent = u;
  if (dispUnit === "m2") {
    priceLabel.textContent = "延べ㎡単価";
    document.getElementById("priceUnit").textContent = "万円/㎡";
    if (fromInput !== "keepLand" && m2Now) land.value = String(Math.round(m2Now * 10) / 10);
    if (fromInput !== "keepLand" && tsuboNow) price.value = String(Math.round((tsuboNow / M2_PER_TSUBO) * 100) / 100);
  } else {
    priceLabel.textContent = "延べ坪単価";
    document.getElementById("priceUnit").textContent = "万円/坪";
    if (fromInput !== "keepLand" && m2Now) land.value = String(Math.round((m2Now * TO_TSUBO) * 10) / 10);
    if (fromInput !== "keepLand" && tsuboNow) price.value = String(Math.round(tsuboNow * 10) / 10);
  }
}
document.querySelectorAll("[data-unit-seg]").forEach(function (root) {
  root.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    setDispUnit(btn.getAttribute("data-disp"));
    calc();
  });
});
bindSeg("typeSeg", "data-type", function (v) { unitsManual = false; const t = typeMem[v] || TYPE[v]; setEff(t.eff); unitM2.value = t.unitM2; });
bindSeg("structSeg", "data-struct", function (v) {
  const tsubo = priceMem[v] || PRESET[v];
  price.value = dispUnit === "m2" ? String(Math.round((tsubo / M2_PER_TSUBO) * 100) / 100) : String(tsubo);
});
function rememberPrice() { const t = priceTsubo(); if (t > 0) priceMem[currentStruct()] = t; }
function rememberType() { const e = parseFloat(eff.value); const u = parseFloat(unitM2.value); if (isFinite(e) && e > 0 && isFinite(u) && u > 0) typeMem[currentType()] = { unitM2: u, eff: e }; }
function landM2() {
  const n = parseFloat(land.value);
  if (!isFinite(n) || n <= 0) return 0;
  return dispUnit === "tsubo" ? n * M2_PER_TSUBO : n;
}
function priceTsubo() {
  const n = parseFloat(price.value);
  if (!isFinite(n) || n <= 0) return 0;
  return dispUnit === "m2" ? n * M2_PER_TSUBO : n;
}
function priceM2() { return priceTsubo() / M2_PER_TSUBO; }
function setEff(e) {
  syncing = true;
  const v = Math.max(0.01, Math.min(e, 1));
  eff.value = num(v, 2);
  coeff.value = num(1 / v, 2);
  syncing = false;
}
function setCoeff(c) {
  syncing = true;
  const v = Math.max(1, c);
  coeff.value = num(v, 2);
  eff.value = num(1 / v, 2);
  syncing = false;
}
function extraRate() {
  const p = parseCommaNum(extraPct.value);
  if (!isFinite(p)) return 0.25;
  return p / 100;
}
function markFs(rootId, index) {
  const mark = index < FS_MID ? "down" : (index > FS_MID ? "up" : "mid");
  const root = document.getElementById(rootId);
  if (!root) return;
  root.querySelectorAll("button").forEach(function (b) {
    const kind = b.getAttribute("data-page-fs") || b.getAttribute("data-steps-fs");
    b.classList.toggle("on", kind === mark || (kind === "mid" && index === FS_MID));
  });
}
function applyPageFs() {
  document.documentElement.style.setProperty("--page-scale", String(PAGE_SCALES[pageFsIndex]));
  markFs("pageFsBtns", pageFsIndex);
}
function applyStepsFs() {
  document.documentElement.style.setProperty("--steps-fs", STEPS_PX[stepsFsIndex] + "px");
  markFs("stepsFsBtns", stepsFsIndex);
}
function bumpIndex(index, kind, max) {
  if (kind === "down") return Math.max(0, index - 1);
  if (kind === "up") return Math.min(max, index + 1);
  return FS_MID;
}
document.getElementById("pageFsBtns").addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  pageFsIndex = bumpIndex(pageFsIndex, btn.getAttribute("data-page-fs"), PAGE_SCALES.length - 1);
  applyPageFs();
  saveState();
});
document.getElementById("stepsFsBtns").addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  stepsFsIndex = bumpIndex(stepsFsIndex, btn.getAttribute("data-steps-fs"), STEPS_PX.length - 1);
  applyStepsFs();
  saveState();
});
function setLandM2(m2) {
  if (!(m2 > 0)) return;
  if (dispUnit === "tsubo") land.value = String(Math.round(m2 * TO_TSUBO * 10) / 10);
  else land.value = String(Math.round(m2 * 10) / 10);
}
function parseDispArea(el) {
  const n = parseFloat(el.value);
  if (!isFinite(n) || n <= 0) return 0;
  return dispUnit === "tsubo" ? n * M2_PER_TSUBO : n;
}
function fillDispArea(el, m2) {
  if (!el || document.activeElement === el) return;
  if (!(m2 > 0)) { el.value = ""; return; }
  const v = dispUnit === "tsubo" ? m2 * TO_TSUBO : m2;
  el.value = String(Math.round(v * 10) / 10);
}
function parseCommaNum(s) {
  const n = parseFloat(String(s || "").replace(/,/g, ""));
  return n;
}
function fmtComma(n) {
  if (!isFinite(n)) return "";
  const r = Math.round(n * 10) / 10;
  if (Math.abs(r - Math.round(r)) < 0.05) return Math.round(r).toLocaleString("ja-JP");
  return r.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}
