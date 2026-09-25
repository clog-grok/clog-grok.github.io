(function () {
  var css = document.createElement("style");
  css.textContent = [
    ".float-head{display:flex;align-items:center;flex-wrap:nowrap;gap:6px;margin-bottom:6px;}",
    ".float-head .head-title{display:flex;align-items:center;gap:4px;flex:1 1 auto;min-width:0;}",
    ".float-head .head-tools{display:flex;align-items:center;gap:6px;flex:0 0 auto;margin-left:8px;}",
    ".float-head .fs-btns{display:flex;gap:4px;flex-shrink:0;}",
    ".float-head .fs-btns button,.float-head .icon-btn{width:2.1em;min-width:2.1em;height:28px;padding:0;flex-shrink:0;box-sizing:border-box;}",
    ".float-head #stepsClose{margin-left:0.7em;width:28px;min-width:28px;height:28px;flex-shrink:0;}",
    "#copySteps{width:2.1em;min-width:2.1em;overflow:hidden;}",
    "#copySteps.hidden{display:inline-flex !important;}",
    "#memoTall{display:none !important;}",
    ".memo-box{border:1.5px solid #7dd3fc;min-height:9em;}",
    ".steps-panel.float .memo-box{min-height:7em;max-height:26vh;}",
    ".steps-panel:not(.float) .memo-box{max-height:none;}"
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
    return ["\u30de\u30f3\u30b7\u30e7\u30f3\u5de5\u4e8b\u8cbb\u3056\u3063\u304f\u308a", pills, delta, advice, body].filter(Boolean).join("\n");
  }
  function copyText(text, btn) {
    function ok() {
      if (!btn) return;
      btn.classList.add("on");
      btn.title = "\u30b3\u30d4\u30fc\u3057\u305f";
      setTimeout(function () { btn.classList.remove("on"); btn.title = "\u5f0f\u3092\u30b3\u30d4\u30fc"; }, 900);
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
    var panel = orig("stepsPanel");
    var oldTall = document.getElementById("memoTall");
    if (oldTall && oldTall.parentNode) oldTall.parentNode.removeChild(oldTall);
    function memoOpen() { return memoView && !memoView.classList.contains("hidden"); }
    function fitMemo() {
      var box = orig("memoBox");
      if (!box || !panel || !memoOpen()) return;
      if (panel.classList.contains("float")) {
        box.style.height = "";
        return;
      }
      box.style.height = "auto";
      var h = box.scrollHeight + 72;
      var foot = document.querySelector(".foot");
      if (foot) {
        var room = foot.getBoundingClientRect().top - box.getBoundingClientRect().top - 16;
        if (room > 160) h = Math.min(h, room);
      }
      box.style.height = Math.max(180, Math.round(h)) + "px";
    }
    function setMemo(on) {
      formulaView.classList.toggle("hidden", on);
      memoView.classList.toggle("hidden", !on);
      if (head) head.textContent = on ? "\u30e1\u30e2" : "\u5f0f";
      memoBtn.textContent = on ? "\u5f0f" : "\u66f8";
      memoBtn.title = on ? "\u5f0f\u306b\u623b\u308b" : "\u30e1\u30e2";
      memoBtn.classList.toggle("on", on);
      if (clearBtn) clearBtn.classList.toggle("hidden", !on);
      if (copyBtn) {
        copyBtn.classList.remove("hidden");
        copyBtn.style.display = "";
        copyBtn.textContent = "\u5199";
      }
      if (on) {
        var box = orig("memoBox");
        if (box && !String(box.value || "").trim()) box.value = dumpFormula();
        if (box && box.focus) box.focus();
        setTimeout(fitMemo, 60);
      }
    }
    memoBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setMemo(!memoOpen());
    }, true);
    if (copyBtn) {
      copyBtn.classList.remove("hidden");
      copyBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var box = orig("memoBox");
        var text = memoOpen() ? ((box && box.value) || dumpFormula()) : dumpFormula();
        copyText(text, copyBtn);
      }, true);
    }
    var box = orig("memoBox");
    if (box) box.addEventListener("input", fitMemo);
    window.addEventListener("scroll", function () { if (memoOpen()) fitMemo(); }, { passive: true });
    window.addEventListener("resize", function () { if (memoOpen()) fitMemo(); });
    setMemo(false);
  };
  document.head.appendChild(s);
})();
