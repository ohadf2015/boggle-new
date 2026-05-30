#!/bin/bash
# pull-revenue-snapshot.sh — capture real revenue numbers from the AdMob, AdSense, and
# Play Console UIs via Playwriter (the founder's logged-in Chrome session).
#
# WHY interactive (not in the 00:00 run): these consoles have NO unattended revenue API
# (Play Developer API exposes installs/crashes but NOT revenue; AdMob/AdSense need GCP
# OAuth the founder must provision). Playwriter drives the REAL logged-in session, so it
# only works while Chrome + the extension are connected. Run it yourself, or from a
# DAYTIME cron when you're logged in — NOT at midnight.
#
# Writes docs/nightly/intel/revenue-latest.json. The unattended collector
# (lib/intel/collect-revenue.sh) reads that file on the next nightly run and flags it
# stale if old. Skips-gracefully (exit 0, no file overwrite) if the extension is offline
# or a console isn't logged in — mirrors lib/bing-ai-perf-scrape.sh exactly.
#
# Best-effort by design: console DOM changes will degrade individual sections to null,
# never crash the script. Verify the numbers in the JSON before trusting them.

set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
OUT="$PROJECT_DIR/docs/nightly/intel/revenue-latest.json"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
mkdir -p "$(dirname "$OUT")"

if ! command -v playwriter >/dev/null 2>&1; then
  echo "revenue-snapshot: playwriter CLI not found — skipping (install: npm i -g playwriter@latest)"
  exit 0
fi

SID=$(playwriter session new 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tr -d '[:space:]')
if [ -z "$SID" ] || ! [[ "$SID" =~ ^[0-9]+$ ]]; then
  echo "revenue-snapshot: playwriter session start failed — Chrome/extension offline? Skipping."
  exit 0
fi
echo "revenue-snapshot: session=$SID"

# --- AdMob estimated earnings (apps.admob.com home) ---------------------------------
ADMOB_JSON=$(playwriter -s "$SID" -e "$(cat <<'EOF'
const p = await context.newPage();
state._rp = p;
await p.goto('https://apps.admob.com/v2/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const txt = (document.body.innerText || '').replace(/ /g, ' ');
  const money = (re) => { const m = txt.match(re); return m ? parseFloat(m[1].replace(/,/g, '')) : null; };
  return {
    estimated_earnings_usd_7d: money(/Est(?:imated)?\.?\s*earnings[^$]*\$\s*([\d,]+(?:\.\d+)?)/i),
    ecpm_usd: money(/eCPM[^$]*\$\s*([\d,]+(?:\.\d+)?)/i),
    impressions_7d: (() => { const m = txt.match(/Impressions\s*([\d,]+)/i); return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0; })()
  };
});
console.log(JSON.stringify(r));
EOF
)" --timeout 45000 2>&1 | grep -E "^\{" | tail -1)
echo "$ADMOB_JSON" | jq empty 2>/dev/null || ADMOB_JSON='{}'

# --- AdSense status + earnings (adsense home) ---------------------------------------
ADSENSE_JSON=$(playwriter -s "$SID" -e "$(cat <<'EOF'
const p = state._rp;
await p.goto('https://www.google.com/adsense/new/u/0/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const txt = (document.body.innerText || '').replace(/ /g, ' ');
  let status = 'unknown';
  if (/needs attention|not approved|getting ready|review|rejected/i.test(txt)) status = 'pending';
  if (/your account is (?:active|ready)|approved/i.test(txt)) status = 'approved';
  const m = txt.match(/(?:Estimated earnings|This month)[^$]*\$\s*([\d,]+(?:\.\d+)?)/i);
  return { status, estimated_earnings_usd_7d: m ? parseFloat(m[1].replace(/,/g, '')) : 0 };
});
console.log(JSON.stringify(r));
EOF
)" --timeout 40000 2>&1 | grep -E "^\{" | tail -1)
echo "$ADSENSE_JSON" | jq empty 2>/dev/null || ADSENSE_JSON='{"status":"unknown","estimated_earnings_usd_7d":0}'

# --- Play Console installs (no revenue via UI scrape here; installs = ad reach) ------
# Play Console is app-scoped + deeply nested; best-effort dashboard text grab only.
PLAY_JSON=$(playwriter -s "$SID" -e "$(cat <<'EOF'
const p = state._rp;
await p.goto('https://play.google.com/console/u/0/developers', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const txt = (document.body.innerText || '').replace(/ /g, ' ');
  const installs = txt.match(/([\d,]+)\s*(?:installs|new installs)/i);
  const devices = txt.match(/([\d,]+)\s*active devices/i);
  return {
    installs_30d: installs ? parseInt(installs[1].replace(/,/g, ''), 10) : null,
    active_devices: devices ? parseInt(devices[1].replace(/,/g, ''), 10) : 0
  };
});
console.log(JSON.stringify(r));
EOF
)" --timeout 40000 2>&1 | grep -E "^\{" | tail -1)
echo "$PLAY_JSON" | jq empty 2>/dev/null || PLAY_JSON='{}'

# --- compose snapshot ---------------------------------------------------------------
jq -n \
  --arg ts "$NOW" \
  --argjson admob "$ADMOB_JSON" \
  --argjson adsense "$ADSENSE_JSON" \
  --argjson play "$PLAY_JSON" \
  '{captured_at:$ts, source:"playwriter-revenue-snapshot", admob:$admob, adsense:$adsense, play:$play}' \
  > "$OUT"

echo "revenue-snapshot: wrote $OUT"
jq '{captured_at, admob, adsense, play}' "$OUT" 2>/dev/null || cat "$OUT"
echo "revenue-snapshot: verify these numbers against the consoles before trusting them."
