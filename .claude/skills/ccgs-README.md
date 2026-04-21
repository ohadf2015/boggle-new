# CCGS-ported skills

Source: [Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) (MIT).

14 skills, prefixed `ccgs-` to avoid collisions with existing skills.

## Skills

| Skill | Purpose | LexiClash fit |
|---|---|---|
| `ccgs-balance-check` | Economy/progression balance audit | Gold currency, Duel ELO, Adventure upgrades |
| `ccgs-content-audit` | Data/content consistency check | Word lists, translations, puzzle data |
| `ccgs-scope-check` | Flag scope creep in features | Use before big features |
| `ccgs-tech-debt` | Tech debt catalog + prioritization | Pairs with production-readiness audit |
| `ccgs-perf-profile` | Performance profiling walkthrough | Bundle size, React re-renders |
| `ccgs-playtest-report` | Structured playtest findings | Post-party-games, post-mode-launch |
| `ccgs-sprint-plan` | Sprint scoping | Use per retention/audit sprint |
| `ccgs-design-review` | Design review checklist | Pre-merge design sign-off |
| `ccgs-launch-checklist` | Release gate | Store submissions |
| `ccgs-patch-notes` | Patch note writing | App releases |
| `ccgs-localize` | Localization pass | 5 languages, RTL |
| `ccgs-team-live-ops` | Multi-agent live-ops sprint | Daily Missions, events |
| `ccgs-team-ui` | Multi-agent UI polish | Screen-by-screen UX sprint |
| `ccgs-team-qa` | Multi-agent QA sweep | Pre-release |

## Path remap (skills reference CCGS paths — remap on use)

| CCGS path | LexiClash equivalent |
|---|---|
| `design/gdd/` | `docs/superpowers/specs/` + `docs/templates/game-design-document.md` instances |
| `design/balance/` | `fe-next/src/data/` (word lists, scoring) + memory: `monetization-strategy.md` |
| `assets/data/` | `fe-next/public/data/`, `fe-next/src/data/` |
| `design/ux/` | `docs/templates/ux-spec.md` instances |
| `production/sprints/` | memory entries under `Active Work` |
| `docs/adr/` | `docs/adr/` (create if needed) |

## Known unsupported references

- `economy-designer` agent — ported as `ccgs-economy-designer.md` in agents/
- `live-ops-designer` agent — ported as `ccgs-live-ops-designer.md`
- `localization-lead` agent — ported as `ccgs-localization-lead.md`
- `analytics-engineer` agent — ported as `ccgs-analytics-engineer.md`
- `accessibility-specialist` agent — ported as `ccgs-accessibility-specialist.md`

Other agent refs in CCGS skills (qa-lead, technical-director, etc.) are not ported — treat as role, not tool. Claude will improvise.
