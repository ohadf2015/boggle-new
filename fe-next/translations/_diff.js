const enMod = require("./en.js");
const esMod = require("./es.js");
const en = enMod.en || enMod;
const es = esMod.es || esMod;

function flatKeys(obj, prefix) {
  prefix = prefix || "";
  var keys = [];
  var ks = Object.keys(obj);
  for (var i = 0; i < ks.length; i++) {
    var k = ks[i];
    var path = prefix ? prefix + "." + k : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(flatKeys(obj[k], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function getVal(obj, path) {
  var parts = path.split(".");
  var cur = obj;
  for (var i = 0; i < parts.length; i++) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

var enKeys = flatKeys(en);
var esSet = new Set(flatKeys(es));
var missing = enKeys.filter(function(k) { return !esSet.has(k); });
console.log("Count:", missing.length);
missing.forEach(function(k) {
  console.log(k + " ||| " + JSON.stringify(getVal(en, k)));
});
