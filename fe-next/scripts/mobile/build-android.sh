#!/bin/bash
# build-android.sh - Build Android app
# Usage: ./scripts/mobile/build-android.sh [--release]
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

set -e

RELEASE_MODE=false
if [[ "$1" == "--release" ]]; then
    RELEASE_MODE=true
fi

echo "=== LexiClash Android Build ==="
echo "Mode: $([ "$RELEASE_MODE" = true ] && echo 'RELEASE' || echo 'DEBUG')"
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

if [ "$RELEASE_MODE" = true ]; then
    echo ""
    echo "Building Android app for release..."

    # Check for signing config
    if [ -z "$ANDROID_KEYSTORE_PATH" ]; then
        echo "Warning: Signing config not set. Building unsigned APK."
        echo ""
        echo "For signed release, set environment variables:"
        echo "  export ANDROID_KEYSTORE_PATH='/path/to/keystore'"
        echo "  export ANDROID_KEYSTORE_PASSWORD='your-password'"
        echo "  export ANDROID_KEY_ALIAS='your-alias'"
        echo "  export ANDROID_KEY_PASSWORD='your-password'"
        echo ""

        # Build unsigned release APK
        ./gradlew assembleRelease
    else
        # Build signed release APK
        ./gradlew assembleRelease \
            -Pandroid.injected.signing.store.file="$ANDROID_KEYSTORE_PATH" \
            -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASSWORD" \
            -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
            -Pandroid.injected.signing.key.password="$ANDROID_KEY_PASSWORD"
    fi

    echo ""
    echo "=== APK Created ==="
    echo "Location: android/app/build/outputs/apk/release/"
    echo ""
    echo "For Play Store, build AAB instead:"
    echo "  ./gradlew bundleRelease"

else
    echo ""
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
