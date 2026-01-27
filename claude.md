# LexiClash - Project Overview

**See [fe-next/CLAUDE.md](fe-next/CLAUDE.md) for detailed coding standards, design system, and technical architecture.**

## Quick Start

- **Main Directory**: `fe-next/` - Next.js frontend application
- **Development**: `npm run dev` (in fe-next/)
- **Testing**: `npm run test` (runs all tests)
- **Build**: `npm run build`

## Project Structure

```
boggle-new/
├── fe-next/              # Next.js frontend application
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── backend/          # Express server & WebSocket handlers
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React Context providers
│   ├── translations/     # i18n (Hebrew, English, Swedish, Japanese)
│   ├── CLAUDE.md         # MAIN REFERENCE - Read this for all standards
│   └── package.json
├── docs/                 # Project documentation
├── .claude/              # Claude Code configuration
└── README files          # Essential documentation only
```

## Key Resources

- **Code Standards & Design System**: [fe-next/CLAUDE.md](fe-next/CLAUDE.md)
- **Tech Stack**:
  - Frontend: Next.js 16, React, TypeScript, Tailwind CSS
  - Backend: Express, Socket.IO, Node.js
  - Database: Supabase + Redis
  - Testing: Jest, Playwright

## Critical Guidelines

1. **All UI text must use translation keys** - No hardcoded strings
2. **Support 4 languages**: Hebrew (RTL), English, Swedish, Japanese
3. **Neo-Brutalist design** - Dark, bold, high-contrast style
4. **Tests are mandatory** - Every feature needs tests
5. **Type safety** - No `any` types allowed
6. **Keep files modular** - Max 500 lines per file

## Before Making Changes

1. Read [fe-next/CLAUDE.md](fe-next/CLAUDE.md) - it contains all technical decisions
2. Verify tests pass: `npm run test`
3. Verify build passes: `npm run build`
4. Run linter: `npm run lint`

## Development Rules

This project follows strict coding standards. See `.claude/rules/` for details:
- **General**: `.claude/rules/00-general.md` - Universal development principles
- **Git**: `.claude/rules/10-git.md` - Branching, commits, PRs
- **Testing**: `.claude/rules/20-testing.md`, `.claude/rules/22-tdd-strict.md`
- **Documentation**: `.claude/rules/30-documentation.md`
- **Security**: `.claude/rules/40-security.md`

## PIV Methodology

This project uses **PIV (Prime-Implement-Validate)**:
1. **Prime**: Understand codebase before coding
2. **Implement**: Follow TDD (RED-GREEN-REFACTOR)
3. **Validate**: Run tests, linting, build

**MANDATORY TDD**: All code must have tests written FIRST. No exceptions.
See `.claude/rules/22-tdd-strict.md` for enforcement details.

## Environment Setup

Required services:
- **Redis**: `brew install redis && redis-server`
- **Supabase**: Project URL and anon key in `.env.local`
- **Node.js**: 18.0.0+

```bash
# Install dependencies
cd fe-next && npm install

# Setup environment
cp .env.example .env.local
# Add SUPABASE_URL, SUPABASE_ANON_KEY, REDIS_HOST
```

## Common Gotchas

### RTL (Hebrew) Issues
- Always test Hebrew rendering with `?locale=he`
- Shadows auto-flip: `shadow-hard` becomes `-4px 4px 0px` in RTL
- Use logical properties: `inline-start` not `left`

### Translation Keys
- **NEVER** hardcode UI text
- Always use `t('key')` from LanguageContext
- Missing translations show key name in dev (check console)

### WebSocket Reconnection
- Backend handles reconnection automatically
- Frontend uses `socket.io-client` with auto-reconnect
- Rate limiting: 50 messages per 10 seconds per client
- Test disconnection: Stop Redis or Express server

## Important Notes

- This project is a multi-language word game with real-time multiplayer features
- Architecture prioritizes maintainability and clarity over cleverness
- All code follows SOLID principles and DRY methodology
- Documentation is crucial - keep it updated
