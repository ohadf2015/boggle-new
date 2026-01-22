# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Google Vertex AI (Required for Daily Buzz & Word Validation):**
- Service: Google Cloud Vertex AI (Gemini models)
- What it's used for:
  - Word validation (checking if submitted words are valid)
  - Daily challenge generation (creating trend-based word puzzles)
  - Abstract concept image generation (Imagen model)
- SDK/Client: `@google-cloud/vertexai` 1.10.0
- Location: `backend/modules/ai/vertexClient.ts`
- Auth: `GOOGLE_CREDENTIALS_JSON` (service account key as JSON string)
- Config: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (default: us-central1)
- Models used:
  - `gemini-1.5-flash` - Fast validation and challenge generation
  - `gemini-2.0-flash` - Advanced reasoning for complex validation
  - `imagen-3.0-generate-002` - Image generation (neo-brutalist style)

**SERP API (Google Trends - Required for Daily Buzz):**
- Service: SERP API for real-time Google Trends data
- What it's used for: Fetching trending topics for daily challenges
- SDK/Client: Direct REST API calls via axios
- Location: `backend/services/serpApiClient.ts`
- Auth: `SERPAPI_KEY` (free tier: 100 calls/month)
- Endpoints:
  - `https://serpapi.com/search` - Fetch Google Trends
  - Caching: 24-hour Redis cache to minimize API calls

**Anthropic Claude API (Optional/Testing):**
- Service: Claude LLM API
- What it's used for: Potential future word validation or game content generation
- SDK/Client: `@anthropic-ai/sdk` 0.71.2
- Status: Available but not currently active in production
- Location: `backend/modules/ai/` (if needed in future)

**Google Authentication Library:**
- Service: Google OAuth & credential parsing
- What it's used for: Parsing service account JSON credentials for Vertex AI
- SDK/Client: `google-auth-library` 10.5.0
- Location: `backend/modules/ai/vertexClient.ts` (parseGoogleCredentials function)

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Purpose: Primary database for users, games, leaderboards, achievements, stats
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public URL), `SUPABASE_SERVICE_ROLE_KEY` (admin key)
  - Client: `@supabase/supabase-js` 2.86.0 (client) + `@supabase/ssr` 0.8.0 (server-side rendering)
  - Location: `backend/modules/supabaseServer.ts`
  - Tables: profiles, games, leaderboards, achievements, game_sessions, daily_challenges
  - Storage bucket: Avatar images, Daily Buzz images (WebP format)

**File Storage:**
- Supabase Storage (cloud file storage)
  - Purpose: Store avatar images, Daily Buzz challenge images
  - Domain: `hdtmpkicuxvtmvrmtybx.supabase.co/storage/v1/object/public/**`
  - Format: WebP (optimized images, quality 80, effort 6)
  - Image caching: 1-year TTL (31536000s)

**Caching:**
- Redis via ioredis 5.8.2
  - Purpose: Session state, game state, leaderboard cache, word approval voting, rate limiting
  - Connection options:
    - Direct: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
    - URL: `REDIS_URL` (cloud providers: Redis Cloud, Upstash)
    - Azure: `REDISHOST`, `REDISPORT`
  - TTL: `REDIS_GAME_TTL` (default 3600 seconds)
  - Pub/Sub: Via `@socket.io/redis-adapter` for Socket.IO scaling
  - Location: `backend/redis/connection.ts`, `backend/redis/` directory
  - Features: Health monitoring, memory tracking, circuit breaker pattern

## Real-Time Communication

**WebSocket (Socket.IO):**
- Service: Real-time game updates, multiplayer sync, presence tracking
- SDK/Client: `socket.io` 4.8.1 (server), `socket.io-client` 4.8.1 (client)
- Configuration: `NEXT_PUBLIC_WS_URL` (e.g., ws://localhost:3001)
- Adapter: `@socket.io/redis-adapter` 8.3.0 (horizontal scaling with Redis)
- Location:
  - Server: `backend/socketHandlers.ts`
  - Client: `utils/SocketContext.ts`
- Features: Message rate limiting (default 50 msg/10s), correlation IDs, error handling

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built into Supabase)
  - Implementation: Session-based with JWT tokens
  - Sign-up: Email + password (validated via Supabase)
  - Social auth: Google OAuth (optional)
  - Location: `contexts/AuthContext.tsx`
  - Token: Stored securely, refreshed automatically
  - Admin verification: Via `is_admin` column in `profiles` table

## Notifications & Communication

**Discord Webhooks (Optional):**
- Service: Discord server notifications for game events
- What it's used for: Room creation, player joins, game started alerts
- Configuration:
  - `NOTIFICATIONS_ENABLED=true` (enable/disable)
  - `DISCORD_WEBHOOK_URL` (webhook URL from Discord)
- Implementation: Fire-and-forget HTTP POST requests
- Location: `backend/modules/notificationService.ts`
- Rate limiting: 30 messages per 60 seconds

**Telegram Bot (Optional):**
- Service: Telegram notifications for game events
- What it's used for: Same events as Discord
- Configuration:
  - `TELEGRAM_BOT_TOKEN` (from @BotFather)
  - `TELEGRAM_CHAT_ID` (target chat ID from @userinfobot)
  - `NOTIFICATIONS_ENABLED=true` (enable/disable)
