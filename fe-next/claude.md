# LexiClash - Project Guide

> **Be extremely concise. Sacrifice grammar for brevity.**

## Tech Stack
- **Framework**: Next.js 16.0.7 with App Router
- **Language**: TypeScript 5.9.3 (mixed JS/TS codebase)
- **Runtime**: Node.js 18.0.0+ with Express 5.1.0
- **Styling**: Tailwind CSS 3.4.18 + SCSS
- **UI Components**: Radix UI, Framer Motion
- **Real-time**: Socket.IO 4.8.1
- **Database**: Supabase + Redis (ioredis)
- **Validation**: Zod

## Project Structure
- `app/`: Next.js App Router with `[locale]/` dynamic routing
- `backend/`: Express + WebSocket server (handlers, modules, utils)
- `components/`: React UI components
- `host/` & `player/`: View-specific components
- `contexts/`: React Context providers
- `hooks/`: Custom React hooks
- `utils/`: Frontend utilities
- `translations/`: i18n content (4 languages)
- `lib/`: Library utilities
- `server/`: Modular server orchestration

## Commands
- `npm run dev`: Development server
- `npm run build`: Production build
- `npm run start`: Production server
- `npm run lint`: ESLint check
- `npm run test`: All tests (backend + frontend)
- `npm run test:backend`: Jest backend tests
- `npm run test:frontend`: Jest frontend tests
- `npm run test:watch`: Watch mode
- `npm run test:coverage`: Coverage report
- `npm run test:e2e`: Playwright E2E tests
- `npm run db:migrate`: Run Supabase migrations

## Code Style
- Functional components with hooks only
- Use `t('key')` from LanguageContext for ALL UI text
- Tailwind-first styling (SCSS for complex styles)
- Radix UI for accessible components
- camelCase variables, PascalCase components
- Keep components < 300 lines (split larger ones)

## Design System (Neo-Brutalist "Jackbox Party Pack" Style)

**Theme Philosophy**: Dark-only, bold, playful, high-contrast

**Hard Shadows (NO blur - critical):**
- Use `shadow-hard-*` utilities: `shadow-hard-sm`, `shadow-hard`, `shadow-hard-lg`
- Example: `shadow-hard` = `4px 4px 0px black`
- Pressed state: `shadow-hard-pressed` (2px offset)
- RTL: Shadows auto-flip for Hebrew (`-4px 4px 0px`)

**Chunky Borders:**
- Use `border-neo` (3px) or `border-neo-thick` (4px) with black
- Border radius: `rounded-neo` (4px), minimal rounding

