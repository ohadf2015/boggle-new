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

: "${ANDROID_KEYSTORE_PATH:=$ROOT/android/lexiclash-release.keystore}"
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
