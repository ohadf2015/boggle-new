# Boggle Game - Deployment Plan

## Overview
This document outlines the deployment strategy for the multiplayer Boggle game application.

## Architecture

### Stack
- **Frontend**: React 18.2.0 (SPA)
- **Backend**: Node.js with Express and WebSocket
- **Communication**: WebSocket (ws) for real-time multiplayer
- **Styling**: Material-UI, SCSS, Framer Motion

### Structure
```
boggle-new/
├── be/     # Backend server (Express + WebSocket)
├── fe/     # Frontend React application
└── package.json  # Monorepo root
```

## Deployment Options

### Option 1: Single Server Deployment (Recommended for MVP)

**Best for**: Small to medium user base, cost-effective

**Platform Options**:
- **Render.com** (Recommended)
- **Railway.app**
- **Heroku**
- **DigitalOcean App Platform**

**Setup**:
1. Build frontend static files
2. Serve static files from backend
3. Single Node.js process handles both HTTP and WebSocket

**Environment Variables**:
```bash
PORT=3001              # Server port
NODE_ENV=production    # Production mode
```

**Build Commands**:
```bash
# Install dependencies
npm install
cd fe && npm install
cd ../be && npm install

# Build frontend
cd fe && npm run build

# Start server (serves static files + WebSocket)
cd be && npm start
```

**Render Configuration** (`render.yaml`):
```yaml
services:
  - type: web
    name: boggle-game
    env: node
    buildCommand: npm install && cd fe && npm install && npm run build && cd ../be && npm install
    startCommand: cd be && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
```

### Option 2: Separate Frontend/Backend Deployment

**Best for**: Scalability, CDN benefits

**Frontend** (Vercel/Netlify/Cloudflare Pages):
- Build: `cd fe && npm run build`
- Output: `fe/build/`
- Environment: `REACT_APP_WS_URL=wss://your-backend.com`

**Backend** (Render/Railway/Fly.io):
- Build: `cd be && npm install`
- Start: `cd be && npm start`
- Enable WebSocket support

**CORS Configuration** (be/server.js):
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
```

### Option 3: Container Deployment (Docker)

**Best for**: Multi-environment consistency, Kubernetes deployments

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY fe/package*.json ./fe/
COPY be/package*.json ./be/
RUN npm install
RUN cd fe && npm install
RUN cd be && npm install
COPY . .
RUN cd fe && npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/be ./be
COPY --from=builder /app/fe/build ./fe/build
WORKDIR /app/be
EXPOSE 3001
CMD ["node", "server.js"]
```

**Docker Compose** (development):
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
```

## Database Integration (Future Enhancement)

**Current**: In-memory state (lost on restart)
**Recommended**: PostgreSQL or MongoDB

**Why needed**:
- Persistent game history
- User accounts and profiles
- Achievement tracking across games
- Leaderboards
- Game replay functionality

**Migration Path**:
1. Add database (PostgreSQL recommended)
2. Create schema:
   - `users` table
   - `games` table
   - `game_words` table
   - `achievements` table
3. Update handlers to persist to DB
4. Add Redis for active game state (fast)

## Scaling Considerations

### Current Limitations
- Single server instance
- In-memory state (no horizontal scaling)
- No load balancing
- WebSocket sticky sessions required

### Scaling Strategy

**Phase 1** (0-100 concurrent games):
- Single server deployment
- Vertical scaling (increase CPU/RAM)
- Add monitoring (logs, metrics)

**Phase 2** (100-1000 concurrent games):
- Add Redis for shared state
- Multiple server instances
- Load balancer with sticky sessions
- Database for persistence

**Phase 3** (1000+ concurrent games):
- Kubernetes deployment
- Auto-scaling based on load
- Separate WebSocket servers
- CDN for static assets
- Database read replicas

## Monitoring & Logging

**Recommended Tools**:
- **Logging**: Winston or Pino
- **Monitoring**: Datadog, New Relic, or Grafana
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics, Mixpanel

**Key Metrics to Track**:
- Active WebSocket connections
- Games in progress
- Average game duration
- Word submission rate
- Error rates
- Server response times

## Security Considerations

### Current Implementation
- No authentication
- No input validation
- No rate limiting
- No XSS protection

### Security Enhancements Needed
1. **Input Validation**: Sanitize game codes, usernames, words
2. **Rate Limiting**: Prevent spam word submissions
3. **WebSocket Authentication**: Token-based auth
4. **HTTPS/WSS**: Encrypted connections only
5. **CORS**: Restrict allowed origins
6. **Helmet.js**: Security headers
7. **DDoS Protection**: Cloudflare or AWS Shield

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: cd fe && npm install && npm run build
      - run: cd be && npm install
      - name: Deploy to Render
        run: |
          # Trigger Render deploy hook
          curl ${{ secrets.RENDER_DEPLOY_HOOK }}
```

