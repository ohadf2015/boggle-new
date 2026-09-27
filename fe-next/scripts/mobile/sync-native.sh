#!/bin/bash
# sync-native.sh - Sync web assets to native projects
# Usage: ./scripts/mobile/sync-native.sh

set -e

echo "=== Capacitor Native Sync ==="
echo ""

# Check if Capacitor is installed
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js."
    exit 1
fi

# Sync web assets to native projects
echo "Syncing web assets to native projects..."
npx cap sync

echo ""
echo "=== Sync Complete ==="
echo ""
echo "Next steps:"
echo "  iOS:     ./scripts/mobile/build-ios.sh"
echo "  Android: ./scripts/mobile/build-android.sh"
echo ""
