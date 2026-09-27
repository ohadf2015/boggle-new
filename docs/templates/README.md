# Doc Templates

Source: [Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) (MIT). Adapted for LexiClash (Next.js word game).

## How to use

Copy template → `docs/superpowers/specs/YYYY-MM-DD-<topic>.md` or relevant docs dir. Fill in. Reference from memory/PR.

## High-value for LexiClash

- **economy-model.md** — gold, streak gems, Adventure upgrades, monetization
- **game-design-document.md** / **game-pillars.md** — anchor for mode decisions
- **architecture-decision-record.md** — ADR for infra/stack moves (Drizzle, tRPC, TanStack)
- **ux-spec.md** / **hud-design.md** / **interaction-pattern-library.md** — UI/UX specs
- **player-journey.md** — onboarding, retention, funnel
- **sprint-plan.md** / **milestone-definition.md** / **post-mortem.md** — production
- **release-checklist-template.md** / **release-notes.md** — app releases
- **incident-response.md** / **risk-register-entry.md** — prod ops
- **accessibility-requirements.md** — a11y audits
- **test-plan.md** / **test-evidence.md** — QA

## Low-value (skip unless scope expands)

- faction-design.md, narrative-character-sheet.md, sound-bible.md, level-design-document.md — console-game shaped
- skill-test-spec.md — meta Claude Code tooling
- architecture-doc-from-code.md — generator output format

## Subdirs

- `collaborative-protocols/` — multi-agent handoff protocols (review if adopting director tier)
