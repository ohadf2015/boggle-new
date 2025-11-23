# Railway Deployment Guide for Boggle Game (Next.js)

## Overview
This guide explains how to deploy the Boggle multiplayer word game on Railway.app.

## Prerequisites
- GitHub account with the boggle-new repository
- Railway.app account (sign up at https://railway.app)

## Redis Setup (Important!)

### Why Redis?
While the app can run without Redis using in-memory storage, **Redis is strongly recommended for production** to:
- Persist game state across server restarts
- Enable horizontal scaling with multiple instances
- Prevent data loss when containers restart

### Adding Redis to Railway

1. **In your Railway project dashboard:**
   - Click "New" → "Database" → "Add Redis"
   - Railway will automatically provision a Redis instance

2. **Environment Variables:**
   Railway automatically provides these variables when you add Redis:
   - `REDIS_URL` - Full connection URL

   The app expects these individual variables (add them manually if needed):
   - `REDIS_HOST` - Redis hostname
   - `REDIS_PORT` - Redis port (default: 6379)
   - `REDIS_PASSWORD` - Redis password

3. **Extract variables from REDIS_URL:**
   If Railway only provides `REDIS_URL`, you can extract the individual values:
   ```
   REDIS_URL format: redis://default:PASSWORD@HOST:PORT
   ```

   Set these environment variables in your web service:
   ```
   REDIS_HOST=<host from REDIS_URL>
   REDIS_PORT=<port from REDIS_URL>
   REDIS_PASSWORD=<password from REDIS_URL>
   ```

### Without Redis
The app will work without Redis but will use in-memory storage:
- ⚠️ All game state is lost on restart/redeploy
- ⚠️ Cannot scale horizontally
- ⚠️ Players will be disconnected on each deployment
- ✅ Good for testing and development only

## Deployment Steps

### Method 1: Direct GitHub Deployment (Recommended)

1. **Create New Project on Railway:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `boggle-new` repository

2. **Configure Build Settings:**
   Railway should auto-detect the Node.js app. If not, configure:

   **Build Command:**
   ```bash
   cd fe-next && npm install && npm run build
   ```

   **Start Command:**
   ```bash
   cd fe-next && npm start
   ```

3. **Set Environment Variables:**
   In Railway dashboard → Variables tab:
   ```
   NODE_ENV=production
   PORT=3001
   NEXT_PUBLIC_WS_URL=wss://<your-railway-app-url>
   ```
   *Note: `NEXT_PUBLIC_WS_URL` should point to your deployed app URL with `wss://` protocol.*

4. **Add Redis (Recommended):**
   - Click "New" → "Database" → "Add Redis"
   - Set the Redis environment variables as described above

5. **Deploy:**
   - Railway will automatically build and deploy
   - Get your deployment URL from the dashboard

### Method 2: Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize Project:**
   ```bash
   railway init
   ```

4. **Add Redis:**
   ```bash
   railway add --database redis
   ```

5. **Set Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3001
   ```

6. **Deploy:**
   ```bash
   railway up
   ```

## Environment Variables Reference

### Required
- `NODE_ENV` - Set to `production`
- `PORT` - Application port (Railway automatically provides this, default: 3001)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (e.g., `wss://your-app.up.railway.app`)

### Optional but Recommended
- `REDIS_HOST` - Redis hostname (from Redis service)
- `REDIS_PORT` - Redis port (from Redis service)
- `REDIS_PASSWORD` - Redis password (from Redis service)

### Advanced
- `CORS_ORIGIN` - Allowed CORS origins (default: `*`)
- `HOST` - Bind host (default: `0.0.0.0`)

## Post-Deployment

### Verify Deployment

1. **Check Logs:**
   - Railway Dashboard → Deployments → View Logs
   - Look for: `> Server ready on http://0.0.0.0:3001`
   - If Redis is configured: `[REDIS] Connected to Redis server`
   - Without Redis: `[REDIS] Running without Redis - using in-memory storage only`

2. **Test WebSocket Connection:**
   - Open your Railway app URL
   - Create a game room as host
   - Join from another browser/device
   - Verify real-time communication works

### Common Issues

#### Redis Connection Errors
**Symptoms:**
```
[REDIS] Redis error: connect ECONNREFUSED 127.0.0.1:6379
[REDIS] Running without Redis - using in-memory storage only
```

**Solution:**
1. Verify Redis service is added to your Railway project
2. Check environment variables are correctly set:
   - `REDIS_HOST` should NOT be `127.0.0.1`
   - Should point to Railway's Redis service hostname
3. Restart the web service after adding Redis

#### WebSocket Connection Failed
**Symptoms:**
- Players can't join rooms
- "Connection lost" errors

**Solutions:**
1. Ensure Railway deployment is using WSS (WebSocket Secure)
2. Check Railway logs for WebSocket errors
3. Verify `NEXT_PUBLIC_WS_URL` is set correctly

## Scaling on Railway

### Vertical Scaling
- Increase memory/CPU in Railway dashboard
- Settings → Resources

### Horizontal Scaling (Requires Redis)
1. **Must have Redis configured** for shared state
2. Enable multiple instances in Railway settings
3. Railway's load balancer handles WebSocket sticky sessions automatically

### Monitoring
- **Railway Metrics:** Dashboard shows CPU, Memory, Network
- **Application Logs:** Real-time logs in Railway dashboard
- **Alerts:** Set up alerts for high resource usage

## Maintenance

### Updating the App
Railway auto-deploys on GitHub push (if enabled):
```bash
git add .
git commit -m "Update game features"
git push origin main
```

### Manual Deploy
```bash
railway up
```

### Rolling Back
In Railway dashboard:
- Deployments → Previous deployment → Redeploy
