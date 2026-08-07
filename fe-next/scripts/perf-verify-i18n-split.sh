#!/usr/bin/env bash
# Decides whether moving the message catalogue out of the RSC flight payload is a
# win or a regression. Two things can go wrong, and neither shows up in unit tests:
#
#   1. `getCachedTranslation` does `require(`./${lang}.js`)`. A template-literal
#      require in a *client* webpack build creates a synchronous context module
#      over all six locales (~3.4MB raw). The `typeof window === 'undefined'`
#      guard stops execution, not bundling. If any client chunk carries two or
#      more scripts, we added megabytes to save 165kB — revert.
#   2. Server-side, nothing seeds the cache any more. If the require fallback
#      doesn't resolve in the server bundle, SSR renders raw key paths
#      (`nav.howToPlay`) instead of text — an SEO and first-paint regression far
#      worse than the bytes saved.
#
# Verify by state, never by reasoning about webpack.
#
# Usage: bash scripts/perf-verify-i18n-split.sh [dist-dir] [port]
set -uo pipefail

DIST="${1:-.next-perf}"
PORT="${2:-3123}"
cd "$(dirname "$0")/.."

if [ ! -d "$DIST/static/chunks" ]; then
  echo "FAIL: no build at $DIST/static/chunks"
  exit 1
fi

echo "=== check 1: locale context module leaked into a client chunk"
node -e '
const fs = require("fs"), path = require("path");
const dir = path.join(process.argv[1], "static", "chunks");
const scripts = { he: /[֐-׿]/g, ja: /[぀-ヿ一-龯]/g, ru: /[Ѐ-ӿ]/g };
// Mere *presence* of two scripts proves nothing — blog posts about Hebrew word
// games contain Hebrew, and every SEO page carries a per-locale title map. What a
// bundled context module looks like is VOLUME: the full catalogue of each locale
// (he ~184k chars, ja ~121k, ru ~257k) landing in one file. Anything under this
// bar is ordinary localized content.
const FULL_CATALOGUE_CHARS = 50_000;
let bad = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []);
for (const f of walk(dir)) {
  const s = fs.readFileSync(f, "utf8");
  const hit = Object.entries(scripts)
    .map(([k, re]) => [k, (s.match(re) || []).length])
    .filter(([, n]) => n > FULL_CATALOGUE_CHARS);
  if (hit.length >= 2) {
    console.log("  CONTEXT MODULE", path.relative(dir, f), hit.map(([k, n]) => `${k}=${n}`).join(" "), (s.length/1024|0)+"kB");
    bad++;
  }
}
console.log(bad ? `  FAIL: ${bad} chunk(s) carry more than one full catalogue` : "  PASS: no chunk carries more than one full catalogue");
process.exitCode = bad ? 1 : 0;
' "$DIST"
CHUNK_RC=$?

echo
echo "=== check 2: SSR still renders text, not key paths"
NEXT_BUILD_DIR="$DIST" npx next start -p "$PORT" > /tmp/lexi-verify-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for _ in $(seq 1 40); do
  curl -sf "http://localhost:$PORT/en/about" -o /tmp/lexi-after.html && break
  sleep 1
done

if [ ! -s /tmp/lexi-after.html ]; then
  echo "  FAIL: server never served /en/about (see /tmp/lexi-verify-server.log)"
  exit 1
fi

node -e '
const h = require("fs").readFileSync("/tmp/lexi-after.html", "utf8");
const inline = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].reduce((a, m) => a + m[1].length, 0);
const catalogueTags = (h.match(/\/i18n\/[a-z]{2}\.[0-9a-f]{8}\.js/g) || []);
// Raw key paths leaking into the markup is the failure mode. They only appear as
// text nodes, so require a tag boundary rather than matching the flight payload.
const rawKeys = (h.match(/>[a-z]+\.[a-zA-Z]+(?:\.[a-zA-Z]+)*</g) || []).filter((m) => !/\.(js|css|com|live|org|png|webp|svg|json)</.test(m));
console.log("  html", (h.length/1024|0) + "kB, inline <script> total", (inline/1024|0) + "kB");
console.log("  catalogue asset tags:", [...new Set(catalogueTags)].join(", ") || "NONE");
console.log("  english text present:", /How to Play|Terms of Service/.test(h));
console.log("  raw key paths in markup:", rawKeys.length, rawKeys.slice(0, 5).join(" "));
const ok = catalogueTags.length > 0 && /How to Play|Terms of Service/.test(h) && rawKeys.length === 0;
console.log(ok ? "  PASS" : "  FAIL");
process.exitCode = ok ? 0 : 1;
'
SSR_RC=$?

echo
[ "$CHUNK_RC" -eq 0 ] && [ "$SSR_RC" -eq 0 ] && echo "VERDICT: ship" || echo "VERDICT: revert the i18n split"
exit $(( CHUNK_RC || SSR_RC ))
