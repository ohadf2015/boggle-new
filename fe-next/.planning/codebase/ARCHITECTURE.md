# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Next.js 16 Full-Stack with Express + Socket.IO Backend

**Key Characteristics:**
- Frontend: Next.js 16 App Router with React 19, Server Components, Client Components
- Backend: Modular Express server with Socket.IO for real-time multiplayer
- State Management: Zustand stores + React Context (legacy) for client state
- Real-time: Socket.IO event handlers organized by domain (game, chat, presence, etc.)
- Database: Supabase + Redis (for caching and session data)
- Type Safety: TypeScript with shared types between frontend/backend

## Layers

**Presentation Layer (Frontend - React Components):**
- Purpose: Render UI and collect user input
- Location: `components/`, `app/[locale]/`
- Contains: React components (functional with hooks), page layouts, UI logic
- Depends on: Hooks, Contexts, utils, lib modules
- Used by: Next.js App Router, Server Components

**State Management Layer:**
- Purpose: Manage application state across components
- Location: `contexts/`, `hooks/`, Zustand stores in `hooks/gameState/store.ts`
- Contains: Context providers (auth, game state, music, coins, etc.), custom hooks, Zustand stores
- Depends on: Backend services, Socket events
- Used by: Components, pages

**API Layer (Backend - Express Routes):**
- Purpose: Handle HTTP requests, serve REST endpoints
- Location: `backend/routes/`
- Contains: Route handlers for leaderboard, admin, dictionary, daily-challenge, analytics, single-player
- Depends on: Modules, services, database
- Used by: Frontend API calls (`fetch`, axios)

**Real-Time Layer (Socket.IO Handlers):**
- Purpose: Handle WebSocket events for real-time game interactions
- Location: `backend/handlers/`
- Contains: Event handlers for game lifecycle, words, chat, presence, bots, tournaments
- Depends on: Modules, services, database
- Used by: Frontend Socket.IO client, game server

**Business Logic Layer (Modules & Services):**
- Purpose: Core game logic, data transformations, external integrations
- Location: `backend/modules/`, `backend/services/`, `lib/`
- Contains: Game state management, AI services, leaderboard logic, achievement tracking, bot behavior
- Depends on: Database, Redis, external APIs
- Used by: Routes, handlers

**Data Layer:**
- Purpose: Database access and caching
- Location: `lib/supabase.ts`, `backend/redisClient.ts`
- Contains: Supabase client, Redis client, query builders
- Depends on: External services (Supabase, Redis)
- Used by: Services, modules

**Server Infrastructure:**
- Purpose: HTTP server setup, middleware, health checks
- Location: `server/`
- Contains: Express app configuration, Socket.IO setup, middleware, lifecycle management
- Depends on: All layers
- Used by: Node.js process

## Data Flow

**User Authentication Flow:**

1. User lands on `app/[locale]/page.tsx`
2. `AuthContext` checks Supabase session via `@supabase/ssr`
3. If no session, user sees login options (OAuth, guest token)
4. On login: Backend generates JWT, frontend stores in secure context
5. All API requests include auth token in headers
6. Socket.IO connection inherits auth state

**Game Initialization Flow:**

1. Host creates game on `app/[locale]/multiplayer/create`
2. Frontend calls `POST /api/game-create` → Handler creates game room in Redis
3. Room ID returned, host socket joins `room:{roomId}`
4. Frontend emits `game:create` over Socket.IO
5. Handler in `backend/handlers/gameHandler.ts` creates server-side game state
6. State persisted to Redis via `backend/modules/gameStateManager.ts`
7. Players join room via `game:join` event
8. Handler broadcasts updated room state to all connected sockets

**Word Submission Flow:**

1. Player types word, submits on frontend component
2. Frontend emits `word:submit` event with word, player ID, grid path
3. Handler in `backend/handlers/wordHandler.ts` receives event
4. Validation pipeline:
   - Check dictionary via `backend/dictionary.ts`
   - If not found, check community words via `backend/modules/communityWordManager.ts`
   - If still not found, query AI validation via `lib/ai-service.ts`
5. Update game state: Add word to player's score
6. Broadcast `word:validated` event to all players with updated scores
7. Frontend updates game state via Zustand store
8. UI re-renders with new word in word list

**Multiplayer State Sync:**

1. Host has authoritative game state on backend
2. On any change (word submitted, player joined, timer tick), emit event to all players
3. Frontend Socket listener receives event
4. Updates Zustand store via `dispatch` action
5. Components subscribed to store (via `useGameActive()`, etc.) re-render
6. UI reflects new state

**Real-Time Presence Flow:**

1. Socket.IO `connection` event fired when user connects
2. Handler in `backend/handlers/connectionHandler.ts` initializes presence
3. User emits `presence:update` with status (active, idle, afk)
4. `backend/modules/presenceManager.ts` tracks user status
5. Broadcasts `presence:changed` to all players in room
6. Frontend updates presence UI (online/offline indicators)

