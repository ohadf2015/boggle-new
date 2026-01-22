# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
fe-next/
├── app/                    # Next.js App Router (pages and layouts)
│   ├── [locale]/          # Dynamic locale routing (en, he, sv, ja, es, fr, de)
│   │   ├── page.tsx       # Home page
│   │   ├── layout.tsx     # Locale-specific root layout
│   │   ├── multiplayer/   # Multiplayer game pages
│   │   ├── singleplayer/  # Single-player game pages
│   │   ├── daily/         # Daily challenge pages
│   │   ├── adventure/     # Adventure mode pages
│   │   ├── brain/         # Brain training game
│   │   ├── leaderboard/   # Leaderboard pages
│   │   ├── profile/       # User profile management
│   │   ├── admin/         # Admin dashboard
│   │   └── [other]/       # Settings, rules, contact, legal, etc.
│   ├── providers.tsx      # Root context providers
│   ├── fonts.ts           # Font imports (Fredoka, Rubik)
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components (100+ files)
│   ├── admin/            # Admin-specific components
│   ├── achievements/     # Achievement UI and notifications
│   ├── motion/           # Framer Motion animation components
│   ├── celebration/      # Celebration and special event components
│   ├── [game-components] # Game-specific UI (GameBoard, TimerDisplay, etc.)
│   └── *.tsx             # Atomic components
├── backend/              # Express + Node.js backend
│   ├── handlers/         # Socket.IO event handlers
│   │   ├── gameHandler.ts          # Game lifecycle events
│   │   ├── wordHandler.ts          # Word submission events
│   │   ├── chatHandler.ts          # Chat messages
│   │   ├── botHandler.ts           # Bot management
│   │   ├── connectionHandler.ts    # Socket connection/disconnect
│   │   ├── presenceHandler.ts      # User presence tracking
│   │   └── [other handlers]        # Friend challenges, tournaments, etc.
│   ├── modules/          # Core business logic modules
│   │   ├── gameStateManager.ts     # Game room and state management
│   │   ├── presenceManager.ts      # Player presence tracking
│   │   ├── botManager.ts           # Bot creation and behavior
│   │   ├── leaderboardManager.ts   # Leaderboard calculations
│   │   ├── achievementManager.ts   # Achievement tracking
│   │   ├── wordValidator.ts        # Word validation service
│   │   ├── communityWordManager.ts # Community words database
│   │   ├── gameState/              # Game state types and persistence
│   │   └── [other modules]         # AI services, email, etc.
│   ├── services/         # External integrations and utilities
│   │   ├── analyticsService.ts     # Tracking and metrics
│   │   ├── emailService.ts         # Email sending (Resend)
│   │   └── [other services]        # Supabase, Redis utilities
│   ├── routes/           # Express API route handlers
│   │   ├── admin.ts                # Admin operations
│   │   ├── leaderboard.ts          # Leaderboard endpoints
│   │   ├── dailyChallenge.ts       # Daily challenge endpoints
│   │   ├── singlePlayer.ts         # Single-player game endpoints
│   │   ├── analytics.ts            # Analytics tracking endpoints
│   │   └── [other routes]          # Dictionary, AI hints, etc.
│   ├── utils/            # Backend utilities
│   │   ├── logger.ts               # Structured logging
│   │   ├── rateLimiter.ts          # Rate limiting (IP-based)
│   │   ├── wordValidator.ts        # Word validation helpers
│   │   └── [utility modules]       # Scoring, grid solving, etc.
│   ├── redis/            # Redis client setup and utilities
│   ├── config/           # Configuration files
│   ├── data/             # Static data (word lists, etc.)
│   ├── dictionary.ts     # Dictionary lookup service
│   ├── socketHandlers.ts # Socket initialization entry point
│   └── jest.config.js    # Backend test configuration
├── server/               # Server orchestration and middleware
│   ├── index.ts          # Main server setup (Express + Socket.IO)
│   ├── middleware.ts     # Express middleware (CORS, security headers)
│   ├── socketSetup.ts    # Socket.IO configuration
│   ├── redisAdapter.ts   # Redis adapter for Socket.IO
│   ├── localeRedirect.ts # i18n locale detection
│   ├── healthRoutes.ts   # Health check endpoints
│   ├── lifecycle.ts      # Startup and shutdown management
│   └── preload.ts        # Global setup (AsyncLocalStorage)
├── hooks/                # Custom React hooks
│   ├── gameState/        # Game state hooks
│   │   ├── store.ts      # Zustand game store
│   │   ├── types.ts      # Type definitions
│   │   └── [selectors]   # Zustand selector hooks
│   ├── useSocket*.ts     # Socket.IO connection hooks
│   ├── useGame*.ts       # Game logic hooks
│   ├── use*.ts           # 60+ utility hooks
│   └── __tests__/        # Hook tests
├── contexts/             # React Context providers
│   ├── GameStateContext.tsx    # Game state (Zustand wrapper)
│   ├── AuthContext.tsx         # User authentication
│   ├── LanguageContext.tsx     # i18n language selection
│   ├── MusicContext.tsx        # Background music state
│   ├── SoundEffectsContext.tsx # Sound effects state
│   ├── CoinContext.tsx         # In-game currency
│   ├── ProgressionContext.tsx  # Player progression
│   └── [other contexts]        # Accessibility, navigation, etc.
├── types/                # Frontend type definitions
│   ├── index.ts          # Central export
│   ├── user.ts           # User-related types
│   ├── api.ts            # API response types
│   ├── components.ts     # Component prop types
│   ├── adventure.ts      # Adventure mode types
│   └── __tests__/        # Type definition tests
├── shared/               # Shared types and utilities (frontend + backend)
│   └── types/
│       ├── game.ts       # Core game types (Language, GameUser, WordDetail, etc.)
│       ├── socket.ts     # Socket event types
│       └── index.ts      # Exports
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client initialization
│   ├── ai-service.ts     # AI word validation (Claude/Vertex API)
│   ├── email.ts          # Email utilities (Resend integration)
│   ├── designSystem.ts   # Neo-brutalist design system exports
│   ├── adventure/        # Adventure mode utilities
│   ├── auth/             # Authentication utilities
│   ├── admin/            # Admin panel utilities
│   └── [utility modules] # Date, locale, validation helpers
├── utils/                # Frontend utilities (60+ files)
│   ├── SocketContext.tsx       # Socket.IO client context
│   ├── ThemeContext.tsx        # Theme/dark mode context
│   ├── composeProviders.tsx    # Provider composition helper
│   ├── cognitiveScoring/       # Cognitive difficulty calculation
│   ├── dailyChallenge/         # Daily challenge utilities
│   ├── buzz/                   # Daily Buzz feature utilities
│   ├── connectionUtils.ts      # Connection state helpers
│   ├── errorMessageMap.ts      # User-facing error messages
│   └── [60+ utility files]     # Validation, formatting, animation helpers
├── constants/            # Application constants
│   ├── index.ts          # Central export
│   └── *.ts              # Feature-specific constants
├── translations/         # i18n content
│   ├── en.json           # English translations
│   ├── he.json           # Hebrew translations (RTL)
│   ├── sv.json           # Swedish translations
│   ├── ja.json           # Japanese translations
│   ├── es.json           # Spanish translations
│   └── [locale files]    # Additional languages
├── styles/               # Global SCSS
│   ├── globals.scss      # Reset, halftone texture, animations
│   └── *.scss            # Feature-specific styles
├── public/               # Static assets
│   ├── images/           # Game assets, avatars, backgrounds
│   ├── sounds/           # Sound effects and music
│   └── [static files]    # Fonts, icons, etc.
├── __mocks__/            # Jest mock setup
├── __tests__/            # Integration and E2E test specs
├── e2e/                  # Playwright E2E tests
├── scripts/              # Utility scripts (migrations, setup, etc.)
├── supabase/             # Supabase migrations and config
├── .planning/            # GSD planning documents
│   └── codebase/         # Architecture and structure docs
├── .claude/              # Claude Code config and rules
├── server.ts             # Server entry point (Node.js)
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── jest.config.js        # Frontend test configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
└── .env.example          # Environment variables template
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router pages and layouts
- Contains: Page components, layout wrappers, error boundaries
- Key files: `[locale]/layout.tsx` for provider setup, `[locale]/page.tsx` for home

