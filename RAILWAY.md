# Railway Deployment Guide for Boggle Game

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
   npm install && cd fe && npm install && npm run build && cd ../be && npm install
   ```

   **Start Command:**
   ```bash
   cd be && node server.js
   ```

3. **Set Environment Variables:**
   In Railway dashboard → Variables tab:
   ```
   NODE_ENV=production
   PORT=3001
   ```

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
   - Look for: `Server started on http://0.0.0.0:3001/`
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
3. Verify CORS settings if deploying frontend separately

#### Players Disconnected on New Game
**Symptoms:**
- Players get kicked when host starts a new round

**Solutions:**
1. This should be fixed in the latest code
2. Ensure all players have stable connections
3. Check that `resetGame` action is properly handled
4. Verify WebSocket connections remain open

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

## Cost Optimization

### Railway Pricing (as of 2024)
- **Hobby Plan:** $5/month
  - Good for small deployments and testing
  - Limited resources
- **Pro Plan:** $20/month
  - Better for production
  - More resources and scalability

### Redis Costs
- Included in Railway's resource usage
- Minimal cost for small games (<100 concurrent)

### Tips to Reduce Costs
1. Use Railway's sleep/wake for development
2. Optimize Redis storage (current setup already does this with TTL)
3. Monitor usage and scale accordingly

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

### Database Backups (Redis)
Railway doesn't automatically backup Redis. For critical data:
1. Consider upgrading to persistent storage solutions
2. Or implement custom backup logic in your app

## Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use Railway's variable management

2. **CORS:**
   - Set `CORS_ORIGIN` to your frontend domain in production
   - Don't use `*` in production

3. **Rate Limiting:**
   - Consider adding rate limiting for word submissions
   - Prevent abuse and spam

4. **HTTPS/WSS:**
   - Railway automatically provides SSL
   - Always use `wss://` for WebSocket in production

## Troubleshooting

### Check Deployment Status
```bash
railway status
```

### View Logs
```bash
railway logs
```

### Connect to Redis CLI
```bash
railway run redis-cli
```

### Environment Variables
```bash
railway variables
```

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Open an issue in your repository

## Quick Reference Commands

```bash
# Login to Railway
railway login

# Link to project
railway link

# View logs
railway logs

# Open dashboard
railway open

# Deploy
railway up

# View environment variables
railway variables

# Add Redis
railway add --database redis
```

## Production Checklist

- [ ] Redis service added and configured
- [ ] Environment variables set correctly
- [ ] WebSocket connections tested
- [ ] Multiple players tested simultaneously
- [ ] Game reset functionality tested
- [ ] Reconnection logic tested
- [ ] Mobile responsiveness verified
- [ ] Logs checked for errors
- [ ] Domain configured (optional)
- [ ] SSL/TLS working (automatic on Railway)

## Next Steps

After successful deployment:
1. Test thoroughly with multiple players
2. Monitor logs for any errors
3. Set up custom domain (optional)
4. Enable auto-deployments from GitHub
5. Consider adding monitoring/analytics
6. Plan for scaling as user base grows

---

**Questions?** Open an issue on GitHub or check Railway documentation.
