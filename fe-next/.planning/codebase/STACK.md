# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5.9.3 - Full application (frontend + backend)
- JavaScript - Mixed codebase (some legacy files not migrated)

**Secondary:**
- SCSS - Complex styling (nested, variables, mixins)

## Runtime

**Environment:**
- Node.js 18.0.0+ (via server.ts with tsx loader)
- Next.js 16.0.10 (App Router with `[locale]/` dynamic routing)
- Browser targets: Modern browsers with ES2020 support

**Package Manager:**
- npm
- Lockfile: package-lock.json (present)

## Frameworks & Core Libraries

**Frontend:**
- Next.js 16.0.10 - React framework, API routes, App Router
- React 19.2.0 - UI library
- React DOM 19.2.0 - DOM rendering

**Backend:**
- Express 5.1.0 - HTTP server
- Socket.IO 4.8.1 - Real-time bidirectional communication
- Socket.IO Client 4.8.1 - WebSocket client for frontend
- Node-Cron 4.2.1 - Scheduled tasks (daily challenges, cron jobs)

**UI Components & Styling:**
- Tailwind CSS 3.4.18 - Utility-first CSS framework
- PostCSS 8.5.6 - CSS processing
- Autoprefixer 10.4.22 - CSS vendor prefixes
- SASS 1.94.2 - Preprocessor for complex styles
- Radix UI (components):
  - @radix-ui/react-alert-dialog 1.1.15
  - @radix-ui/react-checkbox 1.3.3
  - @radix-ui/react-dialog 1.1.15
  - @radix-ui/react-label 2.1.8
  - @radix-ui/react-progress 1.1.8
  - @radix-ui/react-select 2.2.6
  - @radix-ui/react-slot 1.2.4
  - @radix-ui/react-switch 1.2.6
  - @radix-ui/react-toggle-group 1.1.11
  - @radix-ui/react-tooltip 1.2.8
- Framer Motion 12.23.24 - Advanced animations and transitions
- GSAP 3.14.2 - Professional animations library
- Animate.css 4.1.1 - CSS animation library

**3D Graphics:**
- Three.js 0.182.0 - 3D library (adventure mode, 3D graphics)
- @react-three/fiber 9.5.0 - React renderer for Three.js
- @react-three/drei 10.7.7 - Utilities for react-three-fiber
- @react-three/postprocessing 3.0.4 - Post-processing effects for Three.js

**Data & State Management:**
- Zustand 5.0.10 - Lightweight state management
- XState 5.24.0 - State machines and statechart logic
- TanStack React Virtual 3.13.12 - Virtualization for large lists

**Form & Validation:**
- Zod 4.1.13 - TypeScript-first schema validation

**Utilities:**
- Axios 1.13.2 - HTTP client
- Clsx 2.1.1 - Conditional className utility
- Tailwind Merge 3.4.0 - Merge Tailwind classes without conflicts
- Class Variance Authority 0.7.1 - CSS-in-JS for variants
- QRCode.React 4.2.0 - QR code generation
- Canvas Confetti 1.9.4 - Confetti animations
- Howler 2.2.4 - Web audio library (sound effects)
- JS Cookie 3.0.5 - Cookie management
- Recharts 3.6.0 - React charting library
- Lucide React 0.554.0 - Icon library
- Sharp 0.34.5 - Image processing (WebP compression)
- Compression 1.8.1 - Gzip middleware
- CORS 2.8.5 - Cross-origin resource sharing
- WS 8.18.3 - WebSocket library (fallback)

**AI & ML:**
- @google-cloud/vertexai 1.10.0 - Google Vertex AI (Gemini models for validation)
- @anthropic-ai/sdk 0.71.2 - Anthropic Claude API (future/testing)

**Internationalization (i18n):**
- Custom translation system in `translations/` directory
- Supported languages: Hebrew (RTL), English, Swedish, Japanese

**Word Lists:**
- an-array-of-english-words 2.0.0 - English word validation
- an-array-of-spanish-words 2.0.0 - Spanish words (available)
- @arvidbt/swedish-words 1.0.6 - Swedish word validation
- bad-words 3.0.4 - Profanity filter

**Special Purpose:**
- date-easter 1.0.3 - Easter date calculation (holiday theming)
- Google Auth Library 10.5.0 - Google authentication (credentials parsing)

## Configuration

**Environment:**
- Configured via `.env.example` (committed reference)
- `.env` file (not committed - contains secrets)
- `next.config.mjs` - Next.js configuration with Sentry, bundle analyzer, security headers
- `tsconfig.json` - TypeScript strict mode, path aliases (`@/*`)
- `playwright.config.ts` - E2E testing configuration
- `jest.config.js` - Frontend unit test configuration
- `backend/jest.config.js` - Backend unit test configuration

