const M2_PER_TSUBO = 3.305785;
const TO_TSUBO = 0.3025;
const PRESET = { S: 114, RC: 120, SRC: 135 };
const TYPE = { oneroom: { unitM2: 25, eff: 0.75 }, family: { unitM2: 65, eff: 0.82 } };
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
const coeffOut = document.getElementById("coeffOut");
const extra = document.getElementById("extra");
const unitsIn = document.getElementById("unitsIn");
const landLabel = document.getElementById("landLabel");
const landConv = document.getElementById("landConv");
const priceLabel = document.getElementById("priceLabel");
const priceConv = document.getElementById("priceConv");
let landUnit = "m2";
let priceUnit = "tsubo";
let unitSizeUnit = "m2";
let unitsManual = false;
let syncing = false;
function yen(n) {
  if (!isFinite(n) || n <= 0) return "—";
  const oku = Math.floor(n / 100000000);
  const man = Math.floor((n % 100000000) / 10000);
  const yenPart = Math.round(n % 10000);
  const parts = [];
  if (oku) parts.push(oku.toLocaleString("ja-JP") + "億");
  if (man) parts.push(man.toLocaleString("ja-JP") + "万");
  if (yenPart && !oku) parts.push(yenPart.toLocaleString("ja-JP"));
  return (parts.join(" ") || "0") + "円";
}
function area(m2) {
  if (!isFinite(m2) || m2 <= 0) return "—";
  return m2.toFixed(1) + "㎡（" + (m2 * TO_TSUBO).toFixed(1) + "坪）";
}
function num(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
function trimNum(n, d) {
  const r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
  if (Math.abs(r - Math.round(r)) < Math.pow(10, -d) / 2) return String(Math.round(r));
  return String(parseFloat(r.toFixed(d)));
}
function commaM2(n) {
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("ja-JP");
  return (Math.round(n * 10) / 10).toLocaleString("ja-JP");
}
function bindSeg(id, attr, onPick) {
  const root = document.getElementById(id);
  root.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    root.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    onPick(btn.getAttribute(attr));
    calc();
  });
}
bindSeg("unitSeg", "data-unit", function (v) {
  const m2Now = landM2(); landUnit = v;
  const landUnitEl = document.getElementById("landUnit");
  if (landUnit === "m2") { landLabel.textContent = "敷地面積"; landUnitEl.textContent = "㎡"; land.value = m2Now ? String(Math.round(m2Now * 10) / 10) : ""; }
  else { landLabel.textContent = "敷地面積"; landUnitEl.textContent = "坪"; land.value = m2Now ? String(Math.round((m2Now * TO_TSUBO) * 10) / 10) : ""; }
});
bindSeg("priceSeg", "data-price", function (v) {
  const tsuboNow = priceTsubo();
  const sizeM2 = unitSizeM2();
  priceUnit = v;
  unitSizeUnit = v;
  const priceUnitEl = document.getElementById("priceUnit");
  if (priceUnit === "tsubo") { priceLabel.textContent = "延べの坪単価"; priceUnitEl.textContent = "万円/坪"; price.value = tsuboNow ? String(Math.round(tsuboNow * 10) / 10) : ""; }
  else { priceLabel.textContent = "延べの㎡単価"; priceUnitEl.textContent = "万円/㎡"; price.value = tsuboNow ? String(Math.round((tsuboNow / M2_PER_TSUBO) * 100) / 100) : ""; }
  setUnitSizeDisplay(sizeM2);
});
bindSeg("typeSeg", "data-type", function (v) { unitsManual = false; const t = typeMem[v] || TYPE[v]; setEff(t.eff); setUnitSizeDisplay(t.unitM2); });
bindSeg("structSeg", "data-struct", function (v) { const tsubo = priceMem[v] || PRESET[v]; price.value = priceUnit === "tsubo" ? String(tsubo) : String(Math.round((tsubo / M2_PER_TSUBO) * 100) / 100); });
function rememberPrice() { const t = priceTsubo(); if (t > 0) priceMem[currentStruct()] = t; }
function rememberType() { const e = parseFloat(eff.value); const u = unitSizeM2(); if (isFinite(e) && e > 0 && u > 0) typeMem[currentType()] = { unitM2: u, eff: e }; }
function landM2() { const n = parseFloat(land.value); if (!isFinite(n) || n <= 0) return 0; return landUnit === "tsubo" ? n * M2_PER_TSUBO : n; }
function priceTsubo() { const n = parseFloat(price.value); if (!isFinite(n) || n <= 0) return 0; return priceUnit === "m2" ? n * M2_PER_TSUBO : n; }
function priceM2() { return priceTsubo() / M2_PER_TSUBO; }
function unitSizeM2() { const n = parseFloat(unitM2.value); if (!isFinite(n) || n <= 0) return 0; return unitSizeUnit === "tsubo" ? n * M2_PER_TSUBO : n; }
function applyUnitSizeLabel() { const el = document.getElementById("unitSizeUnit"); if (el) el.textContent = unitSizeUnit === "tsubo" ? "坪" : "㎡"; }
function setUnitSizeDisplay(m2) {
  applyUnitSizeLabel();
  if (!m2) { unitM2.value = ""; return; }
  if (unitSizeUnit === "tsubo") unitM2.value = String(Math.round((m2 * TO_TSUBO) * 100) / 100);
  else unitM2.value = String(Math.round(m2 * 10) / 10);
}
function setEff(e) { syncing = true; var v = Math.max(0.01, Math.min(e, 1)); if (document.activeElement !== eff) eff.value = String(v); if (document.activeElement !== coeff) coeff.value = String(1 / v); if (coeffOut && document.activeElement !== coeffOut) coeffOut.value = String(1 / v); syncing = false; }
function setCoeff(c) { syncing = true; var v = Math.max(1, c); if (document.activeElement !== coeff) coeff.value = String(v); if (coeffOut && document.activeElement !== coeffOut) coeffOut.value = String(v); if (document.activeElement !== eff) eff.value = String(1 / v); syncing = false; }
function calc() {
  const m2 = landM2();
  const kPct = parseFloat(kenpei.value) || 0;
  const yPct = parseFloat(yoseki.value) || 0;
  const f = parseFloat(floors.value) || 0;
  const uSize = unitSizeM2();
  let e = parseFloat(eff.value);
  if (!isFinite(e) || e <= 0) e = 0.75;
  e = Math.max(0.01, Math.min(e, 1));
  const c = 1 / e;
  const k = kPct / 100;
  const y = yPct / 100;
  const pTsubo = priceTsubo();
  const pM2 = priceM2();
  if (m2) {
    if (landUnit === "m2") landConv.textContent = num(m2 * TO_TSUBO, 1) + "坪 × 3.305785 ＝ " + num(m2, 1) + "㎡";
    else landConv.textContent = num(m2, 1) + "㎡ × 0.3025 ＝ " + num(m2 * TO_TSUBO, 1) + "坪";
  } else landConv.textContent = "";
  if (pTsubo) {
    if (priceUnit === "tsubo") priceConv.textContent = num(pM2, 2) + "万円/㎡ × 3.305785 ＝ " + num(pTsubo, 1) + "万円/坪";
    else priceConv.textContent = num(pTsubo, 1) + "万円/坪 ÷ 3.305785 ＝ " + num(pM2, 2) + "万円/㎡";
  } else priceConv.textContent = "";
  const arch = m2 * k;
  const far = m2 * y;
  const byFloor = arch * f;
  const capGfa = Math.min(far, byFloor);
  const useFar = far <= byFloor;
  const needFloors = arch > 0 ? far / arch : 0;
  const capExclusive = capGfa * e;
  const capUnits = uSize > 0 ? Math.floor(capExclusive / uSize) : 0;
  let units = capUnits;
  if (unitsManual) { const typed = parseFloat(unitsIn.value); if (isFinite(typed) && typed > 0) units = Math.floor(typed); }
  else if (document.activeElement !== unitsIn) { unitsIn.value = capUnits ? String(capUnits) : ""; }
  const usedExclusive = units * uSize;
  const usedGfa = usedExclusive * c;
  const overGfa = usedGfa - capGfa;
  const unitsNote = document.getElementById("unitsNote");
  if (overGfa > 0.001) {
    unitsNote.classList.remove("hidden");
    unitsNote.textContent = "想定延べ " + commaM2(usedGfa) + "㎡。上限 " + commaM2(capGfa) + "㎡。差 +" + commaM2(overGfa) + "㎡。";
  } else { unitsNote.classList.add("hidden"); unitsNote.textContent = ""; }
  const common = usedGfa - usedExclusive;
  const body = (usedGfa * TO_TSUBO) * pTsubo * 10000;
  const bodyCap = (capGfa * TO_TSUBO) * pTsubo * 10000;
  const per = units > 0 ? body / units : 0;
  const liveFloors = needFloors > 0 ? Math.min(f || needFloors, needFloors) : (f || 0);
  const perFloor = liveFloors > 0 ? units / liveFloors : 0;
  var capTxt = useFar ? "容積で頭打ち" : "建蔽×階数で頭打ち";
  document.getElementById("capLabel").textContent = capTxt;
  document.getElementById("gfaText").textContent = area(usedGfa);
  ["capLabelLand", "capLabelLand2"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = capTxt;
  });
  ["gfaTextLand", "gfaTextLand2"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = area(usedGfa);
  });
  document.getElementById("archText").textContent = area(arch);
  document.getElementById("farText").textContent = area(far);
  document.getElementById("needFloorText").textContent = needFloors > 0 ? trimNum(needFloors, 2) + "階" : "—";
  document.getElementById("perFloorText").textContent = perFloor > 0 ? trimNum(perFloor, 1) + "戸" : "—";
  const note = document.getElementById("floorNote");
  if (needFloors > 0 && f > 0 && Math.abs(f - needFloors) > 0.01) {
    note.classList.remove("hidden");
    note.textContent = "容積上限 " + commaM2(far) + "㎡（" + trimNum(needFloors, 2) + "階相当）。";
  } else { note.classList.add("hidden"); note.textContent = ""; }
  const bodyTitle = document.getElementById("bodyTitle");
  const bodyBaseLine = document.getElementById("bodyBaseLine");
  const extraList = document.getElementById("extraList");
  const withExtra = extra.checked;
  if (withExtra) {
    bodyTitle.textContent = "本体＋付帯諸費用（+25%）";
    document.getElementById("bodyText").textContent = yen(body * 1.25);
    if (priceUnit === "tsubo") {
      document.getElementById("formulaLabel").textContent = "延べ坪 × 坪単価";
      document.getElementById("formulaText").textContent = usedGfa > 0 ? "(" + num(usedGfa * TO_TSUBO, 1) + " 延べ坪 × " + num(pTsubo, 1) + " 坪単価) × 1.25" : "—";
    } else {
      document.getElementById("formulaLabel").textContent = "延べ平米 × 平米単価";
      document.getElementById("formulaText").textContent = usedGfa > 0 ? "(" + num(usedGfa, 1) + " 延べ平米 × " + num(pM2, 2) + " 平米単価) × 1.25" : "—";
    }
    bodyBaseLine.classList.remove("hidden"); bodyBaseLine.textContent = body > 0 ? "本体 " + yen(body) : ""; extraList.classList.remove("hidden");
  } else {
    bodyTitle.textContent = "本体工事費（延べ × 単価）";
    document.getElementById("bodyText").textContent = yen(body);
    if (priceUnit === "tsubo") {
      document.getElementById("formulaLabel").textContent = "延べ坪 × 坪単価";
      document.getElementById("formulaText").textContent = usedGfa > 0 ? num(usedGfa * TO_TSUBO, 1) + "坪 × " + num(pTsubo, 1) + "万円" : "—";
    } else {
      document.getElementById("formulaLabel").textContent = "延べ㎡ × ㎡単価";
      document.getElementById("formulaText").textContent = usedGfa > 0 ? num(usedGfa, 1) + "㎡ × " + num(pM2, 2) + "万円" : "—";
    }
    bodyBaseLine.classList.add("hidden"); bodyBaseLine.textContent = ""; extraList.classList.add("hidden");
  }
  if (overGfa > 0.001 && bodyCap > 0) {
    bodyBaseLine.classList.remove("hidden");
    const capYen = withExtra ? yen(bodyCap * 1.25) : yen(bodyCap);
    bodyBaseLine.textContent = (withExtra && body > 0 ? "本体 " + yen(body) + "　" : "") + "上限延べなら " + capYen;
  }
  document.getElementById("unitsCapText").textContent = capUnits ? capUnits + "戸（上限）" : "—";
  document.getElementById("perUnitText").textContent = yen(per);
  document.getElementById("exText").textContent = area(usedExclusive);
  document.getElementById("gfaFormula").textContent = usedExclusive > 0 ? "専有 " + num(usedExclusive, 1) + "㎡ ×" : "専有 —㎡ ×";
  document.getElementById("commonText").textContent = area(common);
  const costLine = priceUnit === "tsubo" ? num(usedGfa * TO_TSUBO, 1) + "坪 × " + num(pTsubo, 1) + "万＝本体" : num(usedGfa, 1) + "㎡ × " + num(pM2, 2) + "万＝本体";
  document.getElementById("steps").textContent = [
    num(m2, 1) + "㎡×建蔽" + kPct + "%＝" + num(arch, 1) + "㎡ ／ 容積" + yPct + "%＝" + num(far, 1) + "㎡",
    "専有" + num(usedExclusive, 1) + "㎡×" + num(c, 2) + "＝延べ" + num(usedGfa, 1) + "㎡（" + units + "戸／上限" + capUnits + "戸）",
    withExtra && body > 0 ? costLine + " ×1.25＝付帯込" : costLine
  ].join("\n");
  saveState();
}
["land", "kenpei", "yoseki", "floors", "price", "unitM2"].forEach(function (id) {
  function onField() {
    if (id === "unitM2" || id === "floors") unitsManual = false;
    if (id === "price") rememberPrice();
    if (id === "unitM2") rememberType();
    calc();
  }
  var el = document.getElementById(id);
  el.addEventListener("input", onField);
  el.addEventListener("change", onField);
});
eff.addEventListener("input", function () { if (syncing) return; unitsManual = false; const e = parseFloat(eff.value); if (isFinite(e) && e > 0) setEff(e); rememberType(); calc(); });
function onCoeffInput(el) { if (syncing) return; unitsManual = false; const c = parseFloat(el.value); if (isFinite(c) && c >= 1) setCoeff(c); rememberType(); calc(); }
coeff.addEventListener("input", function () { onCoeffInput(coeff); });
coeffOut.addEventListener("input", function () { onCoeffInput(coeffOut); });
unitsIn.addEventListener("input", function () { unitsManual = true; calc(); });
extra.addEventListener("change", calc);
const STORE_KEY = "mansion-kojihi-preview-v11";
function currentType() { const on = document.querySelector("#typeSeg button.on"); return on ? on.getAttribute("data-type") : "oneroom"; }
function currentStruct() { const on = document.querySelector("#structSeg button.on"); return on ? on.getAttribute("data-struct") : "RC"; }
function currentTheme() { return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; }
function setSegOn(rootId, attr, value) { const root = document.getElementById(rootId); root.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.getAttribute(attr) === value); }); }
function applyTheme(theme) {
  const btn = document.getElementById("themeBtn");
  if (theme === "light") { document.documentElement.setAttribute("data-theme", "light"); btn.textContent = "\u263E"; }
  else { document.documentElement.removeAttribute("data-theme"); btn.textContent = "\u2600"; }
}
function applyLandUnitLabels() { const landUnitEl = document.getElementById("landUnit"); if (landUnit === "m2") { landLabel.textContent = "敷地面積"; landUnitEl.textContent = "㎡"; } else { landLabel.textContent = "敷地面積"; landUnitEl.textContent = "坪"; } }
function applyPriceUnitLabels() { const priceUnitEl = document.getElementById("priceUnit"); if (priceUnit === "tsubo") { priceLabel.textContent = "延べの坪単価"; priceUnitEl.textContent = "万円/坪"; } else { priceLabel.textContent = "延べの㎡単価"; priceUnitEl.textContent = "万円/㎡"; } applyUnitSizeLabel(); }
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ land: land.value, kenpei: kenpei.value, yoseki: yoseki.value, floors: floors.value, price: price.value, unitM2: unitM2.value, eff: eff.value, coeff: coeff.value, unitsIn: unitsIn.value, extra: !!extra.checked, landUnit: landUnit, priceUnit: priceUnit, unitSizeUnit: unitSizeUnit, unitsManual: !!unitsManual, type: currentType(), struct: currentStruct(), theme: currentTheme(), priceMem: priceMem, typeMem: typeMem }));
  } catch (e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY); if (!raw) return false;
    const data = JSON.parse(raw); if (!data || typeof data !== "object") return false;
    function keep(v) { return v != null && String(v).trim() !== ""; }
    if (keep(data.land)) land.value = data.land;
    if (keep(data.kenpei)) kenpei.value = data.kenpei;
    if (keep(data.yoseki)) yoseki.value = data.yoseki;
    if (keep(data.floors)) floors.value = data.floors;
    if (keep(data.price)) price.value = data.price;
    if (keep(data.unitM2)) unitM2.value = data.unitM2;
    if (keep(data.eff)) eff.value = data.eff;
    if (keep(data.coeff)) { coeff.value = data.coeff; if (coeffOut) coeffOut.value = data.coeff; }
    if (keep(data.unitsIn)) unitsIn.value = data.unitsIn;
    if (typeof data.extra === "boolean") extra.checked = data.extra;
    if (data.landUnit === "m2" || data.landUnit === "tsubo") landUnit = data.landUnit;
    if (data.priceUnit === "m2" || data.priceUnit === "tsubo") priceUnit = data.priceUnit;
    if (data.unitSizeUnit === "m2" || data.unitSizeUnit === "tsubo") unitSizeUnit = data.unitSizeUnit;
    unitsManual = !!data.unitsManual;
    if (data.type === "oneroom" || data.type === "family") setSegOn("typeSeg", "data-type", data.type);
    if (data.struct === "S" || data.struct === "RC" || data.struct === "SRC") setSegOn("structSeg", "data-struct", data.struct);
    if (data.priceMem && typeof data.priceMem === "object") { ["S", "RC", "SRC"].forEach(function (k) { const n = parseFloat(data.priceMem[k]); if (isFinite(n) && n > 0) priceMem[k] = n; }); }
    if (data.typeMem && typeof data.typeMem === "object") { ["oneroom", "family"].forEach(function (k) { const t = data.typeMem[k]; if (!t) return; const u = parseFloat(t.unitM2); const e = parseFloat(t.eff); if (isFinite(u) && u > 0 && isFinite(e) && e > 0) typeMem[k] = { unitM2: u, eff: e }; }); }
    setSegOn("unitSeg", "data-unit", landUnit); setSegOn("priceSeg", "data-price", priceUnit); applyLandUnitLabels(); applyPriceUnitLabels(); applyTheme(data.theme === "light" ? "light" : "dark");
    return true;
  } catch (e) { return false; }
}
document.getElementById("themeBtn").addEventListener("click", function () { applyTheme(currentTheme() === "light" ? "dark" : "light"); saveState(); });
(function () {
  const panel = document.getElementById("stepsPanel");
  const slot = document.getElementById("stepsSlot");
  const toggle = document.getElementById("stepsToggle");
  const closeBtn = document.getElementById("stepsClose");
  function isOpen() { return panel.classList.contains("open"); }
  function openPanel() { panel.hidden = false; panel.classList.add("open"); panel.classList.remove("float"); document.body.classList.add("steps-open"); toggle.textContent = "式を閉じる"; slot.style.minHeight = ""; syncStepsMode(); }
  function closePanel() { panel.classList.remove("open", "float"); panel.hidden = true; document.body.classList.remove("steps-open"); toggle.textContent = "式の確認"; slot.style.minHeight = ""; }
  function nearPageBottom() {
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight || 0;
    const doc = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    return (window.scrollY || window.pageYOffset || 0) + vh >= doc - 80;
  }
  function syncStepsMode() {
    if (!isOpen()) return;
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight || 0;
    const rect = slot.getBoundingClientRect();
    const slotOnScreen = rect.top < vh - 96 && rect.bottom > 88;
    if (nearPageBottom() || slotOnScreen) { panel.classList.remove("float"); slot.style.minHeight = ""; return; }
    slot.style.minHeight = Math.max(panel.offsetHeight, 1) + "px";
    panel.classList.add("float");
  }
  toggle.addEventListener("click", function () { if (isOpen()) closePanel(); else openPanel(); });
  closeBtn.addEventListener("click", closePanel);
  window.addEventListener("scroll", syncStepsMode, { passive: true });
  window.addEventListener("resize", syncStepsMode);
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", syncStepsMode); window.visualViewport.addEventListener("scroll", syncStepsMode); }
})();
function resetAll() {
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  priceMem = { S: 114, RC: 120, SRC: 135 }; typeMem = { oneroom: { unitM2: 25, eff: 0.75 }, family: { unitM2: 65, eff: 0.82 } };
  landUnit = "m2"; priceUnit = "tsubo"; unitSizeUnit = "m2"; unitsManual = false;
  land.value = "330"; kenpei.value = "80"; yoseki.value = "400"; floors.value = "7"; price.value = "120"; unitM2.value = "25"; extra.checked = false; unitsIn.value = "";
  setSegOn("typeSeg", "data-type", "oneroom"); setSegOn("structSeg", "data-struct", "RC"); setSegOn("unitSeg", "data-unit", "m2"); setSegOn("priceSeg", "data-price", "tsubo");
  applyLandUnitLabels(); applyPriceUnitLabels(); applyUnitSizeLabel(); eff.value = "0.75"; coeff.value = "1.33"; if (coeffOut) coeffOut.value = "1.33";
  const panel = document.getElementById("stepsPanel"); panel.classList.remove("open", "float"); panel.hidden = true; document.body.classList.remove("steps-open");
  document.getElementById("stepsToggle").textContent = "式の確認"; document.getElementById("stepsSlot").style.minHeight = ""; calc();
}
document.getElementById("resetBtn").addEventListener("click", resetAll);
if (!loadState()) { if (eff && !eff.value) eff.value = "0.75"; if (coeff && !coeff.value) coeff.value = "1.33"; if (coeffOut && !coeffOut.value) coeffOut.value = "1.33"; }
calc();
