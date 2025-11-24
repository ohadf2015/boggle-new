#!/bin/bash

# Build script with BuildKit fallback handling
# This script attempts to build the Docker image with multiple strategies

set -e

echo "🔨 Starting Boggle Game build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to build with docker-compose (most reliable)
build_with_compose() {
    echo -e "${YELLOW}Attempting build with docker-compose...${NC}"
    if command -v docker-compose &> /dev/null; then
        docker-compose build boggle-app
        return $?
    else
        echo -e "${RED}docker-compose not found${NC}"
        return 1
    fi
}

# Function to build with Docker built-in BuildKit
build_with_docker_buildkit() {
    echo -e "${YELLOW}Attempting build with Docker built-in BuildKit...${NC}"
    DOCKER_BUILDKIT=1 docker build -t boggle-game:latest .
    return $?
}

# Function to build with legacy Docker builder
build_with_legacy() {
    echo -e "${YELLOW}Attempting build with legacy Docker builder...${NC}"
    DOCKER_BUILDKIT=0 docker build -t boggle-game:latest .
    return $?
}

# Function to build without Docker (direct npm build)
build_without_docker() {
    echo -e "${YELLOW}Building without Docker (npm build)...${NC}"
    cd fe-next
    npm install
    npm run build
    cd ..
    return $?
}

# Try build strategies in order of preference
if build_with_compose; then
    echo -e "${GREEN}✅ Build successful with docker-compose${NC}"
    exit 0
fi

if build_with_docker_buildkit; then
    echo -e "${GREEN}✅ Build successful with Docker BuildKit${NC}"
    exit 0
fi

if build_with_legacy; then
    echo -e "${GREEN}✅ Build successful with legacy Docker builder${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  Docker builds failed. Trying direct npm build...${NC}"
if build_without_docker; then
    echo -e "${GREEN}✅ Build successful with npm${NC}"
    echo -e "${YELLOW}Note: This only builds the application, not the Docker image.${NC}"
    exit 0
fi

echo -e "${RED}❌ All build strategies failed${NC}"
echo ""
echo "Troubleshooting steps:"
echo "1. Ensure Docker daemon is running: systemctl status docker"
echo "2. Check Docker version: docker --version"
echo "3. Try restarting Docker: sudo systemctl restart docker"
echo "4. Check BuildKit status: docker buildx ls"
echo "5. For direct npm build, ensure Node.js 20+ is installed"
exit 1