**components/**
- Purpose: Reusable React components
- Contains: UI components, game components, admin components, animations
- Key files: `GameBoard.tsx`, `TimerDisplay.tsx`, `LeaderboardTable.tsx`, etc.

**backend/**
- Purpose: Node.js/Express backend logic
- Contains: Socket handlers, business logic modules, API routes, utilities
- Key files: `handlers/index.ts`, `modules/gameStateManager.ts`, `routes/` for REST API

**server/**
- Purpose: Server initialization and middleware
- Contains: Express app setup, Socket.IO configuration, middleware chains
- Key files: `index.ts` (main), `middleware.ts`, `socketSetup.ts`

**hooks/**
- Purpose: Custom React hooks for logic reuse
- Contains: Game state hooks, Socket hooks, UI hooks
- Key files: `gameState/store.ts` (Zustand store), `useSocket.ts`, 60+ others

**contexts/**
- Purpose: React Context providers for global state
- Contains: Auth, game state, language, music, sounds, progression
- Key files: `GameStateContext.tsx`, `AuthContext.tsx`, `LanguageContext.tsx`

**types/**
- Purpose: TypeScript type definitions
- Contains: User types, API response types, component prop types
- Key files: `index.ts` (exports), `user.ts`, `adventure.ts`

**shared/**
- Purpose: Shared types and utilities between frontend and backend
- Contains: Game types, Socket event types
- Key files: `types/game.ts` (canonical game types), `types/socket.ts`

**lib/**
- Purpose: Library utilities and integrations
- Contains: Supabase client, AI services, email utilities, design system
- Key files: `supabase.ts`, `ai-service.ts`, `email.ts`, `designSystem.ts`

**utils/**
- Purpose: Frontend utilities and helpers
- Contains: Context wrappers, validation helpers, formatting, animation utilities
- Key files: `SocketContext.tsx`, `ThemeContext.tsx`, `errorMessageMap.ts`

**constants/**
- Purpose: Application-wide constants
- Contains: Game rules, difficulty settings, feature flags
- Key files: `index.ts` (central export)

**translations/**
- Purpose: i18n content for multi-language support
- Contains: JSON files with all UI text for 4+ languages
- Key files: `he.json` (Hebrew, RTL), `en.json`, `sv.json`, `ja.json`

**public/**
- Purpose: Static assets served by Next.js
- Contains: Images, sounds, fonts
- Key files: Organized by asset type (images/, sounds/)

## Key File Locations

**Entry Points:**
- `server.ts`: Node.js server startup (imports `server/index.ts`)
- `server/index.ts`: Express + Socket.IO orchestration
- `app/[locale]/layout.tsx`: Frontend root layout and provider setup
- `app/[locale]/page.tsx`: Home page
- `backend/socketHandlers.ts`: Socket.IO event handler registration

**Configuration:**
- `next.config.js`: Next.js build and runtime config
- `tailwind.config.js`: Tailwind CSS design tokens and utilities
- `tsconfig.json`: TypeScript compilation settings
- `jest.config.js`: Frontend test runner config
- `backend/jest.config.js`: Backend test runner config

**Core Logic:**
- `backend/modules/gameStateManager.ts`: Game room lifecycle and state
- `backend/modules/presenceManager.ts`: Player online/offline tracking
- `backend/handlers/gameHandler.ts`: Game creation, join, start, end events
- `hooks/gameState/store.ts`: Zustand store for game state
- `lib/ai-service.ts`: AI-powered word validation

**Testing:**
- `__tests__/`: Integration test specs (organized by feature)
- `e2e/`: Playwright E2E test scripts
- `components/__tests__/`: Component unit tests
- `backend/__tests__/`: Backend unit and integration tests

**Static Data:**
- `backend/english_words_approved.txt`: English dictionary (20k+ words)
- `backend/hebrew_words_approved.txt`: Hebrew dictionary
- `backend/japanese_words_approved.txt`: Japanese dictionary
- `translations/`: i18n JSON files for all languages

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `GameBoard.tsx`, `LeaderboardTable.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useGameState.ts`, `useSocket.ts`)
- Utilities: `camelCase.ts` (e.g., `wordValidator.ts`, `logger.ts`)
- Contexts: `PascalCase.tsx` ending with `Context` (e.g., `GameStateContext.tsx`)
- Modules: `camelCase.ts` ending with `Manager` or `Service` (e.g., `gameStateManager.ts`)
- Routes: `camelCase.ts` named after resource (e.g., `leaderboard.ts`, `admin.ts`)

**Directories:**
- Feature folders: `kebab-case` (e.g., `daily-challenge/`, `admin/`)
- Context modules: `auth/`, `gameState/` (camelCase for organization)
- Utilities: `snake_case` or compound names (e.g., `cognitiveScoring/`, `dailyChallenge/`)

**Type/Interface Names:**
- Component props: `{ComponentName}Props` (e.g., `GameBoardProps`, `ModalProps`)
- Context types: `{ContextName}Type` (e.g., `GameStateType`, `AuthContextType`)
- API responses: `{Resource}Response` (e.g., `CreateGameResponse`, `LeaderboardResponse`)
- Domain models: `{Domain}` (e.g., `GameUser`, `WordDetail`, `Achievement`)

## Where to Add New Code

**New Feature:**
- Primary code: Create feature-specific component in `components/{featureName}/`
- Logic: Add hooks in `hooks/` or modules in `backend/modules/`
- API endpoint: Create route in `backend/routes/{featureName}.ts`
- Socket events: Add handler in `backend/handlers/{featureName}Handler.ts`
- Tests: Mirror structure with `__tests__/` subdirectory
- Translations: Add keys to all files in `translations/`

**New Component/Module:**
- Implementation: `components/{CategoryName}/{ComponentName}.tsx`
- Tests: `components/{CategoryName}/__tests__/{ComponentName}.test.tsx`
- Exports: If reusable, add to barrel file or `index.ts`

**Utilities:**
- Shared helpers: `lib/` for cross-cutting concerns (auth, email, AI)
- Frontend helpers: `utils/{featureName}.ts` (e.g., `utils/wordValidator.ts`)
- Backend helpers: `backend/utils/{featureName}.ts`

**Hooks:**
- Game logic: `hooks/useGame*.ts` or `hooks/gameState/`
- Socket/networking: `hooks/useSocket*.ts` or `hooks/useConnection.ts`
- UI logic: `hooks/use*.ts` following React Hook naming

**Context:**
- New global state: `contexts/{FeatureName}Context.tsx`
- Provider setup: Wrap in `app/providers.tsx`
- Custom hook: `contexts/{featureName}/hooks/use{FeatureName}.ts`

## Special Directories

**backend/handlers/:**
- Purpose: Socket.IO event handlers organized by domain
- Generated: No (manually written)
- Committed: Yes
- Pattern: Each handler file exports `register()` function that attaches event listeners

**backend/modules/:**
- Purpose: Business logic modules and managers
- Generated: No (manually written)
- Committed: Yes
- Pattern: Singleton-like modules with exported functions, state in Redis/memory

**backend/redis/:**
- Purpose: Redis client setup and key management
- Generated: No (manually written)
- Committed: Yes
- Pattern: Exports configured Redis client, utility functions for common operations

**hooks/gameState/:**
- Purpose: Zustand store and selector hooks for game state
- Generated: No (manually written)
- Committed: Yes
- Pattern: `store.ts` (Zustand), `types.ts` (TypeScript), selector hooks per concern

**.planning/codebase/:**
- Purpose: GSD (Generalist Specialist Developer) planning documents
- Generated: By `/gsd:map-codebase` command
- Committed: Yes
- Pattern: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**supabase/migrations/:**
- Purpose: Database migration scripts
- Generated: No (manually written)
- Committed: Yes
- Pattern: Numbered files (001-init.sql, 002-add-columns.sql)

---

*Structure analysis: 2026-01-22*
