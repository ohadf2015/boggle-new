#!/usr/bin/env bash
# End-to-end Android release: web build -> cap sync -> bundleRelease -> fastlane internal.
# Flags:
#   --promote   After upload, promote latest internal build to production.
#   --skip-web  Skip `next build` (use existing .next).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

PROMOTE=0
SKIP_WEB=0
for arg in "$@"; do
  case "$arg" in
    --promote) PROMOTE=1 ;;
    --skip-web) SKIP_WEB=1 ;;
  esac
done

# Play expects the UPLOAD key (SHA1 B8:46:6E:...), not the original release keystore that still
# sits next to it. Defaulting to lexiclash-release.keystore produced AABs Play rejects with
# "signed with the wrong key" — and the failure only shows up at upload, minutes into a release.
#
# The canonical creds live in this file, and it WINS over whatever the shell exports: on 2026-09-13
# a stale `export ANDROID_KEYSTORE_PATH=.../lexiclash-release.keystore` in ~/.zshrc (documented that
# way in RELEASE.md, before PR #918 moved the key) shadowed the default below — `${VAR:=…}` only
# fires when the var is unset — and burned a full web build + bundleRelease on an unshippable AAB.
CREDS="${LEXICLASH_KEYSTORE_CREDS:-$HOME/.config/lexiclash-keystore-creds.env}"
if [[ -f "$CREDS" ]]; then
  set -a; . "$CREDS"; set +a
fi
: "${ANDROID_KEYSTORE_PATH:=$ROOT/android/lexiclash-upload-v2.keystore}"
: "${ANDROID_KEY_ALIAS:?set ANDROID_KEY_ALIAS}"
: "${ANDROID_KEYSTORE_PASSWORD:?set ANDROID_KEYSTORE_PASSWORD}"
: "${ANDROID_KEY_PASSWORD:?set ANDROID_KEY_PASSWORD}"
: "${PLAY_SA_JSON:=$HOME/.config/play-console-sa.json}"

if [[ ! -f "$PLAY_SA_JSON" ]]; then
  echo "ERROR: Play service account JSON missing at $PLAY_SA_JSON" >&2
  echo "One-time setup: Play Console -> Users & permissions -> Invite user with API access, or reuse existing Google Cloud service account with Play Developer API role." >&2
  exit 1
fi
if [[ ! -f "$ANDROID_KEYSTORE_PATH" ]]; then
  echo "ERROR: Keystore missing at $ANDROID_KEYSTORE_PATH" >&2
  exit 1
fi

export VERSION_CODE="${VERSION_CODE:-$(git rev-list --count HEAD)}"
export VERSION_NAME="${VERSION_NAME:-$(node -p "require('./package.json').version")}"
export ANDROID_KEYSTORE_PATH ANDROID_KEY_ALIAS ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD PLAY_SA_JSON

echo "==> versionCode=$VERSION_CODE versionName=$VERSION_NAME"

if [[ "$SKIP_WEB" -eq 0 ]]; then
  echo "==> next build"
  npm run build
fi

echo "==> cap sync android"
npx cap sync android

echo "==> gradle bundleRelease"
pushd android >/dev/null
./gradlew --no-daemon :app:bundleRelease
popd >/dev/null

AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -f "$AAB" ]]; then
  echo "ERROR: AAB not produced at $AAB" >&2
  exit 1
fi
export AAB_PATH="$AAB"

# Signature check BEFORE the upload: Play rejects a wrong-key bundle with
# "The Android App Bundle was signed with the wrong key", but only after supply has spent ~15s
# uploading it, at the end of a 10-minute build. keytool answers the same question in a second.
EXPECTED_SHA1="B8:46:6E:6A:B5:F1:A3:D0:66:7D:9F:64:75:A9:66:82:AA:10:E1:4F"
GOT_SHA1="$(keytool -printcert -jarfile "$AAB" 2>/dev/null | awk '/SHA1:/ {print $2; exit}')"
if [[ "$GOT_SHA1" != "$EXPECTED_SHA1" ]]; then
  echo "ERROR: AAB is signed with the wrong key." >&2
  echo "  found:    ${GOT_SHA1:-<none>}" >&2
  echo "  expected: $EXPECTED_SHA1 (upload key, alias 'upload')" >&2
  echo "  signed with: $ANDROID_KEYSTORE_PATH (alias $ANDROID_KEY_ALIAS)" >&2
  echo "  fix: unset ANDROID_KEYSTORE_PATH/ANDROID_KEY_ALIAS in your shell rc and let $CREDS win." >&2
  exit 1
fi
echo "==> signer OK ($GOT_SHA1)"

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  export RELEASE_NOTES=$(git log "$LAST_TAG"..HEAD --pretty=format:'- %s' | head -50)
else
  export RELEASE_NOTES=$(git log -20 --pretty=format:'- %s')
fi

echo "==> fastlane android internal"
bundle exec fastlane android internal 2>/dev/null || fastlane android internal

if [[ "$PROMOTE" -eq 1 ]]; then
  echo "==> fastlane android promote_to_production"
  bundle exec fastlane android promote_to_production 2>/dev/null || fastlane android promote_to_production
fi

echo "==> verifying assetlinks"
node scripts/verify-assetlinks.mjs || echo "WARN: assetlinks verification failed (non-fatal)"

echo "DONE. Track=internal. versionCode=$VERSION_CODE"