**Build:**
- Build system: Next.js with Turbopack (experimental)
- Transpiled packages: Three.js and React Three packages (for Turbopack HMR)
- Bundle analyzer: Available via `ANALYZE=true npm run build`
- Source maps: Managed via Sentry for production error reporting

## Database & Caching

**Primary Database:**
- Supabase (PostgreSQL) - User profiles, game history, leaderboards, achievements
- Connection: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Client: `@supabase/supabase-js` 2.86.0 + `@supabase/ssr` 0.8.0
- Location: `backend/modules/supabaseServer.ts`

**Caching & Session Store:**
- Redis via ioredis 5.8.2
- Configuration: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` or `REDIS_URL`
- Alternative Azure: `REDISHOST`, `REDISPORT` (Cloud Redis support)
- TTL settings: `REDIS_GAME_TTL` (default 3600s)
- Usage: Game state, leaderboard caching, session data, word approval voting
- Lua scripts: Atomic operations for word voting (in `backend/redis/connection.ts`)
- Pub/Sub adapter: `@socket.io/redis-adapter` 8.3.0 for horizontal scaling

## Server Infrastructure

**Task Scheduling:**
- Node-Cron 4.2.1 - Scheduled background jobs
- Location: `backend/modules/dailyChallengesManager.ts`
- Example: Daily buzz generation at specified times

## Testing

**Unit & Integration Testing:**
- Jest 29.7.0 - Test runner
- ts-jest 29.4.6 - TypeScript support in Jest
- @testing-library/react 16.3.0 - React testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- Jest Environment JSDOM 29.7.0 - Browser environment simulation
- Supertest 7.2.2 - HTTP assertion library

**E2E Testing:**
- Playwright 1.57.0 (@playwright/test) - Browser automation
- Config files:
  - `playwright.config.ts` - Main E2E config
  - `playwright-singleplayer.config.ts` - Single-player mode tests
  - `playwright-ui-test.config.ts` - UI-specific tests

**Performance Testing:**
- Lighthouse CI 0.14.0 (@lhci/cli) - Performance monitoring
- Config files:
  - `lighthouserc.mobile.cjs` - Mobile performance config
  - `lighthouserc.desktop.cjs` - Desktop performance config
- Run: `npm run lighthouse:ci`

**Development Tools:**
- ESLint 9 - Code linting
- eslint-config-next 16.0.7 - Next.js linting rules
- TypeScript Language Server 5.1.3 - IDE support
- tsx 4.21.0 - TypeScript execution (dev server)

## Monitoring & Observability

**Error Tracking:**
- Sentry 10.32.1 (@sentry/nextjs) - Error monitoring
- Configuration files:
  - `sentry.client.config.ts` - Client-side error handling
  - `sentry.server.config.ts` - Server-side error handling
  - `sentry.edge.config.ts` - Edge function error handling
- Enabled via: `NEXT_PUBLIC_SENTRY_DSN`

**Session Replay:**
- LogRocket 10.1.1 - Session replay and logs
- Lazy-loaded after 3 seconds or user interaction
- Location: `app/providers.tsx` (line 120-124)
- Linked to Sentry for correlation: `utils/sentry.ts`

**Analytics:**
- Google Analytics 4 (via Google Tag Manager)
- Enabled via: `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- Component: `components/GoogleAnalytics.tsx`

**Development Performance:**
- React Scan 0.4.3 - Development-only performance monitoring
- Enabled via: `NEXT_PUBLIC_ENABLE_REACT_SCAN=true`

## Key Build Optimizations

**Image Optimization:**
- Next.js Image component with modern formats (AVIF, WebP)
- Device sizes: 640, 750, 828, 1080, 1200, 1920px
- Cache TTL: 1 year (31536000s) for static assets
- Content Security Policy for image delivery
- Remote pattern: Supabase storage bucket

**Security Headers:**
- Strict-Transport-Security (1 year, includeSubDomains)
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: Configurable for CrazyGames embedding
- Permissions-Policy: Blocks camera, microphone, geolocation

**Code Optimization:**
- Production: Removes console.log (keeps errors and warnings)
- React Strict Mode enabled
- Powered-By header disabled
- TypeScript strict mode enabled
- Incremental compilation support

## Deployment

**Hosting:**
- Vercel or Railway (via `npm run start`)
- Environment: `NODE_ENV` auto-set (development for dev, production for build/start)

**Production Start:**
```bash
NODE_ENV=production tsx server.ts  # or: bun run start:bun
```

**Build Process:**
```bash
npm run build:schemas  # Compile backend TypeScript schemas
npm run build          # Next.js build
npm run postbuild      # Run Supabase migrations (if SUPABASE_SERVICE_ROLE_KEY set)
```

## Package Statistics

- **Total Dependencies:** 66 production packages
- **Total Dev Dependencies:** 34 development packages
- **Total:** ~100 packages

---

*Stack analysis: 2026-01-22*
