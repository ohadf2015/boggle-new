#!/bin/bash
# build-ios.sh - Build iOS app
# Usage: ./scripts/mobile/build-ios.sh [--release]
#
# Prerequisites:
#   - Xcode installed
#   - Apple Developer account configured
#   - Provisioning profiles set up
#
# Environment variables:
#   APPLE_TEAM_ID - Your Apple Developer Team ID (required for signing)

set -e

RELEASE_MODE=false
if [[ "$1" == "--release" ]]; then
    RELEASE_MODE=true
fi

echo "=== LexiClash iOS Build ==="
echo "Mode: $([ "$RELEASE_MODE" = true ] && echo 'RELEASE' || echo 'DEBUG')"
echo ""

# Check prerequisites
if ! command -v xcodebuild &> /dev/null; then
    echo "Error: Xcode not installed. Please install Xcode from the App Store."
    exit 1
fi

# Check if iOS project exists
if [ ! -d "ios" ]; then
    echo "Error: iOS project not found. Run 'npx cap add ios' first."
    exit 1
fi

# Sync assets first
echo "Syncing web assets..."
npx cap sync ios

# Open Xcode (for manual build) or build from command line
if [ "$RELEASE_MODE" = true ]; then
    echo ""
    echo "Building iOS app for release..."

    # Check for team ID
    if [ -z "$APPLE_TEAM_ID" ]; then
        echo "Warning: APPLE_TEAM_ID not set. Signing may fail."
        echo "Set it with: export APPLE_TEAM_ID='your-team-id'"
    fi

    cd ios/App

    # Build archive
    xcodebuild -workspace App.xcworkspace \
        -scheme App \
        -configuration Release \
        -archivePath build/LexiClash.xcarchive \
        archive \
        CODE_SIGN_STYLE="Automatic" \
        ${APPLE_TEAM_ID:+DEVELOPMENT_TEAM="$APPLE_TEAM_ID"}

    echo ""
    echo "=== Archive Created ==="
    echo "Location: ios/App/build/LexiClash.xcarchive"
    echo ""
    echo "To create IPA for App Store:"
    echo "  1. Open ios/App/App.xcworkspace in Xcode"
    echo "  2. Product -> Archive"
    echo "  3. Distribute App -> App Store Connect"

    cd ../..
else
    echo ""
    echo "Opening Xcode for development build..."
    echo ""
    echo "In Xcode:"
    echo "  1. Select your device/simulator"
    echo "  2. Click Run (Cmd+R)"
    echo ""

    npx cap open ios
fi

echo ""
echo "=== iOS Build Complete ==="
