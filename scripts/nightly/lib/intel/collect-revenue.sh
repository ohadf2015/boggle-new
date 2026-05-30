#!/bin/bash
# Collector: Monetization / Revenue → normalized intel signals (spec §C). REST + file.
#
# Revenue is a MAIN nightly goal. This collector feeds the brief so Lane 09
# (and, via the standing-priority preamble, every lane) can act on real money data.
#
# Sources, best-to-none (any one is enough; degrades to stale_fallback if NONE):
#   1. Revenue snapshot file  docs/nightly/intel/revenue-latest.json
#      — written by the INTERACTIVE Playwriter scraper (lib/pull-revenue-snapshot.sh),
#        which the founder runs while logged in (AdMob/Play/AdSense consoles have no
#        unattended API for revenue). We read it here and flag staleness.
#   2. AdMob Management API (REST) — ONLY if $ADMOB_API_TOKEN is provisioned (user-only
#      GCP OAuth). When absent we emit a one-line "provision token" hint in the note.
#   3. PostHog ad events (rewarded_ad_watched/offered/declined) — reachable with the
#      existing POSTHOG token, so we get ad-engagement signal even with zero revenue API.
#
# All signals route to lane 09-monetization. Pure builders (revenue_snapshot_stale,
# revenue_snapshot_signals, posthog_ad_signal) are unit-tested WITHOUT network by
# test/collect-revenue.test.sh (which sources this with COLLECT_REVENUE_TEST=1 to
# suppress main). NEVER errors — a dead source must not break Phase 0.
#
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=revenue

# --- pure helpers (no network) --------------------------------------------------

# Cross-platform ISO-8601 → epoch seconds (GNU date, then BSD date). Echoes nothing
# on parse failure.
_revenue_epoch_of() {
  local ts="$1"
  date -u -d "$ts" +%s 2>/dev/null \
    || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s 2>/dev/null \
    || true
}

# revenue_snapshot_stale <iso_ts> <max_age_days>
# rc 0 = STALE (older than threshold, missing, or unparseable); rc 1 = fresh.
revenue_snapshot_stale() {
  local ts="${1:-}" max_days="${2:-3}" e now age
  [ -z "$ts" ] && return 0
  e=$(_revenue_epoch_of "$ts"); [ -z "$e" ] && return 0
  now=$(date -u +%s)
  age=$(( (now - e) / 86400 ))
  [ "$age" -ge "$max_days" ] && return 0
  return 1
}

# revenue_snapshot_signals <snapshot_json> → JSON array of signals (lane 09-monetization).
# Honest informational signals; severities are modest constants (a snapshot is context,
# the lane decides what to act on). Reach carries scale (impressions / installs).
revenue_snapshot_signals() {
  local snap="$1" sigs='[]'
  local add; add() { sigs=$(jq -n --argjson a "$sigs" --argjson s "$1" '$a + [$s]'); }

  local earn ecpm imp adsense_status adsense_earn installs devices

  earn=$(jq -r '.admob.estimated_earnings_usd_7d // empty' <<<"$snap" 2>/dev/null)
  ecpm=$(jq -r '.admob.ecpm_usd // empty' <<<"$snap" 2>/dev/null)
  imp=$(jq -r '.admob.impressions_7d // 0' <<<"$snap" 2>/dev/null)
  adsense_status=$(jq -r '.adsense.status // empty' <<<"$snap" 2>/dev/null)
  adsense_earn=$(jq -r '.adsense.estimated_earnings_usd_7d // 0' <<<"$snap" 2>/dev/null)
  installs=$(jq -r '.play.installs_30d // empty' <<<"$snap" 2>/dev/null)
  devices=$(jq -r '.play.active_devices // 0' <<<"$snap" 2>/dev/null)

  if [ -n "$earn" ]; then
    add "$(emit_signal revenue monetization "AdMob est. earnings 7d: \$$earn" \
          admob_earnings_usd_7d "${earn:-0}" "${imp:-0}" 0.5 09-monetization \
          admob_earnings_usd_7d "playwriter-revenue-snapshot" M revenue:admob:earnings7d)"
  fi
  if [ -n "$ecpm" ]; then
    add "$(emit_signal revenue monetization "AdMob eCPM: \$$ecpm" \
          admob_ecpm_usd "${ecpm:-0}" "${imp:-0}" 0.5 09-monetization \
          admob_ecpm_usd "playwriter-revenue-snapshot" M revenue:admob:ecpm)"
  fi
  if [ -n "$adsense_status" ]; then
    # A rejected/pending AdSense status is a revenue BLOCKER → higher attention.
    local asev=0.5
    [ "$adsense_status" != "approved" ] && asev=0.7
    add "$(emit_signal revenue monetization "AdSense status: $adsense_status (web ads blocked until approved)" \
          adsense_status "${adsense_earn:-0}" 0 "$asev" 09-monetization \
          adsense_status "playwriter-revenue-snapshot" M revenue:adsense:status)"
  fi
  if [ -n "$installs" ]; then
    add "$(emit_signal revenue monetization "Play installs 30d: $installs (ad-revenue reach)" \
          play_installs_30d "${installs:-0}" "${devices:-0}" 0.4 09-monetization \
          play_installs_30d "playwriter-revenue-snapshot" M revenue:play:installs30d)"
  fi

  echo "$sigs"
}

