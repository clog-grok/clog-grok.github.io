(async function () {
  var n = 4;
  var parts = await Promise.all(Array.from({length: n}, function (_, i) {
    return fetch("./mansion-kojihi-preview.p" + i + ".js?v=21-coeff").then(function (r) { return r.text(); });
  }));
  (0, eval)(parts.join(""));
})();
