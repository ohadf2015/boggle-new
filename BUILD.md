# Build Documentation

## Fixing BuildKit Connection Errors

If you encounter errors like:
```
bc.Build: failed to solve: frontend grpc server closed unexpectedly
```
or
```
bc.Build: listing workers for Build: failed to list workers: Unavailable: connection error:
desc = "error reading server preface: read unix @->/run/buildkit/buildkitd.sock: use of closed network connection"
```

These indicate Docker/BuildKit is experiencing gRPC server crashes or daemon connection issues. Use the solutions below.

---

## Quick Fix: Use the Build Script

We've created a smart build script that automatically tries multiple build strategies:

```bash
./build.sh
```

This script will attempt (in order):
1. Docker Compose build (most reliable)
2. Docker with built-in BuildKit
3. Docker with legacy builder
4. Direct npm build (fallback)

---

## Manual Build Methods

### Method 1: Docker Compose (Recommended)

```bash
# Production build
docker-compose build boggle-app

# Start the container
docker-compose up boggle-app

# Or build and start in one command
docker-compose up --build boggle-app
```

**Development mode:**
```bash
docker-compose --profile dev up boggle-dev
```

### Method 2: Docker with Built-in BuildKit

```bash
DOCKER_BUILDKIT=1 docker build -t boggle-game:latest .
```

### Method 3: Docker Legacy Builder

If BuildKit continues to cause issues:

```bash
DOCKER_BUILDKIT=0 docker build -t boggle-game:latest .
```

### Method 4: Direct npm Build (No Docker)

```bash
cd fe-next
npm install
npm run build
npm start
```

---

## Understanding the Error

The BuildKit error occurs when:

1. **Docker is configured to use BuildKit** but the daemon isn't running
2. **Standalone BuildKit daemon** is expected but not available
3. **Socket permissions** prevent access to `/run/buildkit/buildkitd.sock`
4. **Network issues** prevent daemon communication

### Why Our Fix Works

Our `docker-compose.yml` uses Docker's **built-in BuildKit** instead of requiring a separate daemon:

- Uses `BUILDKIT_INLINE_CACHE` for caching
- Doesn't require external BuildKit daemon
- Works with standard Docker installations
- Falls back gracefully if BuildKit is unavailable

---

## Troubleshooting

### Check Docker Status
```bash
# Check if Docker is running
systemctl status docker
# or
docker info

# Check Docker version
docker --version
```

### Check BuildKit Status
```bash
# List BuildKit builders
docker buildx ls

# Create a new builder if needed
docker buildx create --use
```

### Restart Docker
```bash
# Linux
sudo systemctl restart docker

# macOS/Windows Docker Desktop
# Restart Docker Desktop application
```

### Enable/Disable BuildKit
```bash
# Enable BuildKit globally (add to ~/.bashrc or ~/.zshrc)
export DOCKER_BUILDKIT=1

# Disable BuildKit globally
export DOCKER_BUILDKIT=0
```

---

## Deployment Platforms

### Render.com

**Current Configuration:** The `render.yaml` is now configured to use Node.js environment directly to avoid BuildKit gRPC server crashes:

```yaml
services:
  - type: web
    name: boggle-game
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
```

**Why this works:** This bypasses Docker/BuildKit entirely and builds the application directly with npm, which is more reliable and faster for Node.js applications on Render.

**Alternative:** If you want to use Docker builds (commented out in `render.yaml`), uncomment the Docker service and comment out the Node.js service. However, this may be prone to BuildKit gRPC errors.

### Railway.app

Railway uses Nixpacks by default (configured in `railway.json`):

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  }
}
```

Railway handles BuildKit automatically - no changes needed.

---

## Build Architecture

### Multi-Stage Dockerfile

Our Dockerfile uses a two-stage build:

1. **Builder Stage**: Installs dependencies and builds Next.js app
2. **Production Stage**: Copies only necessary files for smaller image size

This reduces final image size and improves deployment speed.

### Build Performance

**Optimization tips:**

1. Use `.dockerignore` to exclude unnecessary files
2. Leverage build caching with BuildKit
3. Use `docker-compose` for consistent builds
4. Multi-stage builds keep images lean

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build with Docker Compose
        run: docker-compose build boggle-app

      - name: Run tests
        run: docker-compose run boggle-app npm test
```

### GitLab CI Example

```yaml
build:
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker-compose build boggle-app
```

---

## Environment Variables

Required environment variables for builds:

- `NODE_ENV`: `production` or `development`
- `PORT`: Default `3001`
- `HOST`: Default `0.0.0.0`

Set these in:
- `.env.local` for local development
- Docker Compose `environment` section
- Deployment platform environment settings

---

## Getting Help

If builds continue to fail:

1. Check Docker daemon is running: `docker ps`
2. Verify Docker version: `docker --version` (requires 20.10+)
3. Try the build script: `./build.sh`
4. Check logs: `docker-compose logs`
5. Try direct npm build: `cd fe-next && npm run build`

For deployment issues, check your platform's build logs:
- **Render**: View logs in Render dashboard
- **Railway**: Check deployment logs in Railway dashboard
