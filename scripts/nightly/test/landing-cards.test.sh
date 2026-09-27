#!/bin/bash
# Test for lib/landing-cards.sh. Proves (no live anything):
#   - nightly_page_to_url_path converts Next app-router page paths to public URL paths
#   - locale segment [locale] -> /en sample ; route groups (..) dropped ; root -> /
#   - other dynamic segments [slug] -> cannot form a URL (returns nonzero)
#   - nightly_landing_url_block emits one domain URL per touched page route, deduped,
#     capped, and returns nonzero when the authored list has no page routes
#
# Run: bash scripts/nightly/test/landing-cards.test.sh
set -uo pipefail

HELPER="$(cd "$(dirname "$0")/../lib" && pwd)/landing-cards.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

. "$HELPER"
echo "  landing-cards:"

# --- nightly_page_to_url_path ------------------------------------------------
assert "locale landing route -> /en/<route>" \
  "[ \"\$(nightly_page_to_url_path 'fe-next/app/[locale]/word-craft-landing/page.tsx')\" = '/en/word-craft-landing' ]"
assert "nested locale route keeps depth" \
  "[ \"\$(nightly_page_to_url_path 'fe-next/app/[locale]/learn/spelling/page.tsx')\" = '/en/learn/spelling' ]"
assert "route group (marketing) dropped from URL" \
  "[ \"\$(nightly_page_to_url_path 'fe-next/app/(marketing)/[locale]/promo/page.tsx')\" = '/en/promo' ]"
assert "non-locale route still maps" \
  "[ \"\$(nightly_page_to_url_path 'fe-next/app/blast/page.tsx')\" = '/blast' ]"
assert "root app/page.tsx -> /" \
  "[ \"\$(nightly_page_to_url_path 'fe-next/app/page.tsx')\" = '/' ]"
assert "dynamic [slug] segment cannot form URL (nonzero)" \
  "! nightly_page_to_url_path 'fe-next/app/[locale]/blog/[slug]/page.tsx' >/dev/null 2>&1"

# --- nightly_landing_url_block -----------------------------------------------
ROOT=$(mktemp -d -t landingcards.XXXXXX); trap 'rm -rf "$ROOT"' EXIT
AUTH="$ROOT/authored.txt"
cat > "$AUTH" <<'EOF'
fe-next/app/[locale]/word-craft-landing/page.tsx
fe-next/lib/experiments.ts
fe-next/components/wordTower/WordTowerGame.tsx
fe-next/app/[locale]/learn/spelling/page.tsx
fe-next/app/[locale]/word-craft-landing/page.tsx
EOF

BLOCK=$(nightly_landing_url_block "$AUTH" "https://www.lexiclash.live")
assert "block emits the landing URL" \
  "echo \"\$BLOCK\" | grep -qF 'https://www.lexiclash.live/en/word-craft-landing'"
assert "block emits the second route" \
  "echo \"\$BLOCK\" | grep -qF 'https://www.lexiclash.live/en/learn/spelling'"
assert "block dedupes repeated route (one occurrence)" \
  "[ \"\$(echo \"\$BLOCK\" | grep -cF '/en/word-craft-landing')\" = 1 ]"
assert "block ignores non-page files (no lib/component URLs)" \
  "! echo \"\$BLOCK\" | grep -q 'experiments\\|WordTowerGame'"

# no page routes -> nonzero, no output
NOAUTH="$ROOT/none.txt"; printf 'fe-next/lib/foo.ts\nfe-next/components/Bar.tsx\n' > "$NOAUTH"
assert "no page routes -> returns nonzero" \
  "! nightly_landing_url_block '$NOAUTH' 'https://www.lexiclash.live' >/dev/null 2>&1"

# cap: 8 distinct routes, max 3 -> only 3 URLs
MANY="$ROOT/many.txt"; : > "$MANY"
for i in 1 2 3 4 5 6 7 8; do echo "fe-next/app/[locale]/p$i/page.tsx" >> "$MANY"; done
CAPPED=$(nightly_landing_url_block "$MANY" "https://www.lexiclash.live" 3)
assert "cap limits emitted URLs to 3" \
  "[ \"\$(echo \"\$CAPPED\" | grep -c 'lexiclash.live/en/p')\" = 3 ]"

echo "  ---- landing-cards: $PASS passed, $FAIL failed ----"
[ "$FAIL" -eq 0 ]
