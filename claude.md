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
- 5 languages: Hebrew (RTL), English, Swedish, Japanese, Spanish
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

## Design Context
- **Users**: Mixed casual + competitive, ages 15-40, phones + TV/party screens, 5 languages (Hebrew RTL)
- **Brand**: Quirky, electric, loud — party energy + competitive edge + surprising charm
- **Aesthetic**: Neo-Brutalist refined — dark navy, hard pixel shadows, solid borders, electric color-coded modes (lime/pink/cyan/purple), Fredoka + Rubik fonts, kawaii mascot
- **Principles**: Energy with intention · Phone AND TV · Personality everywhere · Competitive clarity · Coherent chaos
- **Anti-references**: Generic mobile game UI, soft gradients, glassmorphism, corporate aesthetics
- **Full context**: See [.impeccable.md](.impeccable.md)
