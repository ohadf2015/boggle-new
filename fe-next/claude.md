# LexiClash - Project Guide

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

## Critical Constraints
- **Translation-First**: ALL UI text must use `t()` - NO hardcoded strings
- **4-Language Support**: Add translations for Hebrew, English, Swedish, Japanese
- **RTL Testing**: Always test Hebrew rendering
- **Input Validation**: Validate on BOTH frontend AND backend
- **Error Handling**: Graceful degradation on failures
- **Rate Limiting**: Prevent abuse (50 msg/10s default)
- **Resource Cleanup**: Close connections, clear timers
- **Modular Code**: Split files > 500 lines
- **Accessibility**: Follow WCAG 2.1 AA standards
- **ALWAYS refer to CLAUDE.md before making changes**
- **ALWAYS VERIFY BUILD AND TESTS PASS AFTER CHANGES**
- **ALWAYS RUN LINT (`npm run lint`) after writing new code and fix any issues**
- **ALWAYS RUN RELEVANT TESTS after implementing a feature and fix any failures**

# Investigation Protocol
- NEVER apply quick patches
- Always trace full flow before fixing  
- Use ultrathink for root cause
- Get confirmation before any fix