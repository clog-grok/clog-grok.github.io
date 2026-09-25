const M2_PER_TSUBO = 3.305785;
const TO_TSUBO = 0.3025;
const PRESET = { S: 114, RC: 120, SRC: 135 };
const TYPE = { oneroom: { unitM2: 25, eff: 0.75 }, family: { unitM2: 65, eff: 0.82 } };
const FS_STEPS = [0.58, 0.64, 0.72, 0.84, 0.98, 1.14, 1.32];
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
let dispUnit = "m2";
let unitsManual = false;
let syncing = false;
let fsIndex = FS_MID;

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
function area(m2) {
  if (!isFinite(m2) || m2 <= 0) return "—";
  const tsubo = m2 * TO_TSUBO;
  if (dispUnit === "tsubo") return tsubo.toFixed(1) + "坪（" + m2.toFixed(1) + "㎡）";
  return m2.toFixed(1) + "㎡（" + tsubo.toFixed(1) + "坪）";
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
function signedPct(p) {
  if (!isFinite(p)) return "+0%";
  if (p > 0) return "+" + trimNum(p, 1) + "%";
  if (p < 0) return trimNum(p, 1) + "%";
  return "0%";
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
  dispUnit = v;
  document.querySelectorAll("[data-unit-seg] button").forEach(function (b) {
    b.classList.toggle("on", b.getAttribute("data-disp") === v);
  });
  const landUnitEl = document.getElementById("landUnit");
  priceLabel.textContent = "延べ坪単価";
  document.getElementById("priceUnit").textContent = "万円/坪";
  if (dispUnit === "m2") {
    landUnitEl.textContent = "㎡";
    if (fromInput !== "keepLand" && m2Now) land.value = String(Math.round(m2Now * 10) / 10);
  } else {
    landUnitEl.textContent = "坪";
    if (fromInput !== "keepLand" && m2Now) land.value = String(Math.round((m2Now * TO_TSUBO) * 10) / 10);
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
  price.value = String(priceMem[v] || PRESET[v]);
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
  return n;
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
  const p = parseFloat(extraPct.value);
  if (!isFinite(p)) return 0.25;
  return p / 100;
}
function applyFs() {
  document.documentElement.style.setProperty("--steps-fs", FS_STEPS[fsIndex] + "rem");
  const mark = fsIndex < FS_MID ? "down" : (fsIndex > FS_MID ? "up" : "mid");
  document.querySelectorAll(".fs-btns button").forEach(function (b) {
    const kind = b.getAttribute("data-fs");
    b.classList.toggle("on", kind === mark || (kind === "mid" && fsIndex === FS_MID));
  });
}
function onFs(kind) {
  if (kind === "down") fsIndex = Math.max(0, fsIndex - 1);
  else if (kind === "up") fsIndex = Math.min(FS_STEPS.length - 1, fsIndex + 1);
  else fsIndex = FS_MID;
  applyFs();
  saveState();
}
document.querySelectorAll(".fs-btns").forEach(function (root) {
  root.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    onFs(btn.getAttribute("data-fs"));
  });
});