## Key Abstractions

**GameStateManager:**
- Purpose: Centralized management of all game rooms and sessions
- Examples: `backend/modules/gameStateManager.ts`
- Pattern: Singleton module with Redis persistence
- API: `createGame()`, `getGame()`, `updateGameState()`, `cleanupEmptyRooms()`

**PresenceManager:**
- Purpose: Track player online/offline status and activity
- Examples: `backend/modules/presenceManager.ts`
- Pattern: Singleton module tracking socketId → user mappings
- API: `trackPresence()`, `getPresenceStatus()`, `markAFK()`

**WordValidationService:**
- Purpose: Multi-source word validation (dictionary, community, AI)
- Examples: `backend/dictionary.ts`, `backend/modules/communityWordManager.ts`, `lib/ai-service.ts`
- Pattern: Layered validation (fast → slow)
- API: `isValidWord()`, `getValidationReason()`

**Zustand Game Store:**
- Purpose: Client-side game state with selective re-render optimization
- Examples: `hooks/gameState/store.ts`
- Pattern: Zustand store with selector hooks to prevent unnecessary re-renders
- API: `useGameActive()`, `useGameActions()`, `useGamePlayers()`

**Socket Event Bus:**
- Purpose: Centralized event emission across application
- Examples: `contexts/SocketEventBusContext.tsx`
- Pattern: Context wrapper around Socket.IO client
- API: `emit(event, data)`, `on(event, handler)`

## Entry Points

**Frontend Entry:**
- Location: `app/[locale]/layout.tsx`
- Triggers: Browser load or navigation
- Responsibilities: Initialize providers (auth, language, game state), render app shell

**Backend Entry:**
- Location: `server/index.ts` → called from `server.ts`
- Triggers: Node.js process start
- Responsibilities: Initialize Express app, configure middleware, set up Socket.IO, register routes

**Socket Connection Entry:**
- Location: `backend/socketHandlers.ts` → `initializeSocketHandlers()`
- Triggers: User connects via Socket.IO client
- Responsibilities: Initialize rate limiting, register event handlers, set up cleanup

**Page Entry Points (Frontend):**
- Multiplayer: `app/[locale]/multiplayer/`
- Singleplayer: `app/[locale]/singleplayer/`
- Daily Challenge: `app/[locale]/daily/`
- Adventure: `app/[locale]/adventure/`
- Leaderboard: `app/[locale]/leaderboard/`
- Admin: `app/[locale]/admin/`

## Error Handling

**Strategy:** Layered error handling with user-facing messages and detailed logging

**Patterns:**

1. **Backend Route Errors:**
   - Try-catch in handler
   - Log detailed error via `backend/utils/logger.ts`
   - Return standardized error response: `{ success: false, error: string, code: string }`
   - Include error code for mapping to user messages

2. **Socket Event Errors:**
   - Handler wraps logic in try-catch
   - Emits `error` event back to client with error details
   - Logs error with context (userId, roomId, event name)
   - Continues serving other events (no crash)

3. **Frontend Errors:**
   - Error boundary in `app/components/ErrorBoundary`
   - Toast notifications via `react-hot-toast` for recoverable errors
   - Fallback UI for unrecoverable errors
   - Logs to Sentry via `@sentry/nextjs`

4. **Validation Errors:**
   - Frontend: Input validation in hooks before submission
   - Backend: Zod schemas validate request/response shape
   - Return `400 Bad Request` with field-level error details

## Cross-Cutting Concerns

**Logging:**
- Backend: `backend/utils/logger.ts` with context (source, message)
- Frontend: Console logs in development, Sentry in production
- Socket events: Logged with socketId, roomId, event name for tracing

**Validation:**
- Frontend: Custom hooks validate user input (word format, length)
- Backend: Zod schemas validate API request bodies, Socket event payloads
- Database: Supabase RLS policies enforce row-level security

**Authentication:**
- Frontend: `contexts/AuthContext.tsx` manages user session via Supabase
- Backend: JWT token validation in middleware, checked before admin operations
- Socket.IO: Socket inherits auth token from initial handshake, re-validated on sensitive events

**Rate Limiting:**
- Implemented in: `backend/utils/rateLimiter.ts`
- Applied to: API routes (50 req/10s per IP), Socket events (configurable per event)
- Strategy: IP-based with fallback to userId if authenticated
- Blocking: Returns 429 error or emits rate-limit error event

**Real-Time Sync:**
- Redis adapter for Socket.IO enables multi-server deployments
- All state changes broadcast via Socket events to all connected clients
- Zustand store on frontend subscribes to events and updates optimistically
- Optimistic UI updates with server confirmation for player feedback

---

*Architecture analysis: 2026-01-22*
