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
    "body.steps-open{padding-bottom:0 !important;}",
    ".steps-panel.open{position:static !important;left:auto !important;right:auto !important;bottom:auto !important;transform:none !important;width:auto !important;max-width:none !important;margin:0 0 10px !important;}",
    ".steps-panel.open.float{position:fixed !important;left:50% !important;bottom:calc(8px + env(safe-area-inset-bottom, 0px)) !important;transform:translateX(-50%) !important;width:calc(100% - 24px) !important;max-width:400px !important;max-height:min(46vh, 320px) !important;overflow:auto !important;z-index:1000 !important;margin:0 !important;box-shadow:0 12px 32px rgba(0,0,0,0.35) !important;}",
    ".steps-panel.open .memo-box{min-height:9em;max-height:30vh;height:30vh;}",
    ".memo-box{border:1.5px solid #7dd3fc;min-height:9em;}"
  ].join("");
  document.head.appendChild(css);

  function dummy() {
    return {
      addEventListener: function () {},
      classList: { toggle: function () {}, contains: function () { return false; }, add: function () {}, remove: function () {} },
      value: "", textContent: "", innerHTML: "", style: {}, focus: function () {}, hidden: false,
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
    var oldTall = orig("memoTall");
    var holdAlign = 0;
    var homeH = 0;
    if (oldTall && oldTall.parentNode) oldTall.parentNode.removeChild(oldTall);
    function memoOpen() { return memoView && !memoView.classList.contains("hidden"); }
    function openNow() { return panel && !panel.hidden && panel.classList.contains("open"); }
    function viewH() {
      return (window.visualViewport && window.visualViewport.height) || window.innerHeight || 0;
    }
    function viewBottom() {
      var vv = window.visualViewport;
      return ((vv && vv.offsetTop) || 0) + viewH();
    }
    function clearFixed() {
      ["position", "left", "right", "bottom", "top", "transform", "width", "max-width", "z-index", "margin"].forEach(function (k) {
        panel.style.removeProperty(k);
      });
    }
    function reserveHome() {
      if (!slot) return;
      if (!panel.classList.contains("float")) homeH = panel.offsetHeight || homeH;
      var h = Math.max(homeH || panel.offsetHeight || 1, 1) + "px";
      if (slot.style.minHeight !== h) slot.style.minHeight = h;
    }
    function releaseHome() {
      if (slot) slot.style.minHeight = "0px";
      homeH = 0;
    }
    function dock() {
      if (!panel) return;
      panel.classList.remove("float");
      panel.classList.remove("memo-dock");
      clearFixed();
      if (openNow()) reserveHome();
      else releaseHome();
    }
    function lift() {
      if (!panel) return;
      reserveHome();
      panel.classList.add("float");
      panel.classList.remove("memo-dock");
      panel.style.setProperty("position", "fixed", "important");
      panel.style.setProperty("left", "50%", "important");
      panel.style.setProperty("right", "auto", "important");
      panel.style.setProperty("top", "auto", "important");
      panel.style.setProperty("bottom", "calc(8px + env(safe-area-inset-bottom, 0px))", "important");
      panel.style.setProperty("transform", "translateX(-50%)", "important");
      panel.style.setProperty("width", "calc(100% - 24px)", "important");
      panel.style.setProperty("max-width", "400px", "important");
      panel.style.setProperty("z-index", "1000", "important");
      panel.style.setProperty("margin", "0", "important");
    }
    function place() {
      if (!openNow()) {
        dock();
        document.body.classList.remove("steps-open");
        return;
      }
      if (Date.now() < holdAlign) { dock(); return; }
      var bottom = viewBottom();
      var rect = slot ? slot.getBoundingClientRect() : { top: bottom, bottom: bottom };
      var floated = panel.classList.contains("float");
      if (floated) {
        if (rect.top < bottom - 8) dock();
        else lift();
      } else {
        if (rect.top > bottom + 24) lift();
        else dock();
      }
    }
    function alignToBottom() {
      dock();
      holdAlign = Date.now() + 800;
      requestAnimationFrame(function () {
        dock();
        var top = panel.getBoundingClientRect().top;
        var y = Math.max(0, Math.round((window.scrollY || window.pageYOffset || 0) + top - viewBottom()));
        window.scrollTo(0, y);
        holdAlign = Date.now() + 450;
      });
    }
    function setMemo(on) {
      formulaView.classList.toggle("hidden", on);
      memoView.classList.toggle("hidden", !on);
      if (head) head.textContent = on ? "メモ" : "式";
      memoBtn.textContent = on ? "式" : "書";
      memoBtn.title = on ? "式に戻る" : "メモ";
      memoBtn.classList.toggle("on", on);
      if (clearBtn) clearBtn.classList.toggle("hidden", !on);
      if (copyBtn) { copyBtn.classList.remove("hidden"); copyBtn.style.display = ""; copyBtn.textContent = "写"; }
      if (on) {
        var box = orig("memoBox");
        if (box && !String(box.value || "").trim()) box.value = dumpFormula();
      }
      place();
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
        copyText(memoOpen() ? ((box && box.value) || dumpFormula()) : dumpFormula(), copyBtn);
      }, true);
    }
    document.querySelectorAll("[data-open-steps]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        setTimeout(function () {
          setMemo(false);
          panel.hidden = false;
          panel.classList.add("open");
          document.body.classList.add("steps-open");
          if (toggle) toggle.textContent = "式を閉じる";
          alignToBottom();
        }, 0);
      }, true);
    });
    if (toggle) toggle.addEventListener("click", function () {
      setTimeout(function () {
        if (openNow()) alignToBottom();
        else dock();
      }, 0);
    });
    var closeBtn = orig("stepsClose");
    if (closeBtn) closeBtn.addEventListener("click", function () { setTimeout(dock, 0); });
    window.addEventListener("scroll", place, true);
    document.addEventListener("scroll", place, true);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", place);
      window.visualViewport.addEventListener("resize", place);
    }
    (function loop() { place(); requestAnimationFrame(loop); })();
    setMemo(false);
  };
  document.head.appendChild(s);
})();
