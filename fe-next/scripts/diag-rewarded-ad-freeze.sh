#!/usr/bin/env bash
#
# diag-rewarded-ad-freeze.sh
# ---------------------------------------------------------------------------
# Decisive on-device test for the "Reward in X seconds" countdown FREEZE in the
# native AdMob rewarded ad. Our JS renders no countdown — the frozen one is
# Google's SDK UI — so the only way to pick the real cause is one logcat capture
# while it freezes. This script captures + auto-classifies into the 3 branches:
#
#   1. MAIN-THREAD CONTENTION / ANR  -> fix = native WebView.onPause() during ad
#                                       (needs an AAB release). Real code fix.
#   2. VIDEO BUFFERING               -> NOT a code bug (network / bad creative).
#   3. GMA / AdActivity SDK ERROR    -> upstream / plugin issue.
#
# Usage:
#   bash fe-next/scripts/diag-rewarded-ad-freeze.sh
#   ...then on the device: trigger a rewarded ad, let the countdown FREEZE,
#   wait ~5s, then press Ctrl-C here. A verdict prints automatically.
# ---------------------------------------------------------------------------
set -uo pipefail

PKG="${LEXI_PKG:-live.lexiclash.app}"
OUT="${TMPDIR:-/tmp}/rewarded-freeze-$(date +%Y%m%d-%H%M%S).log"

# --- locate adb -----------------------------------------------------------
ADB="$(command -v adb || true)"
for cand in "$HOME/Library/Android/sdk/platform-tools/adb" \
            "$HOME/Android/Sdk/platform-tools/adb"; do
  [ -z "$ADB" ] && [ -x "$cand" ] && ADB="$cand"
done
if [ -z "$ADB" ]; then
  echo "❌ adb not found. Install platform-tools or set PATH." >&2
  exit 1
fi

# --- require exactly one device -------------------------------------------
DEVICES="$("$ADB" devices | awk 'NR>1 && $2=="device"{print $1}')"
COUNT="$(printf '%s\n' "$DEVICES" | grep -c . || true)"
if [ "$COUNT" -eq 0 ]; then
  echo "❌ No device/emulator. Plug in a device (USB debugging on) or boot an emulator, then re-run." >&2
  echo "   Check with: $ADB devices" >&2
  exit 1
fi
if [ "$COUNT" -gt 1 ]; then
  echo "⚠️  Multiple devices. Set the target: export ANDROID_SERIAL=<serial>" >&2
  echo "$DEVICES" >&2
  exit 1
fi

echo "📱 Device: $DEVICES   App: $PKG"
echo "🧹 Clearing logcat buffer..."
"$ADB" logcat -c 2>/dev/null || true

cat <<'EOF'

────────────────────────────────────────────────────────────
  NOW, on the device:
   1. Open LexiClash and trigger a rewarded ad
      (e.g. "watch +30s" / "watch to reveal" / double-gold).
   2. Let the "Reward in X seconds" countdown FREEZE.
   3. Wait ~5 seconds while it's frozen.
   4. Come back here and press Ctrl-C.
────────────────────────────────────────────────────────────

Capturing decisive lines (also saved to the log file)…

EOF
echo "→ log file: $OUT"
echo

# Broad-but-relevant filter. Kept wide so we don't miss the signature; the
# classifier below decides the verdict. -v time gives wall-clock timestamps.
FILTER='Choreographer|Skipped [0-9]+ frames|Davey|ANR in|Long monitor contention|Input dispatching timed out|ExoPlayer|MediaCodec|buffering|BufferingState|Ads|GMA|AdActivity|com.google.android.gms.ads|rewarded|Reward|InterstitialAd|WebView|chromium'

