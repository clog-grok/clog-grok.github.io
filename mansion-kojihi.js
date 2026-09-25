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
    ".steps-panel.float:not(.memo-dock){position:fixed !important;left:50% !important;bottom:calc(10px + env(safe-area-inset-bottom, 0px)) !important;transform:translateX(-50%) !important;width:calc(100% - 24px) !important;max-width:400px !important;max-height:min(42vh, 300px) !important;overflow:auto !important;z-index:1000 !important;margin:0 !important;box-shadow:0 12px 32px rgba(0,0,0,0.35) !important;}",
    ".steps-panel.memo-dock{position:static !important;left:auto !important;bottom:auto !important;transform:none !important;width:auto !important;max-width:none !important;max-height:none !important;overflow:visible !important;box-shadow:none !important;}",
    ".steps-panel.memo-dock .memo-box{min-height:16em;max-height:none;height:auto;}"
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
      btn.classList.add("on");
      btn.title = "コピーした";
      setTimeout(function () { btn.classList.remove("on"); btn.title = "式をコピー"; }, 900);
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
    var slot = orig("stepsSlot");
    var toggle = orig("stepsToggle");
    var oldTall = document.getElementById("memoTall");
    if (oldTall && oldTall.parentNode) oldTall.parentNode.removeChild(oldTall);
    function memoOpen() { return memoView && !memoView.classList.contains("hidden"); }
    function dockMemo(on) {
      if (!panel) return;
      panel.classList.toggle("memo-dock", on);
      if (on) panel.classList.remove("float");
    }
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
        copyBtn.style.display = "";
        copyBtn.textContent = "写";
      }
      dockMemo(on);
      if (on) {
        var box = orig("memoBox");
        if (box && !String(box.value || "").trim()) box.value = dumpFormula();
      } else {
        followFormula();
      }
    }
    function panelOpen() {
      return panel && !panel.hidden && panel.classList.contains("open");
    }
    function followFormula() {
      if (!panel || !panelOpen() || memoOpen()) return;
      var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight || 0;
      var rect = slot ? slot.getBoundingClientRect() : { top: 9999, bottom: 9999 };
      var slotOnScreen = rect.top < vh - 80 && rect.bottom > 72;
      var y = window.scrollY || window.pageYOffset || 0;
      var doc = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0);
      var nearBottom = y + vh >= doc - 72;
      if (slotOnScreen || nearBottom) {
        panel.classList.remove("float");
        if (slot) slot.style.minHeight = "";
      } else {
        if (slot) slot.style.minHeight = Math.max(panel.offsetHeight || 160, 1) + "px";
        panel.classList.add("float");
      }
    }
    function showFormulaFloat(anchor) {
      setMemo(false);
      panel.hidden = false;
      panel.classList.add("open");
      document.body.classList.add("steps-open");
      if (toggle) toggle.textContent = "式を閉じる";
      panel.classList.add("float");
      if (anchor && anchor.scrollIntoView) {
        try { anchor.scrollIntoView({ block: "start", inline: "nearest" }); } catch (e) {}
      }
      followFormula();
      setTimeout(followFormula, 60);
      setTimeout(followFormula, 240);
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
    document.querySelectorAll("[data-open-steps]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var fold = btn.closest("details") || btn.closest(".result-box") || btn.closest(".fold");
        setTimeout(function () { showFormulaFloat(fold); }, 0);
      }, true);
    });
    if (toggle) {
      toggle.addEventListener("click", function () {
        setTimeout(followFormula, 0);
        setTimeout(followFormula, 200);
      });
    }
    window.addEventListener("scroll", function () {
      if (memoOpen()) dockMemo(true);
      else followFormula();
    }, { passive: true });
    document.addEventListener("scroll", followFormula, true);
    window.addEventListener("resize", followFormula);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", followFormula);
      window.visualViewport.addEventListener("resize", followFormula);
    }
    if (window.IntersectionObserver && slot) {
      new IntersectionObserver(function () { followFormula(); }, { root: null, threshold: [0, 0.15, 1] }).observe(slot);
    }
    setInterval(function () { if (panelOpen() && !memoOpen()) followFormula(); }, 400);
    setMemo(false);
  };
  document.head.appendChild(s);
})();
