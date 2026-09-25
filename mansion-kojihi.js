const M2_PER_TSUBO = 3.305785;
const TO_TSUBO = 0.3025;
function parseCommaNum(s) {
  return parseFloat(String(s || "").replace(/,/g, ""));
}
function fmtComma(n) {
  if (!isFinite(n)) return "";
  const r = Math.round(n * 10) / 10;
  if (Math.abs(r - Math.round(r)) < 0.05) return Math.round(r).toLocaleString("ja-JP");
  return r.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}
