#!/bin/bash
# build-android.sh - Build Android app
# Usage: ./scripts/mobile/build-android.sh [--release] [--aab]
#
# Flags:
#   --release  Build release variant (default: debug)
#   --aab      Build Android App Bundle for Play Store (implies --release)
#
# Prerequisites:
#   - Android Studio installed
#   - Android SDK configured
#   - For release: keystore configured
#
# Environment variables:
#   ANDROID_KEYSTORE_PATH - Path to keystore file
#   ANDROID_KEYSTORE_PASSWORD - Keystore password
#   ANDROID_KEY_ALIAS - Key alias
#   ANDROID_KEY_PASSWORD - Key password
#   VERSION_CODE - Play Store version code (must increment per upload)
#   VERSION_NAME - Semver display version (e.g., 1.0.0)

set -e

RELEASE_MODE=false
AAB_MODE=false
for arg in "$@"; do
    case "$arg" in
        --release) RELEASE_MODE=true ;;
        --aab) AAB_MODE=true; RELEASE_MODE=true ;;
    esac
done

BUILD_TYPE="DEBUG"
[ "$AAB_MODE" = true ] && BUILD_TYPE="RELEASE (AAB - Play Store)" || [ "$RELEASE_MODE" = true ] && BUILD_TYPE="RELEASE (APK)"

echo "=== LexiClash Android Build ==="
echo "Mode: $BUILD_TYPE"
[ -n "$VERSION_CODE" ] && echo "Version Code: $VERSION_CODE"
[ -n "$VERSION_NAME" ] && echo "Version Name: $VERSION_NAME"
echo ""

# Check if Android project exists
if [ ! -d "android" ]; then
    echo "Error: Android project not found. Run 'npx cap add android' first."
    exit 1
fi

# Sync assets first
echo "Syncing web assets..."
npx cap sync android

cd android

SIGNING_ARGS=""
if [ "$RELEASE_MODE" = true ]; then
    if [ -z "$ANDROID_KEYSTORE_PATH" ]; then
        echo "Warning: Signing config not set. Building unsigned."
        echo ""
        echo "For signed release, set environment variables:"
        echo "  export ANDROID_KEYSTORE_PATH='/path/to/keystore'"
        echo "  export ANDROID_KEYSTORE_PASSWORD='your-password'"
        echo "  export ANDROID_KEY_ALIAS='your-alias'"
        echo "  export ANDROID_KEY_PASSWORD='your-password'"
        echo ""
    else
        SIGNING_ARGS="-Pandroid.injected.signing.store.file=$ANDROID_KEYSTORE_PATH \
            -Pandroid.injected.signing.store.password=$ANDROID_KEYSTORE_PASSWORD \
            -Pandroid.injected.signing.key.alias=$ANDROID_KEY_ALIAS \
            -Pandroid.injected.signing.key.password=$ANDROID_KEY_PASSWORD"
    fi
fi

if [ "$AAB_MODE" = true ]; then
    echo "Building Android App Bundle (AAB) for Play Store..."
    ./gradlew bundleRelease $SIGNING_ARGS

    echo ""
    echo "=== AAB Created ==="
    echo "Location: android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "Upload this file to Google Play Console."

elif [ "$RELEASE_MODE" = true ]; then
    echo "Building release APK..."
    ./gradlew assembleRelease $SIGNING_ARGS

    echo ""
    echo "=== APK Created ==="
    echo "Location: android/app/build/outputs/apk/release/"
    echo ""
    echo "For Play Store, use --aab flag instead:"
    echo "  npm run mobile:android:play"

else
    echo "Building debug APK..."
    ./gradlew assembleDebug

    echo ""
    echo "=== Debug APK Created ==="
    echo "Location: android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "To install on connected device:"
    echo "  adb install android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "Or open Android Studio:"
    echo "  npx cap open android"
fi

cd ..

echo ""
echo "=== Android Build Complete ==="
