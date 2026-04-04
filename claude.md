# LexiClash - Project Overview

> **Be extremely concise. Sacrifice grammar for brevity.**

> **Primary codebase is `fe-next/`** - See [fe-next/CLAUDE.md](fe-next/CLAUDE.md) for all standards.

## Quick Start
```bash
cd fe-next && npm install && npm run dev
```

## Tech Stack
Next.js 16 | TypeScript | Tailwind | Express | Socket.IO | Supabase | Redis | Vitest+Jest/Playwright

## Critical Guidelines
- All UI text: `t('key')` - NO hardcoded strings
- 4 languages: Hebrew (RTL), English, Swedish, Japanese
- TDD mandatory: Test first, then implement
- Max 500 lines per file
- Run `npm run lint && npm run test && npm run build` after changes

## Environment
- Redis: `brew install redis && redis-server`
- Copy `.env.example` → `.env.local`, add Supabase keys

## Project Structure
```
boggle-new/
├── fe-next/           # Main codebase (Next.js + Express backend)
│   └── CLAUDE.md      # DETAILED STANDARDS - Read this
├── docs/              # Documentation & archives
└── .claude/rules/     # Coding standards (TDD, Git, Security)
```

## Common Gotchas
- **RTL**: Test Hebrew with `?locale=he`, shadows auto-flip
- **Translations**: Use `t('key')`, never hardcode text
- **WebSocket**: Rate limit 50 msg/10s, auto-reconnect enabled
