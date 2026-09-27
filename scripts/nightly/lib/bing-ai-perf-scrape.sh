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
# Parse the id out of "Session <N> created ..." — the CLI now prints a connect
# banner + cloud tip, so stripping all whitespace would glue it into a non-numeric
# blob and always "fail" here (silent skip every night).
SID=$(playwriter session new 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -oE 'Session[[:space:]]+[0-9]+' | grep -oE '[0-9]+' | head -1)
if [ -z "$SID" ] || ! [[ "$SID" =~ ^[0-9]+$ ]]; then
  echo "bing-ai-perf: playwriter session start failed — Chrome/extension offline?"
  exit 0
fi

echo "bing-ai-perf: session=$SID — navigating to $URL"

# Probe + extract Grounding Queries.
# Bing's AI-visibility table is now enriched with per-query columns:
#   Grounding Query | Intent | Topic | Citations | Citation Share
# Extract per-row via Fluent UI's .ms-DetailsRow-cell (one clean value per column)
# rather than regexing the joined row text — the old end-anchored /\d+$/ regex broke
# silently the moment Bing appended the "Citation Share" (%) column.
QUERIES_JSON=$(playwriter -s "$SID" -e "$(cat <<EOF
const p = await context.newPage();
state._aiPage = p;
await p.goto('$URL', { waitUntil: 'domcontentloaded', timeout: 30000 });
// Wait for the virtualized DetailsList rows to actually render (cold load is slow).
await p.waitForSelector('.ms-DetailsRow-cell', { timeout: 25000 }).catch(() => {});
await p.waitForTimeout(2500);
// Grounding Queries is the default tab; just extract
const cells = await p.evaluate(() => {
  const num = (s) => {
    const m = (s || '').replace(/,/g, '').match(/([\d.]+)\s*([KMB]?)/i);
    if (!m) return null;
    let v = parseFloat(m[1]);
    const u = (m[2] || '').toUpperCase();
    if (u === 'K') v *= 1e3; else if (u === 'M') v *= 1e6; else if (u === 'B') v *= 1e9;
    return Math.round(v);
  };
  const rows = Array.from(document.querySelectorAll('.ms-List-cell'));
  return rows.map(r => {
    const c = Array.from(r.querySelectorAll('.ms-DetailsRow-cell'))
      .map(x => (x.innerText || '').replace(/\s+/g, ' ').trim());
    if (c.length < 5 || !c[0]) return null;
    return {
      query: c[0],
      intent: c[1] || null,
      topic: c[2] || null,
      citations: num(c[3]),
      citation_share: parseFloat((c[4] || '').replace('%', '')) || null,
    };
  }).filter(Boolean);
});
console.log(JSON.stringify(cells));
EOF
)" --timeout 45000 2>&1 | sed "s/^\[log\] //" | grep -E "^\[" | tail -1)

if [ -z "$QUERIES_JSON" ] || ! echo "$QUERIES_JSON" | jq empty 2>/dev/null; then
  echo "bing-ai-perf: queries extraction failed (page not logged in? Bing UI changed?)"
  exit 0
fi

# Switch to Pages tab + extract (Page | Citations)
PAGES_JSON=$(playwriter -s "$SID" -e "$(cat <<'EOF'
const p = state._aiPage;
await p.locator('[role=tab]', { hasText: 'Pages' }).first().click();
await p.waitForTimeout(3500);
const cells = await p.evaluate(() => {
  const num = (s) => {
    const m = (s || '').replace(/,/g, '').match(/([\d.]+)\s*([KMB]?)/i);
    if (!m) return null;
    let v = parseFloat(m[1]);
    const u = (m[2] || '').toUpperCase();
    if (u === 'K') v *= 1e3; else if (u === 'M') v *= 1e6; else if (u === 'B') v *= 1e9;
    return Math.round(v);
  };
  const rows = Array.from(document.querySelectorAll('.ms-List-cell'));
  return rows.map(r => {
    const c = Array.from(r.querySelectorAll('.ms-DetailsRow-cell'))
      .map(x => (x.innerText || '').replace(/\s+/g, ' ').trim());
    if (c.length < 2) return null;
    const url = (c[0] || '').match(/https?:\/\/\S+/);
    return url ? { url: url[0], citations: num(c[1]) } : null;
  }).filter(Boolean);
});
console.log(JSON.stringify(cells));
EOF
)" --timeout 30000 2>&1 | sed "s/^\[log\] //" | grep -E "^\[" | tail -1)

if [ -z "$PAGES_JSON" ] || ! echo "$PAGES_JSON" | jq empty 2>/dev/null; then
  echo "bing-ai-perf: pages extraction failed"
  PAGES_JSON="[]"
fi

# Also pull the daily totals from the time-series table (top of page, always rendered)
TOTALS_JSON=$(playwriter -s "$SID" -e "$(cat <<'EOF'
const p = state._aiPage;
// The summary card lives on the Grounding Queries view — switch back from Pages,
// then scroll to the top where the big-number cards render.
await p.locator('[role=tab]', { hasText: 'Grounding Queries' }).first().click().catch(() => {});
await p.waitForTimeout(1500);
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(1000);
const stats = await p.evaluate(() => {
  const num = (s) => {
    const m = (s || '').replace(/,/g, '').match(/([\d.]+)\s*([KMB]?)/i);
    if (!m) return null;
    let v = parseFloat(m[1]);
    const u = (m[2] || '').toUpperCase();
    if (u === 'K') v *= 1e3; else if (u === 'M') v *= 1e6; else if (u === 'B') v *= 1e9;
    return Math.round(v);
  };
  // The summary card renders the big numbers (e.g. "2.5K") in a sibling of the label,
  // with an info-icon glyph between label and value. Find the smallest element holding
  // BOTH labels, then bridge label→value with [^\d]* (the body-text regex grabs a stray
  // chart-axis "6" instead). Values are K/M-formatted, so parse the suffix.
  let card = null;
  for (const el of document.querySelectorAll('div, section')) {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (/Total Citations/i.test(t) && /Cited Pages/i.test(t)) {
      if (card === null || t.length < card.length) card = t;
    }
  }
  const totalMatch = card ? card.match(/Total Citations[^\d]*([\d.,]+\s*[KMB]?)/i) : null;
  const avgMatch = card ? card.match(/Cited Pages[^\d]*([\d.,]+\s*[KMB]?)/i) : null;
  return {
    total_citations: totalMatch ? num(totalMatch[1]) : null,
    avg_cited_pages: avgMatch ? num(avgMatch[1]) : null
  };
});
console.log(JSON.stringify(stats));
EOF
)" --timeout 12000 2>&1 | sed "s/^\[log\] //" | grep -E "^\{" | tail -1)

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