**Color Palette:**
- Primary: `neo-yellow` (#FFE135)
- Secondary: `neo-orange` (#FF6B35)
- Accent: `neo-pink` (#FF1493), `neo-cyan` (#00FFFF)
- Background: `neo-navy` (#1a1a2e)
- Text: `neo-white` (#FFFFFF)

**Typography:**
- Display: Fredoka (`font-neo-display`)
- Body: Rubik (`font-neo-body`)

**Animation Classes:**
- `animate-neo-press` - button press effect
- `animate-neo-pop` - entrance pop
- `animate-neo-wobble` - playful wobble
- `animate-neo-shake` - error shake

**Halftone Texture:** Body has subtle dot pattern overlay, use `texture-halftone` class

## Responsive Design (Modern CSS)

**Prefer Container Queries over Viewport Units:**
- Use `@container` queries for component-level responsiveness
- Container query units adapt to parent container, not viewport

**Container Query Units (prefer these):**
- `cqw` - 1% of container's width
- `cqh` - 1% of container's height
- `cqi` - 1% of container's inline size
- `cqb` - 1% of container's block size
- `cqmin` - smaller of `cqi` or `cqb`
- `cqmax` - larger of `cqi` or `cqb`

**When to Use:**
- `cqw`/`cqh` for font sizes, padding, margins that scale with container
- `cqi` for text/inline elements (respects writing direction)
- `cqmin` for square-ish scaling that works in any orientation

**Setup Container:**
```css
.container { container-type: inline-size; }
/* or */
.container { container: card / inline-size; }
```

**Tailwind Usage:**
- Use `@container` variant: `@container/card:text-lg`
- Arbitrary values: `text-[3cqw]`, `p-[2cqi]`

**Avoid:**
- `vw`/`vh` for component internals (use for full-page layouts only)
- Fixed pixel values for responsive elements

## Critical Constraints
- **Translation-First**: ALL UI text must use `t()` - NO hardcoded strings
- **4-Language Support**: Add translations for Hebrew, English, Swedish, Japanese
- **RTL Testing**: Always test Hebrew rendering
- **Input Validation**: Validate on BOTH frontend AND backend
- **Error Handling**: Graceful degradation on failures
- **Rate Limiting**: Prevent abuse (50 msg/10s default)
- **Resource Cleanup**: Close connections, clear timers
- **Modular Code**: NEVER create files > 500 lines. Split into logical units and modules (hooks, utils, sub-components). Each file should have a single responsibility
- **Accessibility**: Follow WCAG 2.1 AA standards
- **Image Optimization**: Daily Buzz images MUST:
  - Use WebP format with quality 80 (not 90) and effort 6
  - Target file size <200KB (re-compress if needed)
  - Include SEO-friendly alt text describing the trending topic
  - Use trends selected for challenges (not all filtered trends)
  - Prevent hex codes/technical notation in AI prompts
- **ALWAYS refer to CLAUDE.md before making changes**
- **ALWAYS VERIFY BUILD AND TESTS PASS AFTER CHANGES**
- **ALWAYS RUN LINT (`npm run lint`) after writing new code and fix any issues**
- **ALWAYS RUN RELEVANT TESTS after implementing a feature and fix any failures**
- **MANDATORY TESTING**: Every new component and logic MUST have corresponding tests. No exceptions.
- **TEST FAILURE PROTOCOL**: When a test fails, FIRST analyze if the failure is expected behavior or if the test discovered a bug. If the test found a legitimate bug in the code, FIX THE BUG - never modify the test to make it pass. Tests are the source of truth for expected behavior.

## Development Workflow

1. **Before coding**: Read relevant files, understand architecture
2. **While coding**: Follow TDD (test first, then implement)
3. **After coding**: Run `npm run lint && npm run test && npm run build`
4. **Before committing**: Verify all checks pass

**Detailed coding standards in `.claude/rules/`:**
- General principles: `.claude/rules/00-general.md`
- Git workflow: `.claude/rules/10-git.md`
- TDD enforcement: `.claude/rules/22-tdd-strict.md`
- Security: `.claude/rules/40-security.md`

## Backend Patterns

### WebSocket Handlers
Located in `backend/handlers/`:
- Use `createHandler(name, schema)` for validation (Zod)
- Rate limit: `backend/middleware/rateLimit.ts` (50 msg/10s default)
- Error format: `{ error: 'ERROR_CODE', message: 'Human-readable' }`
- Handler structure:
  ```typescript
  export const myHandler = createHandler('my-event', schema,
    async (socket, data, context) => {
      // Validated data, auto-typed
      // Return response or throw error
    }
  );
  ```

### Rate Limiting
- Default: 50 messages per 10 seconds per socket
- Configure: `backend/config/rateLimits.ts`
- Bypass: Set `DISABLE_RATE_LIMIT=true` in `.env.local` (dev only)
- Custom limits: Pass `rateLimit` option to `createHandler()`

### Testing Backend
```bash
npm run test:backend         # Run backend tests
npm run test:backend:watch   # Watch mode
```

**Test structure:**
- Unit tests: `backend/**/*.test.ts`
- Integration tests: `backend/**/*.integration.test.ts`
- Mocks: Use `jest.mock()` for Redis, Supabase

**Common patterns:**
- Mock SocketIO: `import { createMockSocket } from 'backend/test-utils'`
- Mock Redis: Auto-mocked via `__mocks__/ioredis.ts`
- Test cleanup: `afterEach(() => jest.clearAllMocks())`