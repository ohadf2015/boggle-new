#!/usr/bin/env bash
# Patches native platform files for AdMob after `npx cap sync`.
# Run after every cap sync to keep GADApplicationIdentifier in Info.plist.
# ios/ is gitignored — this script is the source of truth for AdMob native config.
set -euo pipefail

cd "$(dirname "$0")/.."

ADMOB_APP_ID_IOS="${ADMOB_APP_ID_IOS:-ca-app-pub-3940256099942544~1458002511}"
PLIST="ios/App/App/Info.plist"

if [ ! -f "$PLIST" ]; then
  echo "patch-native-admob: $PLIST not found — run 'npx cap add ios' first" >&2
  exit 0  # non-fatal: ios not added yet
fi

# PlistBuddy is idempotent: Add fails if key exists, so suppress and Set instead
if /usr/libexec/PlistBuddy -c "Add :GADApplicationIdentifier string $ADMOB_APP_ID_IOS" "$PLIST" 2>/dev/null; then
  echo "patch-native-admob: ✓ Added GADApplicationIdentifier to $PLIST"
else
  /usr/libexec/PlistBuddy -c "Set :GADApplicationIdentifier $ADMOB_APP_ID_IOS" "$PLIST"
  echo "patch-native-admob: ✓ Updated GADApplicationIdentifier in $PLIST"
fi