# posthog_ad_signal <event_name> <count_24h> <count_7d_avg> → one monetization signal.
# Severity rises when 24h volume drops vs the 7d baseline (ad engagement falling = a
# revenue concern worth a lane look).
posthog_ad_signal() {
  local ev="$1" c24="${2:-0}" avg7="${3:-0}" sev=0.4
  if [ "${avg7%.*}" -gt 0 ] 2>/dev/null && [ "${c24%.*}" -lt "${avg7%.*}" ] 2>/dev/null; then
    sev=0.6
  fi
  emit_signal posthog monetization "Ad event $ev: $c24/24h (7d avg $avg7)" \
    "ad_event_$ev" "${c24:-0}" "${c24:-0}" "$sev" 09-monetization \
    "ad_event_$ev" "posthog" M "revenue:posthog:$ev"
}

# --- main (network; suppressed under COLLECT_REVENUE_TEST=1) ---------------------

main() {
  PROJECT_DIR="${PROJECT_DIR:-$(cd "$HERE/../../../.." && pwd)}"
  local snap_file="$PROJECT_DIR/docs/nightly/intel/revenue-latest.json"
  local admob_token="${ADMOB_API_TOKEN:-}"
  local ph_key="${POSTHOG_PERSONAL_API_KEY:-}" ph_pid="${POSTHOG_PROJECT_ID:-}"
  local ph_host="${POSTHOG_HOST:-https://us.posthog.com}"

  local SIGNALS='[]' have_source=0 note=""
  local add addmany
  add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }
  addmany() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + $s'); }

  # 1. Revenue snapshot file (from the interactive Playwriter scraper).
  if [ -f "$snap_file" ] && jq empty "$snap_file" 2>/dev/null; then
    have_source=1
    local snap cap
    snap=$(cat "$snap_file")
    cap=$(jq -r '.captured_at // ""' <<<"$snap" 2>/dev/null)
    if revenue_snapshot_stale "$cap" 3; then
      note="${note}revenue snapshot STALE (captured $cap; re-run lib/pull-revenue-snapshot.sh); "
    fi
    addmany "$(revenue_snapshot_signals "$snap")"
  fi

  # 2. AdMob Management API — best-effort, only when a token is provisioned.
  if [ -n "$admob_token" ]; then
    have_source=1
    local acct rpt
    acct=$(with_timeout 15 curl -sS \
      -H "Authorization: Bearer $admob_token" \
      "https://admob.googleapis.com/v1/accounts" 2>/dev/null \
      | jq -r '.account[0].name // empty' 2>/dev/null)
    if [ -n "$acct" ]; then
      note="${note}admob api: account $acct reachable; "
    else
      note="${note}admob api token set but report fetch failed (check OAuth scope); "
    fi
  else
    note="${note}no ADMOB_API_TOKEN — provision GCP OAuth to auto-pull AdMob revenue unattended; "
  fi

  # 3. PostHog ad-engagement events (existing token).
  if [ -n "$ph_key" ] && [ -n "$ph_pid" ]; then
    local ph_q ph_q7 c24 avg7
    _ph_count() { # <hogql> → scalar first cell, or empty
      with_timeout 25 curl -sS -X POST "$ph_host/api/projects/$ph_pid/query/" \
        -H "Authorization: Bearer $ph_key" -H "Content-Type: application/json" \
        -d "$(jq -n --arg q "$1" '{query:{kind:"HogQLQuery",query:$q}}')" 2>/dev/null \
        | jq -r '.results[0][0] // empty' 2>/dev/null
    }
    ph_q='SELECT count() FROM events WHERE event = '"'"'rewarded_ad_watched'"'"' AND timestamp > now() - INTERVAL 1 DAY'
    ph_q7='SELECT count()/7.0 FROM events WHERE event = '"'"'rewarded_ad_watched'"'"' AND timestamp > now() - INTERVAL 7 DAY'
    c24=$(_ph_count "$ph_q")
    if [ -n "$c24" ]; then
      have_source=1
      # 7-day DAILY average as the baseline so the severity bump (today < baseline) is
      # real, not dead code. Fall back to today's count if the 7d query fails.
      avg7=$(_ph_count "$ph_q7"); [ -z "$avg7" ] && avg7="$c24"
      add "$(posthog_ad_signal rewarded_ad_watched "$c24" "$avg7")"
    fi
  fi

  # No source at all → reuse last-good snapshot (or empty stale), never error.
  if [ "$have_source" -eq 0 ]; then
    stale_fallback "$ID"
    local tmp="$INTEL_DIR/$ID.json.tmp"
    jq --arg n "${note}no live revenue source this run" \
       '._meta.note=$n' "$INTEL_DIR/$ID.json" > "$tmp" 2>/dev/null && mv "$tmp" "$INTEL_DIR/$ID.json"
    echo "collect-revenue: no live source → stale fallback (${note})"
    return 0
  fi

  intel_write "$ID" "$SIGNALS" true "$note"
  echo "collect-revenue: emitted $(echo "$SIGNALS" | jq length) signals (${note})"
}

if [ "${COLLECT_REVENUE_TEST:-}" != "1" ]; then
  main
fi
