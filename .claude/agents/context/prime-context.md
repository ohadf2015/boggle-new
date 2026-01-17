# LexiClash Prime Context

**Last Updated:** 2026-01-17
**Branch:** feature/desktop-tv-crazygames-improvements
**Commit:** a8282fa (feat: desktop layout and CrazyGames improvements)

## Project Overview

- **Name:** LexiClash
- **Purpose:** Multi-language word game with real-time multiplayer, single-player challenges, brain training, and daily challenges
- **Tech Stack:** Next.js 16 + Express + Socket.IO (monolithic full-stack)
- **Database:** Supabase (PostgreSQL) + Redis (ioredis)
- **Current Version:** 0.1.0
- **Port:** 3001 (development)

## Architecture

### Frontend (Next.js 16)
- **Framework:** Next.js 16.0.10 with App Router
- **React:** 19.2.0
- **TypeScript:** 5.9.3
- **Styling:** Tailwind CSS 3.4.18 + SCSS
- **UI Components:** Radix UI (dialogs, selects, tooltips, etc.)
- **Animation:** Framer Motion 12.x, GSAP
- **State:** React Context API (multiple contexts)
- **HTTP Client:** Axios
- **Validation:** Zod

### Backend (Express + Socket.IO)
- **Framework:** Express 5.1.0
- **Real-time:** Socket.IO 4.8.1 with Redis adapter for horizontal scaling
- **Database ORM:** Supabase client (NOT Prisma)
- **Caching:** Redis (ioredis 5.8.2)
- **AI Services:** Anthropic SDK, Google Vertex AI

### Key Integrations
- **Authentication:** Supabase Auth (Google, Discord, Apple OAuth)
- **Email:** Resend
- **Monitoring:** Sentry, LogRocket
- **Gaming Platforms:** CrazyGames SDK integration
- **Analytics:** Custom + Google Analytics

## Key Patterns

### Frontend Patterns

**Component Structure:**
- Functional components with hooks only (NO class components)
- TypeScript interfaces for all props
- Tailwind-first styling with Neo-Brutalist design system
- Maximum 300 lines per component (split larger ones)

**State Management:**
- React Context API for global state (NO Redux)
- Multiple specialized contexts:
  - `AuthContext` - Authentication and user state
  - `LanguageContext` - i18n with `t()` function
  - `InGameContext` - Active game state
  - `CoinContext` - Virtual currency
  - `MusicContext` / `SoundEffectsContext` - Audio
  - `AccessibilityContext` - A11y preferences

**i18n (CRITICAL):**
- ALL UI text MUST use `t('key')` from LanguageContext
- NO hardcoded strings
- 5 supported languages: Hebrew (RTL), English, Swedish, Japanese, Spanish
- Translation files: `translations/{en,he,sv,ja,es}.js`

**Design System (Neo-Brutalist):**
- Dark-only theme
- Hard shadows: `shadow-hard-*` (NO blur)
- Chunky borders: `border-neo` (3px), `border-neo-thick` (4px)
- Colors: lime (primary), pink (multiplayer), cyan (single-player), purple (brain training)
- Fonts: Fredoka (display), Rubik (body)
- Animations: `animate-neo-press`, `animate-neo-pop`, `animate-neo-wobble`

**Responsive Design:**
- Prefer container queries (`cqw`, `cqi`) over viewport units
- Custom breakpoints for CrazyGames: `cg-mobile`, `cg-min`, `cg-tablet`
- TV breakpoints: `tv` (1080p), `tv-4k`

### Backend Patterns

**Server Architecture:**
- Modular server structure in `server/` directory:
  - `index.ts` - Main orchestration
  - `middleware.ts` - Express middleware
  - `socketSetup.ts` - Socket.IO configuration
  - `localeRedirect.ts` - i18n detection
  - `healthRoutes.ts` - Health endpoints
  - `lifecycle.ts` - Startup/shutdown

**Handler Pattern:**
- Socket event handlers in `backend/handlers/`
- Business logic modules in `backend/modules/`
- Express routes in `backend/routes/`

**Module Structure:**
- `gameStateManager.ts` - Game state management
- `botManager.ts` / `botBehavior.ts` - AI opponents
- `friendsManager.ts` - Social features
- `achievementManager.ts` - Achievements and XP
- `supabaseServer.ts` - Database operations

**Error Handling:**
- Graceful degradation on non-critical errors
- Continue processing even if individual items fail
- Structured logging with context

### Testing Patterns

**Backend Tests:**
- Jest with `backend/jest.config.js`
- Test files in `backend/__tests__/`
- Supertest for API testing

**Frontend Tests:**
- Jest with `jest.config.js`
- React Testing Library
- Test files in `__tests__/` and `app/**/__tests__/`

**E2E Tests:**
- Playwright

**TDD Requirement:**
- Tests are MANDATORY for all new code
- Follow RED-GREEN-REFACTOR cycle
- 80%+ coverage target

## Codebase Structure

