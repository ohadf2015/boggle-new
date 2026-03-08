# Patterns
<!-- cc10x session memory - do not delete -->

## Common Gotchas
- Scoring logic duplicated in 3 places (post-Sprint 1): shared/utils/scoring.ts (canonical), backend/modules/scoringEngine.types.ts, backend/handlers/wordHandler.ts
- Source-reading tests (toContain on raw source) break when i18n fallbacks are removed — update assertions to match t('key') pattern
- .superdesign/init/layouts.md may contain stale code examples diverging from actual components
- [Deferred]: `as any` casts in gameStateManager mode-state clearing (MINOR)
- knip reports 157 unused files and 573 unused exports
- 22+ files exceed 500-line limit (worst: useBlastGame.ts at 1782 lines)