## Environment Setup

### Development
```bash
# Terminal 1: Backend
cd be
npm run dev  # Uses nodemon for hot reload

# Terminal 2: Frontend
cd fe
npm start    # React dev server on port 3000
```

### Production
```bash
# Build frontend
cd fe && npm run build

# Serve from backend
cd ../be && NODE_ENV=production npm start
```

## Performance Optimization

### Frontend
- [x] Code splitting (React.lazy)
- [ ] Image optimization
- [ ] Bundle size analysis (webpack-bundle-analyzer)
- [ ] Service worker for PWA
- [ ] Lazy load components

### Backend
- [ ] WebSocket message compression
- [ ] Response caching
- [ ] Database query optimization
- [ ] Connection pooling

## Backup & Disaster Recovery

**When database is added**:
- Automated daily backups
- Point-in-time recovery
- Backup retention: 30 days
- Test restore procedure monthly

## Cost Estimates

### Render.com (Recommended for Start)
- **Starter Plan**: $7/month
  - 512MB RAM, 0.5 CPU
  - Good for ~50 concurrent games

- **Standard Plan**: $25/month
  - 2GB RAM, 1 CPU
  - Good for ~200 concurrent games

### Scaling Costs
- Database (PostgreSQL): $7-50/month
- Redis: $10-30/month
- Monitoring: $0-100/month
- CDN: $0-20/month

**Total estimated cost**:
- MVP: $7-15/month
- Growth: $50-150/month
- Scale: $200-500/month

## Deployment Checklist

### Pre-Deployment
- [ ] Run tests (`npm test`)
- [ ] Build frontend successfully
- [ ] Test WebSocket connections
- [ ] Verify environment variables
- [ ] Check CORS settings
- [ ] Review security headers
- [ ] Set up error tracking

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Test multiplayer functionality
- [ ] Check mobile responsiveness
- [ ] Verify achievements system
- [ ] Test all game flows
- [ ] Deploy to production
- [ ] Monitor for errors

### Post-Deployment
- [ ] Verify all endpoints accessible
- [ ] Test WebSocket connections
- [ ] Check logs for errors
- [ ] Monitor performance metrics
- [ ] Create first game room
- [ ] Test end-to-end gameplay

## Quick Deploy to Render.com

1. **Create account** at render.com
2. **New Web Service**
3. **Connect GitHub repository**
4. **Configuration**:
   - Build Command: `npm install && cd fe && npm install && npm run build && cd ../be && npm install`
   - Start Command: `cd be && node server.js`
   - Environment: Node
5. **Add Environment Variable**: `NODE_ENV=production`
6. **Deploy**

## Domain & SSL

- Custom domain setup (render.com provides free SSL)
- Example: `boggle.yourdomain.com`
- Automatic HTTPS/WSS upgrade

## Future Enhancements

1. **Progressive Web App (PWA)**: Offline support, installable
2. **Mobile Apps**: React Native wrapper
3. **Internationalization**: Multi-language support (currently Hebrew)
4. **Social Features**: Friend lists, private rooms
5. **Tournaments**: Organized competitions
6. **Word Dictionary API**: Automated validation
7. **Path Validation**: Verify words follow grid adjacency rules
8. **User Accounts**: Save progress, statistics
9. **Replay System**: Review past games
10. **Spectator Mode**: Watch games in progress

## Support & Maintenance

- **Version Control**: Git branches for features
- **Issue Tracking**: GitHub Issues
- **Documentation**: Keep README and DEPLOYMENT.md updated
- **Changelog**: Document all releases
- **User Feedback**: In-app feedback mechanism

## Conclusion

The current application is ready for deployment as an MVP. Start with Option 1 (Single Server on Render.com) for simplicity and cost-effectiveness. As user base grows, migrate to Option 2 or 3 with database integration for persistence and scalability.
