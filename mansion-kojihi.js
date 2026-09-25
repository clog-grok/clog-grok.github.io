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
  const tsuboNow = priceTsubo();
  dispUnit = v;
  document.querySelectorAll("[data-unit-seg] button").forEach(function (b) {
    b.classList.toggle("on", b.getAttribute("data-disp") === v);
  });
  const u = dispUnit === "m2" ? "㎡" : "坪";
  document.getElementById("landUnit").textContent = u;
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
function landM2() { const n = parseFloat(land.value); if (!isFinite(n) || n <= 0) return 0; return dispUnit === "tsubo" ? n * M2_PER_TSUBO : n; }
function priceTsubo() { const n = parseFloat(price.value); if (!isFinite(n) || n <= 0) return 0; return dispUnit === "m2" ? n * M2_PER_TSUBO : n; }
function priceM2() { return priceTsubo() / M2_PER_TSUBO; }
function setEff(e) { syncing = true; const v = Math.max(0.01, Math.min(e, 1)); eff.value = num(v, 2); coeff.value = num(1 / v, 2); syncing = false; }
function setCoeff(c) { syncing = true; const v = Math.max(1, c); coeff.value = num(v, 2); eff.value = num(1 / v, 2); syncing = false; }
function extraRate() { const p = parseFloat(extraPct.value); if (!isFinite(p)) return 0.25; return p / 100; }
function markFs(rootId, index) {
  const mark = index < FS_MID ? "down" : (index > FS_MID ? "up" : "mid");
  const root = document.getElementById(rootId);
  if (!root) return;
  root.querySelectorAll("button").forEach(function (b) {
    const kind = b.getAttribute("data-page-fs") || b.getAttribute("data-steps-fs");
    b.classList.toggle("on", kind === mark || (kind === "mid" && index === FS_MID));
  });
}
function applyPageFs() { document.documentElement.style.setProperty("--page-scale", String(PAGE_SCALES[pageFsIndex])); markFs("pageFsBtns", pageFsIndex); }
function applyStepsFs() { document.documentElement.style.setProperty("--steps-fs", STEPS_PX[stepsFsIndex] + "px"); markFs("stepsFsBtns", stepsFsIndex); }
function bumpIndex(index, kind, max) {
  if (kind === "down") return Math.max(0, index - 1);
  if (kind === "up") return Math.min(max, index + 1);
  return FS_MID;
}
document.getElementById("pageFsBtns").addEventListener("click", function (e) {
  const btn = e.target.closest("button"); if (!btn) return;
  pageFsIndex = bumpIndex(pageFsIndex, btn.getAttribute("data-page-fs"), PAGE_SCALES.length - 1);
  applyPageFs(); saveState();
});
document.getElementById("stepsFsBtns").addEventListener("click", function (e) {
  const btn = e.target.closest("button"); if (!btn) return;
  stepsFsIndex = bumpIndex(stepsFsIndex, btn.getAttribute("data-steps-fs"), STEPS_PX.length - 1);
  applyStepsFs(); saveState();
});
function setLandM2(m2) {
  if (!(m2 > 0)) return;
  land.value = dispUnit === "tsubo" ? String(Math.round(m2 * TO_TSUBO * 10) / 10) : String(Math.round(m2 * 10) / 10);
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
  if (m2) landConv.textContent = dispUnit === "m2" ? fmt(m2 * TO_TSUBO, 1) + "坪 × 3.305785 ＝ " + fmt(m2, 1) + "㎡" : fmt(m2, 1) + "㎡ × 0.3025 ＝ " + fmt(m2 * TO_TSUBO, 1) + "坪";
  else landConv.textContent = "";
  const arch = m2 * k;
  const farVal = m2 * y;
  const byFloor = arch * f;
  const capGfa = Math.min(farVal, byFloor);
  const useFar = farVal <= byFloor || !(f > 0);
  const needFloors = arch > 0 ? farVal / arch : 0;
  const capExclusive = capGfa * e;
  const capUnits = uSize > 0 ? Math.floor(capExclusive / uSize) : 0;
  let units = capUnits;
  if (unitsManual) { const typed = parseFloat(unitsIn.value); if (isFinite(typed) && typed > 0) units = Math.floor(typed); }
  else if (document.activeElement !== unitsIn) unitsIn.value = capUnits ? String(capUnits) : "";
  const usedExclusive = units * uSize;
  const usedGfa = usedExclusive * c;
  const overGfa = usedGfa - capGfa;
  const unitsNote = document.getElementById("unitsNote");
  if (overGfa > 0.001) { unitsNote.classList.remove("hidden"); unitsNote.textContent = "想定延べ " + commaM2(usedGfa) + "㎡。上限 " + commaM2(capGfa) + "㎡。差 +" + commaM2(overGfa) + "㎡。"; }
  else { unitsNote.classList.add("hidden"); unitsNote.textContent = ""; }
  const common = usedGfa - usedExclusive;
  const body = (usedGfa * TO_TSUBO) * pTsubo * 10000;
  const bodyCap = (capGfa * TO_TSUBO) * pTsubo * 10000;
  const per = units > 0 ? body / units : 0;
  const perFloor = f > 0 ? units / f : 0;
  const capText = useFar ? "容積で頭打ち" : "建蔽×階数で頭打ち";
  ["capLabel", "capLabelLand", "capLabelPlan", "capLabelType"].forEach(function (id) { const el = document.getElementById(id); if (el) el.textContent = capText; });
  document.getElementById("gfaText").textContent = area(usedGfa);
  fillDispArea(archIn, arch);
  fillDispArea(farIn, farVal);
  document.getElementById("archPair").textContent = pairArea(arch);
  document.getElementById("farPair").textContent = pairArea(farVal);
  const needFloorIn = document.getElementById("needFloorIn");
  if (needFloorIn && document.activeElement !== needFloorIn) needFloorIn.value = needFloors > 0 ? String(Math.round(needFloors * 100) / 100) : "";
  document.getElementById("planFloorText").textContent = f > 0 ? trimNum(f, 2) : "—";
  document.getElementById("perFloorText").textContent = perFloor > 0 ? trimNum(perFloor, 1) + "戸" : "—";
  const note = document.getElementById("floorNote");
  if (needFloors > 0 && f > 0 && f - needFloors > 0.01) { note.classList.remove("hidden"); note.textContent = "容積上限 " + commaM2(farVal) + "㎡（" + trimNum(needFloors, 2) + "階相当）。計画階数が上限を超えています。"; }
  else { note.classList.add("hidden"); note.textContent = ""; }
  const pct = extraRate();
  const extraAmt = body * pct;
  const extraMan = document.getElementById("extraMan");
  if (extraMan && document.activeElement !== extraMan) extraMan.value = body > 0 ? String(Math.round((extraAmt / 10000) * 10) / 10) : "";
  const withExtra = extra.checked;
  const total = withExtra ? body * (1 + pct) : body;
  const pctLabel = signedPct(pct * 100);
  const bodyTitle = document.getElementById("bodyTitle");
  const bodyBaseLine = document.getElementById("bodyBaseLine");
  if (withExtra) {
    bodyTitle.textContent = "本体＋付帯諸費用（" + pctLabel + "）";
    document.getElementById("bodyText").textContent = yen(total);
    document.getElementById("formulaLabel").textContent = dispUnit === "tsubo" ? "延べ坪 × 坪単価 × " + trimNum(1 + pct, 2) : "延べ㎡ × ㎡単価 × " + trimNum(1 + pct, 2);
    document.getElementById("formulaText").textContent = usedGfa > 0 ? (dispUnit === "tsubo" ? fmt(usedGfa * TO_TSUBO, 1) + "坪 × " + fmt(pTsubo, 1) + "万円 × " + trimNum(1 + pct, 2) : fmt(usedGfa, 1) + "㎡ × " + fmt(pM2, 2) + "万円 × " + trimNum(1 + pct, 2)) : "—";
    bodyBaseLine.classList.remove("hidden"); bodyBaseLine.textContent = body > 0 ? "本体 " + yen(body) : "";
  } else {
    bodyTitle.textContent = "本体工事費（延べ × 単価）";
    document.getElementById("bodyText").textContent = yen(body);
    document.getElementById("formulaLabel").textContent = dispUnit === "tsubo" ? "延べ坪 × 坪単価" : "延べ㎡ × ㎡単価";
    document.getElementById("formulaText").textContent = usedGfa > 0 ? (dispUnit === "tsubo" ? fmt(usedGfa * TO_TSUBO, 1) + "坪 × " + fmt(pTsubo, 1) + "万円" : fmt(usedGfa, 1) + "㎡ × " + fmt(pM2, 2) + "万円") : "—";
    bodyBaseLine.classList.add("hidden"); bodyBaseLine.textContent = "";
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
  document.getElementById("gfaFormula").textContent = usedExclusive > 0 ? "専有 " + fmt(usedExclusive, 1) + "㎡ × " + fmt(c, 2) : "";
  document.getElementById("commonText").textContent = area(common);
  const costCore = dispUnit === "tsubo" ? fmt(usedGfa * TO_TSUBO, 1) + "坪 × " + fmt(pTsubo, 1) + "万＝本体" : fmt(usedGfa, 1) + "㎡ × " + fmt(pM2, 2) + "万＝本体";
  const costLine = withExtra && body > 0 ? costCore + " ×" + trimNum(1 + pct, 2) + "＝付帯込　" + yen(total) : costCore + (body > 0 ? "　" + yen(body) : "");
  const stepsEl = document.getElementById("steps");
  stepsEl.textContent = [fmt(m2, 1) + "㎡×建蔽" + kPct + "%＝" + fmt(arch, 1) + "㎡ ／ 容積" + yPct + "%＝" + fmt(farVal, 1) + "㎡", "専有" + fmt(usedExclusive, 1) + "㎡×" + fmt(c, 2) + "＝延べ" + fmt(usedGfa, 1) + "㎡（" + units + "戸／上限" + capUnits + "戸）", costLine].join("\n");
  stepsEl.classList.toggle("over", overGfa > 0.001 || (needFloors > 0 && f - needFloors > 0.01));
  const remainUnits = capUnits - units;
  const remainGfa = capGfa - usedGfa;
  const pills = [];
  if (overGfa > 0.001) pills.push(["bad", "延べオーバー +" + fmt(overGfa, 1) + "㎡"]);
  else if (capGfa > 0 && remainGfa / capGfa < 0.05) pills.push(["warn", "延べ余裕 " + fmt(remainGfa, 1) + "㎡"]);
  else pills.push(["ok", "延べ余裕 " + fmt(Math.max(remainGfa, 0), 1) + "㎡"]);
  if (remainUnits < 0) pills.push(["bad", "戸数オーバー"]);
  else if (remainUnits === 0) pills.push(["warn", "上限ちょうど"]);
  else pills.push(["ok", "上限まであと" + remainUnits + "戸"]);
  if (needFloors > 0 && f - needFloors > 0.01) pills.push(["bad", "階数オーバー"]);
  else if (needFloors > 0 && Math.abs(f - needFloors) <= 0.05) pills.push(["warn", "階数上限ちょうど"]);
  else pills.push(["ok", "容積 " + capText]);
  document.getElementById("stepsPills").innerHTML = pills.map(function (p) { return '<span class="pill ' + p[0] + '">' + p[1] + "</span>"; }).join("");
  const advice = [];
  if (remainUnits > 0) advice.push("今の計画は " + units + "戸。上限まで " + remainUnits + "戸の余裕。");
  else if (remainUnits === 0) advice.push("想定戸数は上限いっぱいに乗っています。");
  else advice.push("想定戸数が上限を超えています。戸数か専有を下げてください。");
  if (needFloors > 0 && f - needFloors > 0.01) advice.push("計画 " + trimNum(f, 2) + "階に対し、容積は " + trimNum(needFloors, 2) + "階相当です。");
  document.getElementById("stepsAdvice").textContent = advice.join(" ");
  const deltaEl = document.getElementById("stepsDelta");
  if (lastTotal != null && isFinite(total) && Math.abs(total - lastTotal) >= 5000) {
    const d = total - lastTotal;
    deltaEl.classList.remove("hidden", "up", "down");
    deltaEl.classList.add(d > 0 ? "up" : "down");
    deltaEl.textContent = "直前より " + (d > 0 ? "+" : "") + yen(d);
  } else { deltaEl.classList.add("hidden"); deltaEl.textContent = ""; }
  if (isFinite(total) && total > 0) lastTotal = total;
  if (isFinite(body) && body > 0) lastBody = body;
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
document.getElementById("extraMan").addEventListener("input", function () {
  const man = parseFloat(document.getElementById("extraMan").value);
  const base = lastBody > 0 ? lastBody : 0;
  if (base > 0 && isFinite(man) && man >= 0) extraPct.value = String(Math.round((man * 10000 / base) * 1000) / 10);
  calc();
});
document.getElementById("needFloorIn").addEventListener("input", function () {
  if (syncing) return;
  const nf = parseFloat(document.getElementById("needFloorIn").value);
  const kPct = parseFloat(kenpei.value) || 0;
  if (nf > 0 && kPct > 0) yoseki.value = String(Math.round(nf * kPct * 10) / 10);
  unitsManual = false;
  calc();
});
archIn.addEventListener("input", function () {
  if (syncing) return;
  const arch = parseDispArea(archIn);
  const k = (parseFloat(kenpei.value) || 0) / 100;
  if (arch > 0 && k > 0) setLandM2(arch / k);
  unitsManual = false;
  calc();
});
farIn.addEventListener("input", function () {
  if (syncing) return;
  const farV = parseDispArea(farIn);
  const m2 = landM2();
  if (farV > 0 && m2 > 0) yoseki.value = String(Math.round((farV / m2) * 1000) / 10);
  else if (farV > 0) { const y = (parseFloat(yoseki.value) || 0) / 100; if (y > 0) setLandM2(farV / y); }
  unitsManual = false;
  calc();
});
function formulaDump() {
  const pills = Array.from(document.querySelectorAll("#stepsPills .pill")).map(function (el) { return el.textContent; }).join(" / ");
  const delta = document.getElementById("stepsDelta").textContent;
  const advice = document.getElementById("stepsAdvice").textContent;
  const body = document.getElementById("steps").textContent;
  return ["マンション工事費ざっくり", pills, delta, advice, body].filter(Boolean).join("\n");
}
function copyText(text, btn, label) {
  function ok() { if (btn) { btn.textContent = "コピーした"; setTimeout(function () { btn.textContent = label; }, 1200); } }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok).catch(function () {});
  else { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (err) {} document.body.removeChild(ta); }
}
function setMemoMode(on) {
  document.getElementById("formulaView").classList.toggle("hidden", on);
  document.getElementById("memoView").classList.toggle("hidden", !on);
  document.getElementById("stepsHead").textContent = on ? "テキストメモ" : "式の確認";
  document.getElementById("copySteps").classList.toggle("hidden", on);
  document.getElementById("memoBtn").classList.toggle("on", on);
  if (on) {
    const box = document.getElementById("memoBox");
    if (!box.value.trim()) box.value = formulaDump();
    box.focus();
  }
}
document.getElementById("copySteps").addEventListener("click", function () { copyText(formulaDump(), document.getElementById("copySteps"), "コピー"); });
document.getElementById("memoBtn").addEventListener("click", function () { setMemoMode(true); });
document.getElementById("backFormula").addEventListener("click", function () { setMemoMode(false); });
document.getElementById("copyMemo").addEventListener("click", function () { copyText(document.getElementById("memoBox").value || formulaDump(), document.getElementById("copyMemo"), "全体をコピー"); });
document.getElementById("memoBox").addEventListener("input", saveState);
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
    localStorage.setItem(STORE_KEY, JSON.stringify({ land: land.value, kenpei: kenpei.value, yoseki: yoseki.value, floors: floors.value, price: price.value, unitM2: unitM2.value, eff: eff.value, coeff: coeff.value, unitsIn: unitsIn.value, extra: !!extra.checked, extraPct: extraPct.value, dispUnit: dispUnit, unitsManual: !!unitsManual, type: currentType(), struct: currentStruct(), theme: currentTheme(), priceMem: priceMem, typeMem: typeMem, pageFsIndex: pageFsIndex, stepsFsIndex: stepsFsIndex, memo: document.getElementById("memoBox") ? document.getElementById("memoBox").value : "" }));
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
    if (data.typeMem && typeof data.typeMem === "object") { ["oneroom", "family"].forEach(function (k) { const t = data.typeMem[k]; if (!t) return; const u = parseFloat(t.unitM2); const ev = parseFloat(t.eff); if (isFinite(u) && u > 0 && isFinite(ev) && ev > 0) typeMem[k] = { unitM2: u, eff: ev }; }); }
    unitsManual = !!data.unitsManual;
    if (typeof data.pageFsIndex === "number" && data.pageFsIndex >= 0 && data.pageFsIndex < PAGE_SCALES.length) pageFsIndex = data.pageFsIndex;
    if (typeof data.stepsFsIndex === "number" && data.stepsFsIndex >= 0 && data.stepsFsIndex < STEPS_PX.length) stepsFsIndex = data.stepsFsIndex;
    applyTheme(data.theme === "light" ? "light" : "dark");
    const unit = data.dispUnit || data.landUnit || "m2";
    setDispUnit(unit === "tsubo" ? "tsubo" : "m2", "keepLand");
    if (typeof data.memo === "string" && document.getElementById("memoBox")) document.getElementById("memoBox").value = data.memo;
    applyPageFs(); applyStepsFs();
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
  document.querySelectorAll("[data-open-steps]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setMemoMode(false);
      if (!isOpen()) openPanel();
    });
  });
  window.addEventListener("scroll", syncStepsMode, { passive: true });
  window.addEventListener("resize", syncStepsMode);
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", syncStepsMode); window.visualViewport.addEventListener("scroll", syncStepsMode); }
})();
function resetAll() {
  try { localStorage.removeItem(STORE_KEY); localStorage.removeItem("mansion-kojihi-v1"); } catch (e) {}
  priceMem = { S: 114, RC: 120, SRC: 135 };
  typeMem = { oneroom: { unitM2: 25, eff: 0.75 }, family: { unitM2: 65, eff: 0.82 } };
  dispUnit = "m2"; unitsManual = false; pageFsIndex = FS_MID; stepsFsIndex = FS_MID; lastTotal = null; lastBody = null;
  land.value = "330"; kenpei.value = "80"; yoseki.value = "400"; floors.value = "5"; price.value = "120"; unitM2.value = "25"; extra.checked = false; extraPct.value = "25"; unitsIn.value = "";
  setSegOn("typeSeg", "data-type", "oneroom"); setSegOn("structSeg", "data-struct", "RC");
  setDispUnit("m2"); setEff(0.75); applyPageFs(); applyStepsFs();
  const panel = document.getElementById("stepsPanel"); panel.classList.remove("open", "float"); panel.hidden = true; document.body.classList.remove("steps-open");
  document.getElementById("stepsToggle").textContent = "式の確認"; document.getElementById("stepsSlot").style.minHeight = "";
  calc();
}
document.getElementById("resetBtn").addEventListener("click", resetAll);
if (!loadState()) { setEff(0.75); setDispUnit("m2"); applyPageFs(); applyStepsFs(); }
calc();