- Implementation: Fire-and-forget HTTP POST to Telegram API
- Location: `backend/modules/notificationService.ts`
- Rate limiting: 20 messages per 60 seconds

**Resend Email Service (Optional):**
- Service: Email delivery for daily challenge notifications
- What it's used for: Sending daily puzzle reminder emails to subscribers
- SDK/Client: `resend` 6.6.0
- Configuration:
  - `RESEND_API_KEY` (API key from https://resend.com)
  - `RESEND_FROM_EMAIL` (verified sender domain)
  - `NEXT_PUBLIC_APP_URL` (app domain for unsubscribe links)
- Location: `backend/modules/dailyChallengesManager.ts` (cron job)
- Endpoint: `app/api/email/send-daily/route.ts` (scheduled via cron)
- Frequency: Daily at specified time, to opted-in users

## Game Portal Integration

**CrazyGames SDK (Optional):**
- Service: Game portal embedding and monetization
- What it's used for: Publishing game on CrazyGames platform
- Configuration: `NEXT_PUBLIC_CRAZYGAMES_ENABLED=true/false`
- Implementation:
  - SDK script loading from `https://sdk.crazygames.com`
  - Iframe embedding support
  - CSP headers adjusted for CrazyGames domains
- Location:
  - Component: `components/CrazyGamesSDK.tsx`
  - Provider: `app/providers.tsx`
- Security: Frame-ancestors CSP allows CrazyGames and Poki domains

## Monitoring & Observability

**Error Tracking:**
- Sentry (error monitoring and reporting)
  - What it's used for: Catch and report client and server errors in production
  - SDK: `@sentry/nextjs` 10.32.1
  - Configuration:
    - `NEXT_PUBLIC_SENTRY_DSN` (enable/disable error reporting)
    - `SENTRY_ORG`, `SENTRY_PROJECT` (optional source map uploads)
    - `SENTRY_AUTH_TOKEN` (optional for source maps)
  - Location:
    - Config: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
    - Utilities: `utils/sentry.ts`
  - Filters: Ignores benign errors (ResizeObserver, etc.)

**Session Replay:**
- LogRocket (session replay and console logs)
  - What it's used for: Record user sessions for debugging production issues
  - SDK: `logrocket` 10.1.1
  - Configuration: Org ID `ioiov9/lexiclash`
  - Lazy loading: Deferred 3 seconds or first user interaction
  - Location: `app/providers.tsx`
  - Integration: Linked to Sentry for error correlation (`utils/sentry.ts`)
  - Skip: Localhost and development environments

**Analytics:**
- Google Analytics 4
  - What it's used for: User behavior tracking, engagement metrics
  - Configuration: `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (enable/disable)
  - Implementation: Google Tag Manager script
  - Location: `components/GoogleAnalytics.tsx`
  - Tracks: Page views, events, user engagement, conversions
  - CSP allows: `*.google-analytics.com`, `*.analytics.google.com`, `*.googletagmanager.com`

**Development Performance:**
- React Scan (development only)
  - What it's used for: Detect performance issues and unnecessary re-renders
  - Configuration: `NEXT_PUBLIC_ENABLE_REACT_SCAN=true`
  - Location: `app/providers.tsx`
  - Only loads in development mode

## Rate Limiting & Security

**Rate Limiting Configuration:**
- Message rate limiting (Socket.IO):
  - `MESSAGE_RATE_LIMIT=50` (messages per window)
  - `RATE_LIMIT_WINDOW=10000` (window in milliseconds, default 10 seconds)
  - Location: `backend/utils/rateLimiter.ts`

**Admin API Security:**
- JWT token authentication (via Supabase)
- Bearer token in Authorization header
- Admin role verification from `profiles.is_admin`
- IP-based rate limiting for admin endpoints
- Audit logging for sensitive operations
- Location: `backend/routes/admin.ts`, `backend/routes/buzzChallenge.ts`

**Webhook Security:**
- CRON_SECRET for scheduled task authentication
- Prevents unauthorized cron job triggers
- Location: `app/api/email/send-daily/route.ts`

## Logging Configuration

**Log Levels:**
- `LOG_LEVEL=INFO` (default)
- `LOG_TIMESTAMP=true` (include timestamps)
- `LOG_COLORS=true` (colored console output)
- Location: `backend/utils/logger.ts`

**Correlation IDs:**
- Unique ID per request for tracing
- Location: `backend/utils/correlationId.ts`
- Used in: Socket.IO connections, HTTP requests

## External References

**Health Checks:**
- SERP API health check: `backend/services/serpApiClient.ts` (checkSerpApiHealth function)
- Redis health check: `backend/redis/connection.ts` (healthCheck function)
- Supabase validation: `backend/modules/supabaseServer.ts` (service key validation on startup)

## Cost Optimization (Daily Buzz)

**Daily API Calls:**
- SERP API: 5 calls/day (one per region) → FREE tier covers
- Vertex AI Gemini: ~$0.02/day for challenge generation
- Vertex AI Imagen: ~$0.03/day for image (1 image shared across all languages)
- Total estimated: ~$1.50/month with aggressive caching

**Caching Strategy:**
- 24-hour Redis cache for trends (reduces redundant API calls)
- Single image per day reused across 5 languages (80% cost savings)
- Image permanent storage in Supabase (reuse for recurring topics)

---

*Integration audit: 2026-01-22*
