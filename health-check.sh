#!/bin/bash
# Build health check script for Railway deployment
# This script verifies the build environment and dependencies

set -e

echo "=== Build Health Check ==="
echo "Started at: $(date)"

# Check Node.js version
echo ""
echo "Checking Node.js version..."
node --version
npm --version

# Check if fe-next directory exists
echo ""
echo "Checking project structure..."
if [ ! -d "fe-next" ]; then
    echo "ERROR: fe-next directory not found!"
    exit 1
fi
echo "✓ fe-next directory exists"

# Check if package.json exists
if [ ! -f "fe-next/package.json" ]; then
    echo "ERROR: fe-next/package.json not found!"
    exit 1
fi
echo "✓ package.json exists"

# Check available disk space
echo ""
echo "Checking disk space..."
df -h . | tail -1

# Check memory
echo ""
echo "Checking memory..."
free -h 2>/dev/null || echo "Memory info not available"

# Verify environment variables
echo ""
echo "Checking environment variables..."
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-not set}"

# Test npm connectivity
echo ""
echo "Testing npm registry connectivity..."
if npm ping --loglevel=error 2>/dev/null; then
    echo "✓ npm registry is accessible"
else
    echo "⚠ npm registry ping failed (might work anyway)"
fi

echo ""
echo "=== Health Check Complete ==="
echo "Completed at: $(date)"
exit 0