function calc() {
  const m2 = landM2();
  const kPct = parseFloat(kenpei.value) || 0;
  const yPct = parseFloat(yoseki.value) || 0;
  const f = parseFloat(floors.value) || 0;
  const uSize = parseFloat(unitM2.value) || 0;
  let e = parseFloat(eff.value);
  if (!isFinite(e) || e <= 0) e = 0.75;
  e = Math.max(0.01, Math.min(e, 1));
  const c = 1 / e;
  const k = kPct / 100;
  const y = yPct / 100;
  const pTsubo = priceTsubo();
  const pM2 = priceM2();
  if (m2) {
    if (dispUnit === "m2") landConv.textContent = num(m2 * TO_TSUBO, 1) + "坪 × 3.305785 ＝ " + num(m2, 1) + "㎡";
    else landConv.textContent = num(m2, 1) + "㎡ × 0.3025 ＝ " + num(m2 * TO_TSUBO, 1) + "坪";
  } else landConv.textContent = "";
  const arch = m2 * k;
  const far = m2 * y;
  const byFloor = arch * f;
  const capGfa = Math.min(far, byFloor);
  const useFar = far <= byFloor || !(f > 0);
  const needFloors = arch > 0 ? far / arch : 0;
  const capExclusive = capGfa * e;
  const capUnits = uSize > 0 ? Math.floor(capExclusive / uSize) : 0;
  let units = capUnits;
  if (unitsManual) {
    const typed = parseFloat(unitsIn.value);
    if (isFinite(typed) && typed > 0) units = Math.floor(typed);
  } else if (document.activeElement !== unitsIn) {
    unitsIn.value = capUnits ? String(capUnits) : "";
  }
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
  const perFloor = f > 0 ? units / f : 0;
  const capText = useFar ? "容積で頭打ち" : "建蔽×階数で頭打ち";
  ["capLabel", "capLabelLand", "capLabelPlan", "capLabelType"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = capText;
  });
  document.getElementById("gfaText").textContent = area(usedGfa);
  document.getElementById("archText").textContent = area(arch);
  document.getElementById("farText").textContent = area(far);
  document.getElementById("needFloorText").textContent = needFloors > 0 ? trimNum(needFloors, 2) + "階（階数の上限）" : "—";
  document.getElementById("planFloorText").textContent = f > 0 ? trimNum(f, 2) : "—";
  document.getElementById("perFloorText").textContent = perFloor > 0 ? trimNum(perFloor, 1) + "戸" : "—";
  const note = document.getElementById("floorNote");
  if (needFloors > 0 && f > 0 && f - needFloors > 0.01) {
    note.classList.remove("hidden");
    note.textContent = "容積上限 " + commaM2(far) + "㎡（" + trimNum(needFloors, 2) + "階相当）。計画階数が上限を超えています。";
  } else { note.classList.add("hidden"); note.textContent = ""; }
  const bodyTitle = document.getElementById("bodyTitle");
  const bodyBaseLine = document.getElementById("bodyBaseLine");
  const pct = extraRate();
  const extraAmt = body * pct;
  document.getElementById("extraYen").textContent = body > 0 ? "（" + yen(extraAmt) + "）" : "（—）";
  const withExtra = extra.checked;
  const total = withExtra ? body * (1 + pct) : body;
  const pctLabel = signedPct(pct * 100);
  if (withExtra) {
    bodyTitle.textContent = "本体＋付帯諸費用（" + pctLabel + "）";
    document.getElementById("bodyText").textContent = yen(total);
    if (dispUnit === "tsubo") {
      document.getElementById("formulaLabel").textContent = "延べ坪 × 坪単価 × " + trimNum(1 + pct, 2);
      document.getElementById("formulaText").textContent = usedGfa > 0 ? num(usedGfa * TO_TSUBO, 1) + "坪 × " + num(pTsubo, 1) + "万円 × " + trimNum(1 + pct, 2) : "—";
    } else {
      document.getElementById("formulaLabel").textContent = "延べ㎡ × ㎡単価 × " + trimNum(1 + pct, 2);
      document.getElementById("formulaText").textContent = usedGfa > 0 ? num(usedGfa, 1) + "㎡ × " + num(pM2, 2) + "万円 × " + trimNum(1 + pct, 2) : "—";
    }
    bodyBaseLine.classList.remove("hidden");
    bodyBaseLine.textContent = body > 0 ? "本体 " + yen(body) : "";
  } else {
    bodyTitle.textContent = "本体工事費（延べ × 単価）";
    document.getElementById("bodyText").textContent = yen(body);
    if (dispUnit === "tsubo") {
      document.getElementById("formulaLabel").textContent = "延べ坪 × 坪単価";
      document.getElementById("formulaText").textContent = usedGfa > 0 ? num(usedGfa * TO_TSUBO, 1) + "坪 × " + num(pTsubo, 1) + "万円" : "—";
    } else {
      document.getElementById("formulaLabel").textContent = "延べ㎡ × ㎡単価";
      document.getElementById("formulaText").textContent = usedGfa > 0 ? num(usedGfa, 1) + "㎡ × " + num(pM2, 2) + "万円" : "—";
    }
    bodyBaseLine.classList.add("hidden");
    bodyBaseLine.textContent = "";
  }
  if (overGfa > 0.001 && bodyCap > 0) {
    bodyBaseLine.classList.remove("hidden");
    const capYen = withExtra ? yen(bodyCap * (1 + pct)) : yen(bodyCap);
    bodyBaseLine.textContent = (withExtra && body > 0 ? "本体 " + yen(body) + "　" : "") + "上限延べなら " + capYen;
  }
  document.getElementById("unitsCapText").textContent = capUnits ? capUnits + "戸（上限）" : "—";
  document.getElementById("perUnitText").textContent = yen(withExtra && units > 0 ? total / units : per);
  document.getElementById("exText").textContent = area(usedExclusive);
  document.getElementById("gfaLine").textContent = area(usedGfa);
  document.getElementById("gfaFormula").textContent = usedExclusive > 0 ? "専有 " + num(usedExclusive, 1) + "㎡ × " + num(c, 2) : "";
  document.getElementById("commonText").textContent = area(common);
  const costCore = dispUnit === "tsubo"
    ? num(usedGfa * TO_TSUBO, 1) + "坪 × " + num(pTsubo, 1) + "万＝本体"
    : num(usedGfa, 1) + "㎡ × " + num(pM2, 2) + "万＝本体";
  const costLine = withExtra && body > 0
    ? costCore + " ×" + trimNum(1 + pct, 2) + "＝付帯込　" + yen(total)
    : costCore + (body > 0 ? "　" + yen(body) : "");
  document.getElementById("steps").textContent = [
    num(m2, 1) + "㎡×建蔽" + kPct + "%＝" + num(arch, 1) + "㎡ ／ 容積" + yPct + "%＝" + num(far, 1) + "㎡",
    "専有" + num(usedExclusive, 1) + "㎡×" + num(c, 2) + "＝延べ" + num(usedGfa, 1) + "㎡（" + units + "戸／上限" + capUnits + "戸）",
    costLine
  ].join("\n");
  saveState();
}
["land", "kenpei", "yoseki", "floors", "price", "unitM2"].forEach(function (id) {
  document.getElementById(id).addEventListener("input", function () {
    if (id === "unitM2" || id === "floors") unitsManual = false;
    if (id === "price") rememberPrice();
    if (id === "unitM2") rememberType();
    calc();
  });
});
eff.addEventListener("input", function () { if (syncing) return; unitsManual = false; const e = parseFloat(eff.value); if (isFinite(e) && e > 0) setEff(e); rememberType(); calc(); });
coeff.addEventListener("input", function () { if (syncing) return; unitsManual = false; const c = parseFloat(coeff.value); if (isFinite(c) && c >= 1) setCoeff(c); rememberType(); calc(); });
unitsIn.addEventListener("input", function () { unitsManual = true; calc(); });
extra.addEventListener("change", calc);
extraPct.addEventListener("input", calc);
const STORE_KEY = "mansion-kojihi-v2";
function currentType() { const on = document.querySelector("#typeSeg button.on"); return on ? on.getAttribute("data-type") : "oneroom"; }
function currentStruct() { const on = document.querySelector("#structSeg button.on"); return on ? on.getAttribute("data-struct") : "RC"; }
function currentTheme() { return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; }
function setSegOn(rootId, attr, value) { const root = document.getElementById(rootId); root.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.getAttribute(attr) === value); }); }
function applyTheme(theme) {
  const btn = document.getElementById("themeBtn");
  if (theme === "light") { document.documentElement.setAttribute("data-theme", "light"); btn.textContent = "\u263E"; }
  else { document.documentElement.removeAttribute("data-theme"); btn.textContent = "\u2600"; }
}
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      land: land.value, kenpei: kenpei.value, yoseki: yoseki.value, floors: floors.value,
      price: price.value, unitM2: unitM2.value, eff: eff.value, coeff: coeff.value,
      unitsIn: unitsIn.value, extra: !!extra.checked, extraPct: extraPct.value,
      dispUnit: dispUnit, unitsManual: !!unitsManual, type: currentType(), struct: currentStruct(),
      theme: currentTheme(), priceMem: priceMem, typeMem: typeMem, fsIndex: fsIndex
    }));
  } catch (e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem("mansion-kojihi-v1");
    if (!raw) return false;
    const data = JSON.parse(raw); if (!data || typeof data !== "object") return false;
    if (data.land != null) land.value = data.land;
    if (data.kenpei != null) kenpei.value = data.kenpei;
    if (data.yoseki != null) yoseki.value = data.yoseki;
    if (data.floors != null) floors.value = data.floors;
    if (data.price != null) price.value = data.price;
    if (data.unitM2 != null) unitM2.value = data.unitM2;
    if (data.eff != null) eff.value = data.eff;
    if (data.coeff != null) coeff.value = data.coeff;
    if (data.unitsIn != null) unitsIn.value = data.unitsIn;
    if (typeof data.extra === "boolean") extra.checked = data.extra;
    if (data.extraPct != null) extraPct.value = data.extraPct;
    if (data.type === "oneroom" || data.type === "family") setSegOn("typeSeg", "data-type", data.type);
    if (data.struct === "S" || data.struct === "RC" || data.struct === "SRC") setSegOn("structSeg", "data-struct", data.struct);
    if (data.priceMem && typeof data.priceMem === "object") { ["S", "RC", "SRC"].forEach(function (k) { const n = parseFloat(data.priceMem[k]); if (isFinite(n) && n > 0) priceMem[k] = n; }); }
    if (data.typeMem && typeof data.typeMem === "object") { ["oneroom", "family"].forEach(function (k) { const t = data.typeMem[k]; if (!t) return; const u = parseFloat(t.unitM2); const e = parseFloat(t.eff); if (isFinite(u) && u > 0 && isFinite(e) && e > 0) typeMem[k] = { unitM2: u, eff: e }; }); }
    unitsManual = !!data.unitsManual;
    if (typeof data.fsIndex === "number" && data.fsIndex >= 0 && data.fsIndex < FS_STEPS.length) fsIndex = data.fsIndex;
    applyTheme(data.theme === "light" ? "light" : "dark");
    if (data.priceUnit === "m2") {
      const p = parseFloat(price.value);
      if (isFinite(p) && p > 0) price.value = String(Math.round((p * M2_PER_TSUBO) * 10) / 10);
    }
    const unit = data.dispUnit || data.landUnit || "m2";
    setDispUnit(unit === "tsubo" ? "tsubo" : "m2", "keepLand");
    applyFs();
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
  try { localStorage.removeItem(STORE_KEY); localStorage.removeItem("mansion-kojihi-v1"); } catch (e) {}
  priceMem = { S: 114, RC: 120, SRC: 135 };
  typeMem = { oneroom: { unitM2: 25, eff: 0.75 }, family: { unitM2: 65, eff: 0.82 } };
  dispUnit = "m2"; unitsManual = false; fsIndex = FS_MID;
  land.value = "330"; kenpei.value = "80"; yoseki.value = "400"; floors.value = "5";
  price.value = "120"; unitM2.value = "25"; extra.checked = false; extraPct.value = "25"; unitsIn.value = "";
  setSegOn("typeSeg", "data-type", "oneroom"); setSegOn("structSeg", "data-struct", "RC");
  setDispUnit("m2"); setEff(0.75); applyFs();
  const panel = document.getElementById("stepsPanel");
  panel.classList.remove("open", "float"); panel.hidden = true; document.body.classList.remove("steps-open");
  document.getElementById("stepsToggle").textContent = "式の確認"; document.getElementById("stepsSlot").style.minHeight = "";
  calc();
}
document.getElementById("resetBtn").addEventListener("click", resetAll);
if (!loadState()) { setEff(0.75); setDispUnit("m2"); applyFs(); }
calc();
