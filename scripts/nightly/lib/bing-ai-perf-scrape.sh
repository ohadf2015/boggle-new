#!/bin/bash
# bing-ai-perf-scrape.sh — pull Bing WMT "AI Performance" data via Playwriter.
#
# Bing's AI Performance UI shows Copilot/Partner citations of our site (which
# pages get cited, which grounding queries triggered the citation). There is
# NO public API for this — only the UI. We drive the UI with Playwriter.
#
# Writes JSON to docs/nightly/ai-search/<YYYY-MM-DD>.json.
# Skip-gracefully if Playwriter extension isn't connected (mac asleep, Chrome
# closed, extension off). Lane 6 reads the file when present.
#
# Site URL is hardcoded to lexiclash.live (the verified Bing WMT property).

set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
TODAY=$(date +%Y-%m-%d)
OUT="$PROJECT_DIR/docs/nightly/ai-search/${TODAY}.json"
SITE="https://lexiclash.live/"
URL="https://www.bing.com/webmasters/aiperformance?siteUrl=${SITE}"

mkdir -p "$(dirname "$OUT")"

if ! command -v playwriter >/dev/null 2>&1; then
  echo "bing-ai-perf: playwriter CLI not found — skipping (install: npm i -g playwriter@latest)"
  exit 0
fi

# Get a Playwriter session. If no existing one (extension not connected), bail.
SID=$(playwriter session new 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tr -d '[:space:]')
if [ -z "$SID" ] || ! [[ "$SID" =~ ^[0-9]+$ ]]; then
  echo "bing-ai-perf: playwriter session start failed — Chrome/extension offline?"
  exit 0
fi

echo "bing-ai-perf: session=$SID — navigating to $URL"

# Probe + extract Grounding Queries
QUERIES_JSON=$(playwriter -s "$SID" -e "$(cat <<EOF
const p = await context.newPage();
state._aiPage = p;
await p.goto('$URL', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(5500);
// Grounding Queries is the default tab; just extract
const cells = await p.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('.ms-List-cell, [data-list-index]'));
  return rows.slice(0, 50).map(c => {
    const txt = (c.innerText || '').replace(/\s+/g, ' ').trim();
    // Format: "<query text> <citations>"
    const m = txt.match(/^(.+?)\s+(\d+)\s*\$/);
    return m ? { query: m[1], citations: parseInt(m[2], 10) } : null;
  }).filter(Boolean);
});
console.log(JSON.stringify(cells));
EOF
)" --timeout 45000 2>&1 | grep -E "^\[" | tail -1)

if [ -z "$QUERIES_JSON" ] || ! echo "$QUERIES_JSON" | jq empty 2>/dev/null; then
  echo "bing-ai-perf: queries extraction failed (page not logged in? Bing UI changed?)"
  exit 0
fi

# Switch to Pages tab + extract
PAGES_JSON=$(playwriter -s "$SID" -e "$(cat <<'EOF'
const p = state._aiPage;
const tab = p.locator('button[role=tab][name="Pages"]').first();
await tab.click();
await p.waitForTimeout(3500);
const cells = await p.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('.ms-List-cell, [data-list-index]'));
  return rows.slice(0, 60).map(c => {
    const txt = (c.innerText || '').replace(/\s+/g, ' ').trim();
    const m = txt.match(/^(https?:\/\/\S+)\s+(\d+)\s*$/);
    return m ? { url: m[1], citations: parseInt(m[2], 10) } : null;
  }).filter(Boolean);
});
console.log(JSON.stringify(cells));
EOF
)" --timeout 30000 2>&1 | grep -E "^\[" | tail -1)

if [ -z "$PAGES_JSON" ] || ! echo "$PAGES_JSON" | jq empty 2>/dev/null; then
  echo "bing-ai-perf: pages extraction failed"
  PAGES_JSON="[]"
fi

# Also pull the daily totals from the time-series table (top of page, always rendered)
TOTALS_JSON=$(playwriter -s "$SID" -e "$(cat <<'EOF'
const p = state._aiPage;
// Scroll back to top for the totals card
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(1000);
const stats = await p.evaluate(() => {
  // Pull "Total Citations" + "Avg. Cited Pages" big-number cards
  const cards = Array.from(document.querySelectorAll('[class*="metricCard" i], [class*="bigNumber" i], [data-tag*="aiPerf"]'));
  // Fallback: find by text proximity
  const txt = document.body.innerText;
  const totalMatch = txt.match(/Total Citations\s*(\d+)/i);
  const avgMatch = txt.match(/Avg\.\s*Cited Pages\s*(\d+(?:\.\d+)?)/i);
  return {
    total_citations_30d: totalMatch ? parseInt(totalMatch[1], 10) : null,
    avg_cited_pages_30d: avgMatch ? parseFloat(avgMatch[1]) : null
  };
});
console.log(JSON.stringify(stats));
EOF
)" --timeout 12000 2>&1 | grep -E "^\{" | tail -1)

[ -z "$TOTALS_JSON" ] && TOTALS_JSON='{}'

# Compose the final JSON
echo "{
  \"date\": \"$TODAY\",
  \"site\": \"$SITE\",
  \"source\": \"bing-wmt-ai-performance\",
  \"totals\": $TOTALS_JSON,
  \"grounding_queries\": $QUERIES_JSON,
  \"cited_pages\": $PAGES_JSON
}" | jq . > "$OUT"

echo "bing-ai-perf: wrote $OUT"
echo "  queries: $(echo "$QUERIES_JSON" | jq 'length')"
echo "  pages:   $(echo "$PAGES_JSON" | jq 'length')"