classify() {
  echo
  echo "════════════════════════ VERDICT ════════════════════════"
  if [ ! -s "$OUT" ]; then
    echo "No matching log lines captured. Either the ad didn't start, the app"
    echo "logs to a different tag, or the device filtered them. Re-run and make"
    echo "sure the ad actually appeared. Full raw capture: $OUT"
    echo "Fallback (capture everything for 30s):"
    echo "  $ADB logcat -v time > $OUT"
    return
  fi

  c_contention=$(grep -icE 'Choreographer|Skipped [0-9]+ frames|Davey|ANR in|Long monitor contention|Input dispatching timed out' "$OUT" || true)
  c_buffer=$(grep -icE 'ExoPlayer|MediaCodec|buffering|BufferingState' "$OUT" || true)
  c_gma=$(grep -icE 'GMA|AdActivity|com\.google\.android\.gms\.ads|rewarded|InterstitialAd' "$OUT" || true)
  c_gma_err=$(grep -icE '(GMA|AdActivity|gms\.ads).*(error|fail|exception|timeout|anr)' "$OUT" || true)

  echo "signal counts →  contention/ANR: $c_contention   buffering: $c_buffer   GMA/Ads: $c_gma (errors: $c_gma_err)"
  echo

  # Contention is the strongest, most-actionable signal — check first.
  if [ "$c_contention" -gt 0 ]; then
    echo "🟥 BRANCH 1 — MAIN-THREAD CONTENTION / ANR detected."
    echo "   The app's main thread is starved while the ad is up (skipped frames"
    echo "   / ANR). The native ad's countdown runs on that same UI thread, so it"
    echo "   freezes."
    echo "   → FIX: pause the WebView (webView.onPause()) when the rewarded ad"
    echo "     shows, resume on dismiss — IN NATIVE before forwarding the reward"
    echo "     event to JS. Needs an AAB release. THIS is a real code fix."
    echo
    echo "   Top contention lines:"
    grep -inE 'Choreographer|Skipped [0-9]+ frames|Davey|ANR in|Long monitor contention' "$OUT" | head -8
  elif [ "$c_gma_err" -gt 0 ]; then
    echo "🟦 BRANCH 3 — GMA / AdActivity SDK ERROR detected."
    echo "   Google Mobile Ads SDK / AdActivity is erroring while the ad is up."
    echo "   → FIX: upstream — file with @capacitor-community/admob (8.0.0 is"
    echo "     latest, no dismiss-rewarded API) or Google Mobile Ads. Not JS."
    echo
    echo "   Top GMA/Ads error lines:"
    grep -inE '(GMA|AdActivity|gms\.ads).*(error|fail|exception|timeout|anr)' "$OUT" | head -8
  elif [ "$c_buffer" -gt 0 ] && [ "$c_contention" -eq 0 ]; then
    echo "🟨 BRANCH 2 — VIDEO BUFFERING (clean main thread)."
    echo "   The ad VIDEO is stalling (ExoPlayer/MediaCodec buffering), main"
    echo "   thread is fine. The 'Reward in Xs' counter tracks video progress, so"
    echo "   it freezes with the video."
    echo "   → This is NOT a code bug — it's network / a heavy ad creative /"
    echo "     mediation fill. Nothing to fix in our app. Confirm on a faster"
    echo "     network; consider AdMob mediation/creative settings."
    echo
    echo "   Top buffering lines:"
    grep -inE 'ExoPlayer|MediaCodec|buffering|BufferingState' "$OUT" | head -8
  else
    echo "🟪 INCONCLUSIVE — ad lifecycle lines present but no clear stall signature."
    echo "   The ad ran but nothing screamed contention/buffer/SDK-error. Likely"
    echo "   the freeze is a specific creative or a race not surfaced at this log"
    echo "   level. Re-run with verbose ads logging:"
    echo "     $ADB shell setprop debug.ads.logging verbose"
    echo "     $ADB shell setprop log.tag.Ads VERBOSE"
    echo "   then capture again."
    echo
    echo "   Sample of what was captured:"
    grep -inE 'rewarded|AdActivity|Ads' "$OUT" | head -10
  fi
  echo "══════════════════════════════════════════════════════════"
  echo "Full capture saved: $OUT"
  echo "Paste the relevant slice back to Claude to ship the right fix."
}

trap 'classify; exit 0' INT TERM

# Stream: tee to file (raw, with line buffering) and show the same lines live.
# stdbuf keeps it flowing line-by-line; falls back gracefully if absent.
if command -v stdbuf >/dev/null 2>&1; then
  "$ADB" logcat -v time 2>/dev/null | stdbuf -oL grep -iE "$FILTER" | tee "$OUT"
else
  "$ADB" logcat -v time 2>/dev/null | grep --line-buffered -iE "$FILTER" | tee "$OUT"
fi
