# LexiClash - Project Guide

> **Be extremely concise. Sacrifice grammar for brevity.**

## Critical Constraints
- **Translation-First**: ALL UI text must use `t()` - NO hardcoded strings
- **5-Language Support**: Hebrew, English, Swedish, Japanese, Spanish
- **RTL Testing**: Always test Hebrew rendering
- **Input Validation**: Validate on BOTH frontend AND backend
- **Rate Limiting**: 50 msg/10s default
- **Resource Cleanup**: Close connections, clear timers
- **Modular Code**: NEVER create files > 500 lines
- **Accessibility**: WCAG 2.1 AA
- **ALWAYS VERIFY BUILD AND TESTS PASS AFTER CHANGES**
- **ALWAYS RUN LINT (`npm run lint`) after writing new code**
- **MANDATORY TESTING**: Every new component and logic MUST have tests
- **TEST FAILURE PROTOCOL**: If a test fails, first analyze whether it discovered a bug — if so, fix the bug, never the test. Tests are source of truth.
- **Supabase Realtime publication**: NEVER add a table to `supabase_realtime` publication without a matching `supabase.channel(...).on('postgres_changes', ...)` consumer in code. WAL→JSON parsing fires per-write even with zero subscribers (caused 95% DB CPU regression on 2026-05-06). Audit: `SELECT * FROM public.v_suspicious_realtime_publications;` — must return 0 rows.

## Tech Stack
Next.js 16.0.7 App Router · TypeScript 5.9.3 (mixed JS/TS) · Node 18+ · Express 5.1 · Tailwind 3.4 + SCSS · Radix + Framer Motion · Socket.IO 4.8 · Supabase + Redis (ioredis) · Zod

## Code Style
- Functional components + hooks only
- `t('key')` from LanguageContext for ALL UI text
- Tailwind-first (SCSS for complex)
- camelCase vars, PascalCase components
- Components < 300 lines

## Commands
- `npm run dev` · `npm run build` · `npm run start`
- `npm run lint` · `npm run test` (all) · `npm run test:backend` · `npm run test:frontend`
- `npm run test:watch` · `npm run test:coverage` · `npm run test:e2e`
- `npm run db:migrate`

## Project Structure
- `app/`: Next App Router with `[locale]/` dynamic routing
- `backend/`: Express + WebSocket server (handlers, modules, utils)
- `components/` · `host/` · `player/`: React UI
- `contexts/` · `hooks/` · `utils/` · `lib/`
- `translations/`: i18n (5 languages)
- `server/`: Modular server orchestration

## Development Workflow
1. Read relevant files, understand architecture
2. TDD (test first, then implement)
3. Run `npm run lint && npm run test && npm run build`
4. Verify before committing

**Coding rules in `.claude/rules/`:**
- `00-general.md` · `10-git.md` · `22-tdd-strict.md` · `40-security.md`

## Load on Demand
@.claude/docs/design-system.md
@.claude/docs/responsive-design.md
@.claude/docs/backend-patterns.md
@.claude/notes/android-release-status.md
