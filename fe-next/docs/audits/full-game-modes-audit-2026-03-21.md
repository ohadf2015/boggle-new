# LexiClash Full Game Modes Audit — 2026-03-21

## Team of 6 Experts
| Expert | Issues Found |
|--------|-------------|
| Game Design | 4 CRITICAL, 10 HIGH, 5 MEDIUM |
| UX/UI | 2 CRITICAL, 6 HIGH, 10 MEDIUM, 16 LOW |
| Code Quality | 2 CRITICAL, 18 HIGH, 10 MEDIUM |
| Performance | 2 CRITICAL, 6 HIGH, 10 MEDIUM |
| Backend/Multiplayer | 3 CRITICAL, 8 HIGH, 9 MEDIUM, 5 LOW |
| Engagement/Growth | 5 CRITICAL, 6 HIGH, 6 MEDIUM |

**Total: 18 CRITICAL, 54 HIGH, 50 MEDIUM, 21 LOW = 143 issues found**

## Fixes Applied (4 Sprints)

### Sprint 1 — Backend Safety (7 fixes)
1. Timer key mismatch in gameEnd.ts (CRITICAL)
2. Duel TOCTOU race in lifecycle.ts (HIGH)
3. Grid size DoS in socketValidation.ts (MEDIUM)
4. Classroom auth bypass in classroomGameHandler.ts (MEDIUM)
5. useParallax RAF leak in WorldMap+LevelGrid (CRITICAL perf)
6. Challenge mode i18n — 3 hardcoded strings (CRITICAL)
7. Translations in all 5 languages

### Sprint 2 — Engagement Wiring (6 features)
8. oneMoreGame socket → frontend toast
9. Comeback Bonus UI modal for returning players
10. NextStepPrompt in Blast + Word Hunt results
11. Brain Drills → XP + gold economy
12. Streak freeze indicator in Daily results
13. EmojiShareCard ported to Classic Daily + Blast

### Sprint 3 — Game Design Rebalance (7 changes)
14. Word Hunt wrong-guess penalty: 5 → 15 pts
15. Word Hunt first-finder bonus: 35 → 20 pts
16. Word Hunt board-word scoring: 0 → length*2 pts
17. Word Hunt 3s grace period (already existed)
18. Drills scoring: word.length*10 → canonical engine
19. Blast wave thresholds: 50/80/120 → 150/250/400
20. Blast MP board-clear celebration enabled

### Sprint 4 — UX/UI + Performance (4 fixes)
21. AdaptiveMotion migration: 14 files (daily survival, word hunt, custom puzzle)
22. Focus traps: 4 education modals + DuelChallengeModal
23. Adventure setTimeout cleanup (leaked hint timer)
24. Adventure timer store (useSyncExternalStore isolates TICK re-renders)

## Final Stats
- 1061 test suites, 12,323 tests passing
- Build compiles successfully
- 50+ files modified across 5 languages
- ~15 new test files added

## Remaining Issues (deferred)
- 25 files over 500-line limit (Sprint 5)
- useSafeInterval adoption (~15% → target 100%)
- Challenge mode + Custom puzzle API tests (0 coverage)
- Blast→Singleplayer hook import coupling
- Drill level persistence (cross-session)
- RareGems rarity classification (uses length not frequency)
- Adventure timer re-render isolation (partially done via timerStore)
