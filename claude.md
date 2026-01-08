# LexiClash - Project Overview

**See [fe-next/claude.md](fe-next/claude.md) for detailed coding standards, design system, and technical architecture.**

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
│   ├── claude.md         # MAIN REFERENCE - Read this for all standards
│   └── package.json
├── docs/                 # Project documentation
├── .claude/              # Claude Code configuration
└── README files          # Essential documentation only
```

## Key Resources

- **Code Standards & Design System**: [fe-next/claude.md](fe-next/claude.md)
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

1. Read [fe-next/claude.md](fe-next/claude.md) - it contains all technical decisions
2. Verify tests pass: `npm run test`
3. Verify build passes: `npm run build`
4. Run linter: `npm run lint`

## Important Notes

- This project is a multi-language word game with real-time multiplayer features
- Architecture prioritizes maintainability and clarity over cleverness
- All code follows SOLID principles and DRY methodology
- Documentation is crucial - keep it updated
