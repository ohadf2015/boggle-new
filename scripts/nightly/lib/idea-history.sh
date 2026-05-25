#!/bin/bash
# idea-history.sh — anti-repetition ledger for lane 4 (competitor/idea research).
#
# WHY: lane 4 re-pitched the SAME game-mode idea night after night (3 of 4 nights
# = "shareable emoji result card", which the founder had already PASSED via the
# idea:pass Telegram button). The lane never read its own prior pitches or the
# founder's verdicts, so the nightly looked like it "stopped suggesting new ideas".
#
# This prints a tiered, deterministic markdown ledger of ideas already pitched in
# the last N nights, joined to the founder's Telegram verdicts via the SAME hash
# run.sh uses to key the idea buttons (shasum | cut -c1-8 of the `- Top idea:`
# line — see run.sh:680). Lane 4 reads this (via the Bash tool, like reddit-fetch.sh)
# and refuses to re-pitch anything here as "new".
#
# Always exits 0; degrades to a clear empty-state. No external deps (no jq).
# Usage:  PROJECT_DIR=... scripts/nightly/lib/idea-history.sh [days]   (default 7)
set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
DAYS="${1:-7}"
TODAY="${TODAY:-$(date +%Y-%m-%d)}"
REPORTS="$PROJECT_DIR/docs/nightly/reports"
FEEDBACK="$PROJECT_DIR/docs/nightly/feedback"

emit_header() {
  cat <<'HDR'
## CONCEPT FAMILIES ALREADY PITCHED — do NOT re-pitch these as "new"

> **Dedup at the CONCEPT level, not the wording.** Two ideas are the SAME idea
> if their **core mechanic** matches, regardless of which mode or surface they
> target. "Share result card in MP" and "share result card in Daily" are the
> SAME idea (same core mechanic) — not two. If the only difference is the mode
> (MP vs Daily vs Word Tower vs Blast), pick a DIFFERENT mechanic family instead.
HDR
}

# Last N report files by date, excluding today's (which we're writing now).
report_files() {
  ls -1 "$REPORTS"/*.md 2>/dev/null | grep -vE "/${TODAY}\.md$" | sort | tail -n "$DAYS"
}

# Does any feedback callback record a given verdict for hash $1?
verdict_for() { # hash → prints PASS|BUILD|""
  local h="$1"
  [ -d "$FEEDBACK" ] || { echo ""; return; }
  if grep -rqlE "idea:pass:$h([^0-9a-f]|\")" "$FEEDBACK"/*.ndjson 2>/dev/null; then echo "PASS"; return; fi
  if grep -rqlE "idea:build:$h([^0-9a-f]|\")" "$FEEDBACK"/*.ndjson 2>/dev/null; then echo "BUILD"; return; fi
  echo ""
}

FILES=$(report_files)
if [ -z "$FILES" ]; then
  emit_header
  echo
  echo "_No prior ideas on record — propose freely (pick the highest-signal concept from tonight's research)._"
  exit 0
fi

# Collect: hash|date|text  for every `- Top idea:` line in the window.
ROWS=$(mktemp); : > "$ROWS"
IMPROVE=$(mktemp); : > "$IMPROVE"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  date=$(basename "$f" .md)
  # Top-idea one-liners (the idea-button join key).
  while IFS= read -r line; do
    text=${line#- Top idea: }
    [ -n "$text" ] || continue
    h=$(printf '%s\n' "$text" | shasum | cut -c1-8)
    printf '%s|%s|%s\n' "$h" "$date" "$text" >> "$ROWS"
  done < <(grep -E '^- Top idea:' "$f" 2>/dev/null)
  # Existing-mode improvement titles.
  while IFS= read -r t; do
    title=${t#- Title: }
    [ -n "$title" ] && printf '%s (%s)\n' "$title" "$date" >> "$IMPROVE"
  done < <(awk '/^#### Top game-mode improvement idea/{f=1;next} f&&/^- Title:/{print; f=0}' "$f" 2>/dev/null)
done <<< "$FILES"

if [ ! -s "$ROWS" ]; then
  emit_header
  echo
  echo "_No \`- Top idea:\` lines found in the last $DAYS reports — propose freely._"
  rm -f "$ROWS" "$IMPROVE"
  exit 0
fi

# Tier each unique idea (by hash) into PASS / BUILD / no-verdict buckets.
PASSED=$(mktemp); BUILT=$(mktemp); SILENT=$(mktemp); : > "$PASSED"; : > "$BUILT"; : > "$SILENT"
for h in $(cut -d'|' -f1 "$ROWS" | sort -u); do
  text=$(grep "^$h|" "$ROWS" | head -1 | cut -d'|' -f3-)
  count=$(grep -c "^$h|" "$ROWS")
  dates=$(grep "^$h|" "$ROWS" | cut -d'|' -f2 | sort -u | paste -sd, - | sed 's/,/, /g')
  times=$([ "$count" -gt 1 ] && echo " — pitched ${count}× (${dates})" || echo " (${dates})")
  v=$(verdict_for "$h")
  case "$v" in
    PASS)  printf -- '- "%s"%s\n' "$text" "$times" >> "$PASSED" ;;
    BUILD) printf -- '- "%s"%s\n' "$text" "$times" >> "$BUILT"  ;;
    *)     printf -- '- "%s"%s\n' "$text" "$times" >> "$SILENT" ;;
  esac
done

emit_header
if [ -s "$PASSED" ]; then
  echo; echo "### ❌ Founder PASSED — HARD BAN, never resurface (even reworded):"; cat "$PASSED"
fi
if [ -s "$BUILT" ]; then
  echo; echo "### 🔨 Founder said BUILD — in flight; do NOT pitch as new (status note only):"; cat "$BUILT"
fi
if [ -s "$SILENT" ]; then
  echo; echo "### ⏳ Pitched, no verdict — do NOT repeat; if a mechanic here was pitched 2×+, the founder is implicitly ignoring it, drop it:"; cat "$SILENT"
fi
if [ -s "$IMPROVE" ]; then
  echo; echo "### 🎮 Existing-mode improvements already surfaced (don't repeat the same one):"
  sort -u "$IMPROVE" | sed 's/^/- /'
fi
# Mode-card feedback (mode:keep/drop/tweak/promote:<slug>) — what the founder
# thinks of modes already shipped, so lane 4 doesn't re-suggest a dropped one.
if [ -d "$FEEDBACK" ]; then
  modes=$(grep -rhoE 'mode:(keep|drop|tweak|promote):[a-z0-9-]+' "$FEEDBACK"/*.ndjson 2>/dev/null | sort -u)
  if [ -n "$modes" ]; then
    echo; echo "### 🕹️ Founder verdicts on shipped modes:"
    printf '%s\n' "$modes" | sed -E 's#mode:([a-z]+):(.*)#- \2 → \1#'
  fi
fi

rm -f "$ROWS" "$IMPROVE" "$PASSED" "$BUILT" "$SILENT"
exit 0
