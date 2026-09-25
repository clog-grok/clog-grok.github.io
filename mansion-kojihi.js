(function () {
  var css = document.createElement("style");
  css.textContent = [
    ".float-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px;overflow:visible;}",
    ".float-head .head-title{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0;flex:1 1 auto;}",
    ".float-head .head-tools{display:flex;align-items:center;flex-wrap:nowrap;gap:6px;flex:0 0 auto;}",
    ".float-head #stepsClose{margin-left:0;}",
    ".float-head .fs-btns{margin-right:0;}",
    ".float-head .icon-btn,.float-head .fs-btns button,#copySteps{display:inline-flex !important;visibility:visible !important;opacity:1 !important;position:static !important;margin:0;}",
    "#copySteps.hidden{display:inline-flex !important;}"
  ].join("");
  document.head.appendChild(css);

  function dummy() {
    return {
      addEventListener: function () {},
      classList: { toggle: function () {}, contains: function () { return false; }, add: function () {}, remove: function () {} },
      value: "",
      textContent: "",
      innerHTML: "",
      style: {},
      focus: function () {},
      hidden: false,
      querySelectorAll: function () { return []; }
    };
  }
  var orig = document.getElementById.bind(document);
  document.getElementById = function (id) { return orig(id) || dummy(); };
  function dumpFormula() {
    var pills = Array.prototype.map.call(document.querySelectorAll("#stepsPills .pill"), function (el) { return el.textContent; }).join(" / ");
    var delta = (orig("stepsDelta") || {}).textContent || "";
    var advice = (orig("stepsAdvice") || {}).textContent || "";
    var body = (orig("steps") || {}).textContent || "";
    return ["マンション工事費ざっくり", pills, delta, advice, body].filter(Boolean).join("\n");
  }
  function copyText(text, btn) {
    function ok() {
      if (!btn) return;
      btn.textContent = "コピーした";
      setTimeout(function () { btn.textContent = "写"; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok).catch(function () {});
  }
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/clog-grok/clog-grok.github.io@add2bad358013f7fdf17a2ba5a794b47185483d6/mansion-kojihi.js";
  s.onload = function () {
    var memoBtn = orig("memoBtn");
    var copyBtn = orig("copySteps");
    var formulaView = orig("formulaView");
    var memoView = orig("memoView");
    var head = orig("stepsHead");
    var clearBtn = orig("memoClear");
    if (!memoBtn || !formulaView || !memoView) return;
    function memoOpen() { return !memoView.classList.contains("hidden"); }
    function setMemo(on) {
      formulaView.classList.toggle("hidden", on);
      memoView.classList.toggle("hidden", !on);
      if (head) head.textContent = on ? "メモ" : "式";
      memoBtn.textContent = on ? "式" : "書";
      memoBtn.title = on ? "式に戻る" : "メモ";
      memoBtn.classList.toggle("on", on);
      if (clearBtn) clearBtn.classList.toggle("hidden", !on);
      if (copyBtn) {
        copyBtn.classList.remove("hidden");
        copyBtn.style.display = "inline-flex";
        copyBtn.style.visibility = "visible";
        copyBtn.textContent = "写";
      }
      if (on) {
        var box = orig("memoBox");
        if (box && !String(box.value || "").trim()) box.value = dumpFormula();
        if (box && box.focus) box.focus();
      }
    }
    memoBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setMemo(!memoOpen());
    }, true);
    if (copyBtn) {
      copyBtn.classList.remove("hidden");
      copyBtn.style.display = "inline-flex";
      copyBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var box = orig("memoBox");
        var text = memoOpen() ? ((box && box.value) || dumpFormula()) : dumpFormula();
        copyText(text, copyBtn);
      }, true);
    }
    setMemo(false);
  };
  document.head.appendChild(s);
})();