### Directory Layout
```
fe-next/
├── app/                    # Next.js App Router
│   └── [locale]/          # Dynamic locale routing
│       ├── page.tsx       # Home page
│       ├── multiplayer/   # Multiplayer game
│       ├── singleplayer/  # Single-player mode
│       ├── daily/         # Daily challenges (word-hunt, buzz)
│       ├── brain/         # Brain training drills
│       ├── profile/       # User profile
│       ├── leaderboard/   # Leaderboards
│       ├── friends/       # Social features
│       ├── admin/         # Admin dashboard
│       └── api/           # Next.js API routes
├── backend/               # Express + Socket.IO server
│   ├── handlers/          # Socket event handlers
│   ├── modules/           # Business logic modules
│   ├── routes/            # Express API routes
│   ├── services/          # Service layer
│   ├── utils/             # Backend utilities
│   ├── dictionary.ts      # Word dictionary
│   └── redisClient.ts     # Redis client
├── server/                # Modular server orchestration
│   ├── index.ts           # Entry point
│   ├── middleware.ts      # Express middleware
│   ├── socketSetup.ts     # Socket.IO setup
│   └── lifecycle.ts       # Startup/shutdown
├── components/            # React UI components
├── host/                  # Host view components
│   ├── components/        # Host-specific UI
│   ├── hooks/             # Host-specific hooks
│   └── contexts/          # Host contexts
├── player/                # Player view components
│   ├── PlayerView.tsx     # Main player view
│   ├── components/        # Player-specific UI
│   └── hooks/             # Player-specific hooks
├── contexts/              # Global React contexts
├── hooks/                 # Custom React hooks
├── utils/                 # Frontend utilities
├── lib/                   # Library utilities
│   ├── supabase.ts        # Supabase client
│   ├── ai-service.ts      # AI service
│   └── designSystem.ts    # Design tokens
├── shared/                # Shared code (FE + BE)
│   ├── types/             # Shared TypeScript types
│   ├── constants/         # Shared constants
│   └── utils/             # Shared utilities
├── types/                 # Frontend-specific types
├── translations/          # i18n files
├── supabase/              # Supabase config and migrations
└── public/                # Static assets
```

### Key Files

**Configuration:**
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Tailwind + Neo-Brutalist design system
- `tsconfig.json` - TypeScript config
- `.env` - Environment variables (not committed)

**Entry Points:**
- `server.ts` → `server/index.ts` - Server entry
- `app/layout.tsx` - Root layout
- `app/[locale]/layout.tsx` - Locale layout with providers

**Type Definitions:**
- `shared/types/game.ts` - Core game types
- `shared/types/socket.ts` - Socket event types
- `types/index.ts` - Type re-exports

## External APIs

### Database
- **Supabase** (PostgreSQL)
  - User accounts, profiles, stats
  - Leaderboards, achievements
  - Daily challenges, community words
  - Friend relationships

### Caching
- **Redis**
  - Game state
  - Session data
  - Rate limiting
  - Socket.IO adapter for horizontal scaling

### AI Services
- **Anthropic Claude** - Word validation, hint generation
- **Google Vertex AI** - Alternative AI provider

### Third-Party
- **Resend** - Email delivery
- **CrazyGames SDK** - Gaming platform integration
- **Sentry** - Error monitoring
- **LogRocket** - Session replay

## Build & Run

### Development
```bash
cd fe-next
npm install
npm run dev
# Server at http://localhost:3001
```

### Testing
```bash
npm run test           # All tests
npm run test:backend   # Backend only
npm run test:frontend  # Frontend only
npm run test:e2e       # Playwright E2E
npm run test:coverage  # Coverage report
```

### Production
```bash
npm run build
npm run start
```

### Utilities
```bash
npm run lint                    # ESLint
npm run check:translations      # Find missing translations
npm run db:migrate              # Run Supabase migrations
```

## Recent Activity

```
a8282fa feat: desktop layout and CrazyGames improvements
e452689 fix: specify parameter type for slowClaim function in AdminGiftModal tests
bf9c29f fix: update navigation paths and translations for solo-bots mode
9493f50 feat: implement single-player leaderboard API and update translations
ba49b79 feat: add utility to migrate guest scores to leaderboard from localStorage
f811c9c feat: add NextChallengePrompt component for post-challenge engagement
47b2192 fix: Add missing translation keys for 'noOptions' in Spanish and Japanese
545c631 fix: Enhance challenge navigation and add error handling
c095288 test: Improve timer test precision and update DailyChallengeRouter tests
d1b9f7a fix: Update routing to include user-selected language for Daily Challenge
```

## Current State

- **Branch:** feature/desktop-tv-crazygames-improvements
- **Status:** Working tree has modifications (see git status)
- **Focus Areas:**
  - Desktop layout improvements
  - CrazyGames platform integration
  - Single-player features
  - Daily challenge system

## Important Notes

### CRITICAL Constraints

1. **Translation-First:** ALL UI text MUST use `t()` - NO hardcoded strings
2. **4+ Language Support:** Test Hebrew (RTL), English, Swedish, Japanese, Spanish
3. **Type Safety:** NO `any` types - full type definitions required
4. **File Size:** Maximum 500 lines per file - split into modules
5. **Testing:** Every component/function MUST have tests

### Code Quality

- **DRY:** No duplicate logic - extract to utilities
- **SOLID:** Single responsibility, <50 lines per function
- **No Magic Strings:** Extract to constants
- **Security:** Validate all input on frontend AND backend

### Before Making Changes

1. Read CLAUDE.md - contains all technical decisions
2. Run tests: `npm run test`
3. Run build: `npm run build`
4. Run lint: `npm run lint`

### Git Workflow

- NEVER commit directly to main
- Create feature branches for all changes
- Follow conventional commits format
- PR required for all merges

## References

- `CLAUDE.md` - Project overview and guidelines
- `fe-next/CLAUDE.md` - Detailed coding standards
- `.claude/rules/` - Modular coding rules
- `tailwind.config.js` - Design system tokens
- `shared/types/` - Type definitions
