# CCGS-ported agents

Source: [Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) (MIT).

5 agents, prefixed `ccgs-` to avoid collisions. Referenced by `ccgs-*` skills in `.claude/skills/`.

## Agents

| Agent | Purpose | LexiClash fit |
|---|---|---|
| `ccgs-economy-designer` | Resource economies, loot, progression curves | Gold, streak gems, Adventure upgrades |
| `ccgs-live-ops-designer` | Post-launch content cadence, events | Daily Missions, WOTD, retention loops |
| `ccgs-localization-lead` | Translation QA, RTL, culture | 5 languages, Hebrew RTL |
| `ccgs-analytics-engineer` | Instrumentation, KPIs, dashboards | PostHog events, retention funnels |
| `ccgs-accessibility-specialist` | WCAG, a11y audits | Mobile + TV party mode |

## Path remap

Agent prompts may reference CCGS paths — remap on use per `.claude/skills/ccgs-README.md` table.

## Unported CCGS agent refs

Skills may mention `qa-lead`, `qa-tester`, `technical-director`, `art-director`, `design-director`, `production-director`, `community-manager`, etc. Treat as role, not tool. Claude improvises or use existing agents (e.g. `ui-ux-designer`, `code-reviewer`).
