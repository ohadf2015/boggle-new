# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v3.0 — Blast Mode Special Tiles Redesign

**Shipped:** 2026-03-04
**Phases:** 10 | **Plans:** 32 | **Timeline:** ~10 hours (single day)

### What Was Built
- Complete tile system overhaul: 5 reworks + 1 new tile + wildcard removal + gold tiers
- Full 28-pair combination matrix with unique synergy effects per tile pair
- Combo Codex collectible metagame (31 discoverable combos, Supabase-persisted)
- 4 psychological engagement mechanics (chain counter, near-miss shimmer, Sugar Crush, DDA)
- Per-type idle + death animations in Phaser layer for all 13 tile types
- Deterministic multiplayer sync (seeded PRNG, combo flash, codex persistence)

### What Worked
- **Audit-driven gap closure**: Running `/gsd:audit-milestone` after initial 7 phases identified 4 requirement gaps and tech debt; phases 53-55 closed them systematically
- **Research-first design**: Candy Crush/Royal Match analysis informed combination matrix design — key insight that discovery > individual effects proved correct
- **Phaser layer separation**: Tile animations in Phaser kept React components clean; bridge pattern (GameBridge pub/sub) scaled well to 13+ tile types
- **Fast execution**: 32 plans in ~10 hours (~19 min/plan average) vs v2.0's ~11 min/plan — larger plans but more confidence from established patterns

### What Was Inefficient
- **Stale checkboxes**: REQUIREMENTS.md and ROADMAP.md had 18 stale checkboxes that needed a dedicated cleanup phase (55-02). Auto-updating checkboxes on plan completion would save this
- **Wildcard removal incomplete**: Phase 47 removed wildcard from logic but not from the type union — required a separate Phase 53 gap closure. Type-level changes should be verified at type-definition site, not just usage sites
- **Outbound combo sync missed**: Phase 52 wired inbound combo flash sync but missed outbound (no parent passed `onWordWithComboType`). E2E flow testing would have caught this earlier
- **Nyquist non-compliance**: All 10 phases remained non-compliant (no `nyquist_compliant: true`). Validation infrastructure ran but was never promoted to compliant status

### Patterns Established
- **comboTypeRef pattern**: Store combo detection result in ref, read in submitWord callback — avoids stale closure in async paths
- **ddaStateRef pattern**: DDA spawn modifier in ref (not useState) — cascade callbacks read latest without re-render
- **Trust-client for display-only**: Server re-broadcasts client's `comboType` for visual sync; no gameplay impact, simpler than server-side detection
- **Codex sync**: localStorage-first, fire-and-forget POST, union-merge GET (never shrinks)

### Key Lessons
1. **Audit before shipping**: The audit caught 4 real gaps that would have shipped broken. Always audit before milestone completion.
2. **Type-level changes need type-level verification**: Removing a union member must be verified at the type definition, not just switch cases and spawn tables.
3. **E2E flow tracing catches integration bugs**: Outbound combo sync was missed because individual phase verifications passed — only full flow tracing revealed the gap.
4. **Dedicated cleanup phases are worth it**: Phase 55 (tech debt + docs) took 2 plans but ensured 35/35 requirements were accurately tracked.

### Cost Observations
- Model mix: Primarily Opus for execution, balanced profile
- Sessions: Multiple sessions on 2026-03-04
- Notable: ~19 min/plan average; 32 plans in single day demonstrates GSD velocity at scale

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Plans | Key Change |
|-----------|----------|--------|-------|------------|
| v1.0 | Pre-GSD | 35 | — | Pre-formal workflow |
| v2.0 | ~2 days | 10 | 46 | First full GSD cycle |
| v3.0 | ~10 hours | 10 | 32 | Audit-driven gap closure added |

### Cumulative Stats

| Milestone | Requirements | Satisfied | Gap Closures |
|-----------|-------------|-----------|--------------|
| v2.0 | 27 | 27/27 | 2 phases (44-45) |
| v3.0 | 35 | 35/35 | 3 phases (53-55) |

### Top Lessons (Verified Across Milestones)

1. **Gap closure phases are standard, not exceptional** — Both v2.0 and v3.0 needed 2-3 phases for gaps after main work. Budget for them.
2. **Modular architecture pays dividends** — v2.0's education module split and v3.0's combo effect organization both reduced per-plan complexity.
3. **TDD catches regression** — Contradictory test assertions in v3.0 (wildcard present vs absent) were the signal that flagged incomplete type removal.
