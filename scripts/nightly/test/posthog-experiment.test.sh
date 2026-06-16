#!/bin/bash
# Unit test for posthog-experiment.sh — the idempotent PostHog experiment-flag creator.
# Drives the real functions with a FAKE curl (POSTHOG_CURL seam) so create/idempotency/
# payload are proven OFFLINE — no network, deterministic.
# Run: bash scripts/nightly/test/posthog-experiment.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi; }

ROOT=$(mktemp -d -t phexp.XXXXXX)
BIN="$ROOT/bin"; mkdir -p "$BIN"

# Fake curl: GET /feature_flags/ → a list whose membership is driven by FAKE_EXISTING
# (space-separated keys). POST → echo a created flag object with a numeric id, and
# RECORD the POST body to $ROOT/last-post-body so we can assert the payload that was sent.
cat > "$BIN/fake-curl" <<'STUB'
#!/bin/bash
is_post=0; body=""
while [ $# -gt 0 ]; do
  case "$1" in
    -X) [ "$2" = "POST" ] && is_post=1; shift 2;;
    -d) body="$2"; shift 2;;
    *) shift;;
  esac
done
if [ "$is_post" = "1" ]; then
  printf '%s' "$body" > "$FAKE_POST_BODY_FILE"
  echo '{"id":4242,"key":"'"$(printf '%s' "$body" | jq -r '.key')"'","active":true}'
else
  # GET list — build results from FAKE_EXISTING
  arr='[]'
  for k in ${FAKE_EXISTING:-}; do arr=$(echo "$arr" | jq --arg k "$k" '. + [{key:$k,id:1,active:true}]'); done
  echo "{\"results\":$arr}"
fi
STUB
chmod +x "$BIN/fake-curl"

export POSTHOG_CURL="$BIN/fake-curl"
export POSTHOG_PERSONAL_API_KEY="phx_test" POSTHOG_PROJECT_ID="151059" POSTHOG_HOST="https://eu.posthog.com"
export FAKE_POST_BODY_FILE="$ROOT/last-post-body"
SH="$HERE/../lib/posthog-experiment.sh"

echo "── posthog-experiment: payload builder (pure, no network) ──"
P=$(bash "$SH" payload exp-mp-quickplay-wait-v1 control match-seeking "Quick Play overlay")
assert "payload key is the flag key"                "[ \"\$(echo '$P' | jq -r '.key')\" = exp-mp-quickplay-wait-v1 ]"
assert "payload active=true"                        "[ \"\$(echo '$P' | jq -r '.active')\" = true ]"
assert "payload continuity=false (mirrors proven live flags)" "[ \"\$(echo '$P' | jq -r '.ensure_experience_continuity')\" = false ]"
assert "payload rolled out to 100%"                 "[ \"\$(echo '$P' | jq -r '.filters.groups[0].rollout_percentage')\" = 100 ]"
assert "payload has exactly 2 multivariate variants" "[ \"\$(echo '$P' | jq '.filters.multivariate.variants | length')\" = 2 ]"
assert "variant A = control @ 50"                   "[ \"\$(echo '$P' | jq -r '.filters.multivariate.variants[0] | .key+\":\"+(.rollout_percentage|tostring)')\" = control:50 ]"
assert "variant B = match-seeking @ 50"             "[ \"\$(echo '$P' | jq -r '.filters.multivariate.variants[1] | .key+\":\"+(.rollout_percentage|tostring)')\" = match-seeking:50 ]"
assert "variants sum to 100"                        "[ \"\$(echo '$P' | jq '[.filters.multivariate.variants[].rollout_percentage] | add')\" = 100 ]"

echo "── posthog-experiment: exists check ──"
FAKE_EXISTING="exp-already-there other-flag"
assert "exists=yes when key present"  "[ \"\$(FAKE_EXISTING='exp-already-there other-flag' bash '$SH' exists exp-already-there)\" = yes ]"
assert "exists=no when key absent"    "[ \"\$(FAKE_EXISTING='other-flag' bash '$SH' exists exp-missing)\" = no ]"

echo "── posthog-experiment: ensure is idempotent (no duplicate create) ──"
rm -f "$FAKE_POST_BODY_FILE"
OUT_EXIST=$(FAKE_EXISTING='exp-dupe' bash "$SH" ensure exp-dupe control test "desc")
assert "existing key → status exists"         'printf "%s" "$OUT_EXIST" | grep -q exists'
assert "existing key → NO POST body written"  "[ ! -f \"$FAKE_POST_BODY_FILE\" ]"

echo "── posthog-experiment: ensure creates a missing flag ──"
rm -f "$FAKE_POST_BODY_FILE"
OUT_NEW=$(FAKE_EXISTING='unrelated' bash "$SH" ensure exp-game-abandon-confirm-v1 control stats-shown "Quit-confirm stats")
assert "missing key → status created"     'printf "%s" "$OUT_NEW" | grep -q created'
assert "missing key → returns the new id"  'printf "%s" "$OUT_NEW" | grep -q 4242'
assert "create POST body was sent"         "[ -f \"$FAKE_POST_BODY_FILE\" ]"
assert "  …POST key correct"               "[ \"\$(jq -r '.key' \"$FAKE_POST_BODY_FILE\")\" = exp-game-abandon-confirm-v1 ]"
assert "  …POST variants are control+stats-shown" "[ \"\$(jq -r '[.filters.multivariate.variants[].key]|join(\",\")' \"$FAKE_POST_BODY_FILE\")\" = control,stats-shown ]"

echo "── posthog-experiment: guards ──"
assert "missing args → error (no crash)"   "[[ \"\$(bash '$SH' ensure exp-x control)\" == *error* ]]"
assert "unset key env → error"             "[[ \"\$(POSTHOG_PERSONAL_API_KEY= bash '$SH' exists exp-x)\" == *error* ]]"

rm -rf "$ROOT"
echo
echo "──────────────────────────────────────────"
echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✓" || echo "FAILURES ✗"
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
