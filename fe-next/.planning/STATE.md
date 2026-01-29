# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Adventure mode must feel immersive and connected to its themed worlds
**Current focus:** Phase 21 - Rich Lesson Delivery (next up)

## Current Position

Phase: 21 of 25 (Rich Lesson Delivery) — IN PROGRESS
Plan: 5/6 complete (21-01, 21-02, 21-03, 21-04, 21-05)
Status: Phase 21 in progress - Swipeable flashcard stack complete
Last activity: 2026-01-29 — Completed 21-04 (Swipeable Flashcard Stack)

Progress: [██████████████] 21/25 phases (84% milestone, v1.1 Phase 15-21 in progress, v1.2 Phase 24-25 complete)

## Performance Metrics

**Velocity (v1.0 baseline):**
- Total plans completed: 62
- Average duration: Not tracked in v1.0
- Total execution time: 4 days (2026-01-21 to 2026-01-25)

**By Phase (v1.0):**

| Phase | Plans | Status |
|-------|-------|--------|
| 1-14 | 62 | Complete |

**v1.1 Progress:**
- Plans completed: 36 (Phase 15-20 complete, Phase 21 5/6)
- Current phase: 21 (Rich Lesson Delivery) — IN PROGRESS
- Next: Phase 21 plan 06

**Phase 15 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 15-01 | Chain Tile Calculation | 17min | Complete |
| 15-02 | Combo Tier Feedback | 13min | Complete |
| 15-03 | Chain Particle Effects | 17min | Complete |
| 15-04 | Chain Cascade Animation | 6min | Complete |
| 15-05 | Adventure Game Integration | 14min | Complete |

**Phase 15 Total:** 67 minutes, 83 tests added

**Phase 16 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 16-01 | Boss HP Tracking | 12min | Complete |
| 16-02 | Boss HP Bar UI | 11min | Complete |
| 16-03 | Boss Overlay Integration | 14min | Complete |
| 16-04 | PopQuiz Mechanic Verification | 9min | Complete |

**Phase 16 Total:** 46 minutes, 57 tests added

**Phase 17 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 17-01 | Mechanic Test Coverage | 3min | Complete |
| 17-02 | finalWord Mechanic Tests | 3min | Complete |
| 17-03 | scrambledReality Anagram Enhancement | 4min | Complete |
| 17-04 | Stub Mechanic Tests | 2min | Complete |
| 17-05 | Boss Integration Tests | 26min | Complete |

**Phase 17 Total:** 38 minutes, 230 tests added

**Phase 18 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 18-01 | Education XP Foundation | 5min | Complete |
| 18-02 | XP Hook and Translations | 6min | Complete |
| 18-03 | Progress UI Components | 11min | Complete |
| 18-04 | LevelUpCelebration Component | 6min | Complete |
| 18-05 | Practice XP Integration | 7min | Complete |

**Phase 18 Total:** 35 minutes, 114 tests added (15 new in 18-05)

**Phase 19 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 19-01 | Achievement System Foundation | Previously completed | Complete |
| 19-02 | Classroom Leaderboard | 6min | Complete |
| 19-03 | Achievement Unlock Detection & Celebration | 6min | Complete |
| 19-04 | Profile Badge Display | 8min | Complete |
| 19-05 | Student Dashboard Integration | 12min | Complete |

**Phase 19 Total:** 32 minutes (20min active work), 123 tests added, verification passed 5/5

**Phase 24 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 24-01 | Audio Lazy Loading | TBD | Complete |
| 24-02 | Visual Consistency Fixes | 5min | Complete |
| 24-03 | SDK Lifecycle Integration | 3min | Complete |
| 24-04 | Multiplayer Invites | 7min | Complete |
| 24-05 | Testing & Compliance | 8min | Complete |
| 24-06 | Enhanced SDK Integration | 35min | Complete |
| 24-07 | OAuth Hiding Gap Closure | 11min | Complete |

**Phase 24 Total:** 69 minutes (excluding 24-01 TBD), 68 tests added, CrazyGames portal integration COMPLETE with OAuth hiding

**Phase 25 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 25-01 | Capacitor Installation | 4min | Complete |
| 25-02 | Platform Detection & Native Features | 10min | Complete |
| 25-03 | Safe Area & Offline Fallback | 20min | Complete |
| 25-04 | Native Build Testing | 10min | Complete |
| 25-05 | Wire Orphaned Native Integrations | 8min | Complete |
| 25-06 | Generic Haptics Abstraction Layer | 18min | Complete |

**Phase 25 Total:** 70 minutes, 118 tests added (25 new in 25-06), native app infrastructure COMPLETE

**Phase 20 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 20-01 | Analytics Foundation TDD | 7min | Complete |
| 20-02 | MetricCard + AnalyticsDashboard | 20min | Complete |
| 20-03 | StudentProgressTable | 13min | Complete |
| 20-04 | Lesson Effectiveness Chart | 6min | Complete |
| 20-05 | Vocabulary Mastery Heatmap | 11min | Complete |
| 20-06 | Realtime + Integration | 70min | Complete |

**Phase 20 Total:** 127 minutes, 144 tests added, verification passed 5/5

**Phase 21 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 21-01 | Text-to-Speech Service | 6min | Complete |
| 21-02 | Enriched Vocabulary Card | 15min | Complete |
| 21-03 | Swipe Gesture Hook | TBD | Complete |
| 21-04 | Swipeable Flashcard Stack | 10min | Complete |
| 21-05 | Daily Buzz Context Service | 15min | Complete |
| 21-06 | Lesson Assignment UI | - | Pending |

**Phase 21 Total (so far):** 46 minutes, 78 tests added (5/6 plans complete)

## Accumulated Context

### Decisions

Key decisions affecting v1.1 work (see PROJECT.md for full log):

- **v1.0**: Focus on Worlds 1-3 only → Ship polished subset before expanding (Good)
- **v1.0**: Skip boss battles for now → Core adventure loop more important (Good)
- **v1.0**: Combined parallax (gyro+gesture+ambient) → "Always alive" feel (Good)
- **v1.0**: Education as separate section → Distinct flow from main game (Good)
- **v1.1**: Research-informed phase ordering → Combo foundation before bosses/XP (prevents rework)
- **15-01**: Math.round for chain bonus → Handles floating point precision (0.1 * 1.5 issue) (2026-01-25)
- **15-01**: Chain tile structural sharing → Only clone affected rows, 25-57% memory reduction (2026-01-25)
- **15-02**: Tier thresholds 2/4/7/10 → Progressive feel, not linear (2026-01-25)
- **15-03**: Particle counts 4/12/20 for device tiers → Balance satisfaction with performance (2026-01-25)
- **15-04**: 50ms stagger for chain cascades → Slower than regular 30ms for visual emphasis (2026-01-25)
- **15-05**: useRef for grid position calculation → Enables accurate particle positioning (2026-01-25)
- **16-01**: 5-phase state machine (intro/active/enraged/victory/defeat) → Clear game flow stages (2026-01-25)
- **16-01**: Enraged at 25% HP → Industry standard, creates urgency without feeling unfair (2026-01-25)
- **16-01**: Combo multiplier 1 + (count * 0.1) → Linear scaling, predictable damage calculation (2026-01-25)
- **16-01**: useRef pattern for phase → Avoids closure issues in batched React state updates (2026-01-25)
- **16-02**: Spring physics for HP animation → Smooth, natural-feeling HP depletion enhances battle feedback (2026-01-25)
- **16-02**: Green → Red color transition → Universal color language (healthy → danger), better accessibility (2026-01-25)
- **16-02**: Hide HP bar during intro/victory/defeat → Cleaner UI, reduced visual clutter (2026-01-25)
- **16-03**: Boss damage formula (score/10 * combo * mechanic) → Scales word scores to HP pool, rewards strategic play (2026-01-25)
- **16-03**: BossOverlay compound component → Encapsulates all boss UI, reduces AdventureGame.tsx complexity (2026-01-25)
- **16-03**: Mechanic multiplier 2x when met → Rewards strategic play without making non-mechanic words useless (2026-01-25)
- **17-01**: Boss mechanic test isolation pattern → One test file per mechanic for targeted testing (2026-01-25)
- **17-03**: areAnagrams uses sorted letter comparison → Excludes same word (LISTEN vs LISTEN) (2026-01-25)
- **17-03**: scrambledReality fallback to unique letters >= 4 → When no anagram pair found (2026-01-25)
- **17-05**: jest.requireActual for hook integration tests → Bypass module mocks to test real hooks in same file (2026-01-25)
- **18-01**: Mastery messages before XP amounts → Research pitfall 1: extrinsic rewards undermine intrinsic motivation (2026-01-25)
- **18-01**: Math.round for streak bonus → Floating point precision (0.75 * 70 = 52.5) (2026-01-25)
- **18-01**: Migration 062 (not 059) → 059 already exists (adventure_level_attempts) (2026-01-25)
- **18-02**: pendingUpdate pattern → Hook tracks pending updates, database persistence deferred to Plan 05 (2026-01-25)
- **18-02**: useMemo for xpProgress → Derived state recalculates only when totalXp changes (2026-01-25)
- **18-02**: Streak update on every practice → Builds loss aversion for intrinsic motivation (2026-01-25)
- **18-04**: fireLevelUpConfetti preset → Consistent celebration effect using neo-brutalist palette (2026-01-25)
- **18-04**: useId for aria-labelledby → React 18 hook for guaranteed unique accessibility IDs (2026-01-25)
- **18-03**: Neo-yellow for XP progress fill → High visibility against neo-navy background (2026-01-25)
- **18-03**: Neo-orange for streak badge → Differentiate from XP progress bar (2026-01-25)
- **18-03**: Streak bonus thresholds 7/14/30 → +50%/+75%/+100% XP multipliers (2026-01-25)
- **18-05**: PracticeSessionProvider context → Wraps practice activities with XP state and persistence (2026-01-25)
- **18-05**: Fixed XP header during practice → Progress bar and streak visible without disrupting UI (2026-01-25)
- **18-05**: Optional xpSessionData prop → Practice components work with or without XP integration (2026-01-25)
- **19-01**: 18 achievements total → Balanced across 4 categories (5 progress, 4 skill, 5 consistency, 4 exploration) (2026-01-25)
- **19-01**: 2 secret achievements → streak_champion and word_variety hide progress until bronze unlock (2026-01-25)
- **19-01**: 4-tier progression → Bronze/Silver/Gold/Platinum with specific thresholds per achievement (2026-01-25)
- **19-01**: >= comparison for tiers → Includes exact threshold match using Math.min pattern (2026-01-25)
- **19-01**: RLS classmate access → Students can view achievements of classmates in same classroom for leaderboard (2026-01-25)
- **19-01**: getProgressValue mapping → Maps achievement key to student metric (e.g., first_lesson → lessonsCompleted) (2026-01-25)
- **19-03**: FIFO queue for unlock management → Multiple unlocks wait in order, one celebration at a time (2026-01-29)
- **19-03**: Tier-based UI prominence → Bronze/Silver toast (auto-dismiss 3s), Gold/Platinum full modal (2026-01-29)
- **19-03**: localStorage persistence → Prevents re-showing acknowledged unlocks on page refresh (2026-01-29)
- **19-03**: Conditional confetti/sound → Only Gold/Platinum tiers for performance + special feeling (2026-01-29)
- **19-05**: Dynamic import ClassroomLeaderboard → Prevents SSR issues with framer-motion on older mobile browsers (2026-01-29)
- **19-05**: Achievement check after XP persistence → Ensures database updated before checking for unlocks (2026-01-29)
- **19-05**: XP manager for level calculation → Profile page uses getXpProgress directly for accuracy (2026-01-29)
- **24-02**: CSS isolation with 'all: initial' → Prevents parent frame styles from bleeding through iframe (2026-01-26)
- **24-02**: 100vh/100dvh fallback pattern → 100vh = parent height, 100dvh = iframe height (2026-01-26)
- **24-02**: Viewport hook delegation → Separate concerns, reusable outside provider (2026-01-26)
- **24-03**: Throttled happytime (30s) → CrazyGames SDK recommendation to avoid spamming happiness events (2026-01-26)
- **24-03**: Visibility API for tab pause → Accurate gameplay time measurement, better ad timing (2026-01-26)
- **24-03**: Dev mode lifecycle logging → Makes debugging lifecycle issues easier during QA (2026-01-26)
- **24-04**: Auto-hide invite button based on room state → Better UX, removes invite when room full or game starts (2026-01-26)
- **24-04**: Optional room lifecycle parameters → Backward compatibility, hook works without parameters (2026-01-26)
- **24-04**: SDK loading state in MultiplayerFlow → Prevents UI flash when instant multiplayer/invite redirects (2026-01-26)
- **24-06**: Ads only at natural break points → Never interrupt gameplay, better UX (2026-01-26)
- **24-06**: Audio mute during ads via Howler → Platform requirement, automatic management (2026-01-26)
- **24-06**: Cloud save for CrazyGames users → Dual persistence (CG data module + Supabase fallback) (2026-01-26)
- **24-06**: Platform mute syncs with Howler → Respects user's platform-level audio preference (2026-01-26)
- **24-06**: Happytime triggers for achievements → Better platform analytics, visibility boost (2026-01-26)
- **24-07**: Skip settings sync implementation → SDK v3 lacks game.settings API, audio mute handled per-ad instead (2026-01-26)
- **24-07**: CrazyGames SDK auth only → External OAuth (Google/Discord) hidden on platform, showAuthPrompt() integration (2026-01-26)
- **25-01**: WebView approach for native apps → Preserves SSR, Server Components, Socket.IO without code changes (2026-01-26)
- **25-01**: Do NOT install @capacitor/http → Prevents Socket.IO WebSocket breakage (2026-01-26)
- **25-01**: Gitignore /ios/ and /android/ → Large native projects should be regenerated, not committed (2026-01-26)
- **25-01**: CAPACITOR_DEV_URL env var → Enables local development testing against localhost (2026-01-26)
- **25-02**: Try-catch wrapper for Capacitor → Tree-shaking safe platform detection without complex imports (2026-01-26)
- **25-02**: Native → Web → Silent fail haptics → Progressive enhancement ensures best UX on all platforms (2026-01-26)
- **25-02**: useRef for lifecycle callbacks → Latest callback version without listener re-registration (2026-01-26)
- **25-02**: Async listener registration → Matches Capacitor API (Promise<PluginListenerHandle>) (2026-01-26)
- **25-03**: Combined safe area approach → max() merges env() fallback with Capacitor plugin values (2026-01-26)
- **25-03**: Async listener cleanup → Store handle in local variable, cleanup in effect return (2026-01-26)
- **25-03**: Full-screen offline fallback → Branded neo-brutalist design maintains UX consistency (2026-01-26)
- **25-04**: Bash scripts wrapped by npm → Complex build logic easier in bash, npm provides convenience (2026-01-26)
- **25-04**: --release flag for production → Explicit opt-in prevents accidental release builds (2026-01-26)
- **25-04**: Xcode for iOS debug, CLI for release → Better debugging UX, automation for distribution (2026-01-26)
- **25-04**: Environment variables for credentials → Never commit secrets, explicit configuration (2026-01-26)
- **25-05**: NetworkStatusHandler only activates in native → Web browsers have built-in offline indicators (2026-01-26)
- **25-05**: NetworkStatusHandler wraps NativeAppProvider → Offline fallback needs LanguageContext for translations (2026-01-26)
- **25-05**: Socket reconnects on foreground, not disconnect on background → iOS/Android handle connections appropriately (2026-01-26)
- **25-05**: GamePageWrapper uses CSS custom properties → Decouples safe area detection from UI rendering (2026-01-26)
- **25-05**: Retry button reloads entire page → Simplest way to recover from offline state (2026-01-26)
- **25-05**: useSafeArea returns SafeAreaInsets object → Hook can be used for both CSS vars and inline styles (2026-01-26)
- **25-06**: Strategy Pattern for haptics abstraction → Automatic platform detection eliminates developer confusion (2026-01-26)
- **25-06**: Facade Pattern with convenience methods → Simple tap/success/error while supporting custom patterns (2026-01-26)
- **25-06**: Backwards compatibility exports → Gradual migration path without breaking changes (2026-01-26)
- **25-06**: HapticsContext for configuration → Infrastructure ready for future settings UI (2026-01-26)
- **20-01**: 60% accuracy threshold for struggling students → Aligns with educational research on comprehension (2026-01-29)
- **20-01**: >50% error rate for common mistakes → Filters borderline words (50% exactly), surfaces clear problem areas (2026-01-29)
- **20-01**: Parallel Promise.all for metrics fetch → Reduces load time ~50% (sequential 400ms → parallel 200ms) (2026-01-29)
- **20-01**: 7-day window for metrics → Balances recency with statistical significance, matches weekly teacher planning (2026-01-29)
- **20-04**: Dual Y-axes (XP left, % right) → Different value scales (0-300 XP vs 0-100%) require separate axes (2026-01-29)
- **20-04**: Bar chart (not line chart) → Discrete lessons better represented as bars than continuous lines (2026-01-29)
- **20-04**: Neo-cyan for XP, neo-pink for completion rate → Matches ClassProgressChart color scheme for visual consistency (2026-01-29)
- **20-05**: Mastery level thresholds (mastered >=80%, practicing 50-79%, struggling <50%) → Aligns with educational research on comprehension (2026-01-29)
- **20-05**: Grid layout with sticky column → First column (words) stays visible during horizontal scroll for mobile UX (2026-01-29)
- **20-05**: Color-coded cells (cyan/yellow/orange/navy) → Matches design system and provides clear visual distinction (2026-01-29)
- **21-02**: education.lesson namespace → Practice components use education.lesson.* not teacher.lesson.* for translations (2026-01-29)
- **21-02**: IPA fallback tooltip → Shows pronunciation guide when TTS voice unavailable (3s auto-dismiss) (2026-01-29)
- **21-02**: Neo-yellow for contextual examples → Background differentiates themed examples from regular usage examples (2026-01-29)
- **21-02**: Compact mode toggle → VocabularyCard supports both full detail and summary views for flexible layouts (2026-01-29)
- **21-01**: Web Speech API over external TTS service → Browser native, zero latency, no API costs, works offline (2026-01-29)
- **21-01**: Language-based voice selection (exact match → prefix match → fallback) → en-GB → en-US (prefix), supports language variants (2026-01-29)
- **21-01**: Rate 0.9 for pronunciation speed → Slightly slower than default for clearer pronunciation learning (2026-01-29)
- **21-01**: Return false when voice unavailable → Enables fallback to IPA display in UI layer (2026-01-29)
- **21-01**: Promise-based API with onend/onerror handlers → Async speech completion tracking, proper error handling (2026-01-29)
- **21-01**: useRef for isMounted tracking → Prevents state updates after unmount, avoids React warnings (2026-01-29)
- **21-03**: useMotionValue for x position (not useState) → Framer Motion provides performant animations without re-renders, 60fps on mobile (2026-01-29)
- **21-05**: Stem matching algorithm (-ing/-ed/-s/-es/-ies/-y) → Handles word variations (technology/technologies/technological) for fuzzy matching (2026-01-29)
- **21-05**: Bidirectional fuzzy matching → Checks both target in word AND word in target, maximizes contextual example discovery (2026-01-29)
- **21-05**: Zod validation for WebSocket payloads → Type safety at runtime, better error messages for vocabulary enrichment (2026-01-29)
- **21-05**: Graceful degradation (empty arrays on error) → Missing Daily Buzz context doesn't break lesson flow (2026-01-29)
- **21-03**: State subscription via x.onChange() → useMemo doesn't react to motion values, useEffect pattern for reactive derived state (2026-01-29)
- **21-03**: Threshold detection on drag end → Performance optimization, avoids continuous checks during drag (2026-01-29)
- **21-03**: ArrowLeft/ArrowRight keyboard shortcuts → Accessibility requirement, all interactions (drag + keyboard) tested (2026-01-29)
- **21-03**: 150px default threshold → Research context specification for minimum swipe distance (2026-01-29)
- **21-03**: Disabled state preserves snap-back → Visual feedback even when swipe disabled, card returns to center (2026-01-29)
- **21-04**: Opacity-based swipe feedback → Progressive visual reveal as user drags, green (right) / red (left) color coding (2026-01-29)
- **21-04**: Show 2 background cards → Provides visual stack effect without cluttering UI, scale/opacity transforms for depth (2026-01-29)
- **21-04**: Tap to reveal then swipe → Two-step interaction prevents accidental swipes, gives user time to think (2026-01-29)
- **21-04**: Space to flip, arrows to swipe → Accessibility requirement, keyboard navigation for power users (2026-01-29)

### Pending Todos

None.

### Blockers/Concerns

**Phase 15 (Chain Combos) — RESOLVED:**
- Chain tile logic verified — 15 tests passing, Math.round handles precision
- Integration tested — 83 tests total, no regressions
- RTL tested — Hebrew rendering verified for combo badges
- Multiplayer isolation — 854 backend tests passing, zero imports crossed

**Phase 16 (Boss Battles) — RESOLVED:**
- Boss HP tracking implemented — 21 tests passing, 5-phase state machine
- BossHPBar component — 18 tests, spring animations, enraged indicator
- Integration complete — BossOverlay compound component, damage wired
- popQuiz mechanic verified — 18 tests, all 4 requirement types working
- Playtesting still needed — Must validate with puzzle players before launch

**Phase 17 (Boss Expansion) — COMPLETE:**
- mirrorMatch mechanic tested — 44 tests, palindrome detection verified
- stellarForge mechanic tested — 52 tests, supernova letter Q/X/Z detection verified
- finalWord mechanic tested — 41 tests, phase cycling and delegation verified
- scrambledReality enhanced — 42 tests, areAnagrams + foundWords tracking + translations
- Stub mechanic tests — All 10 boss mechanics have dedicated test files
- Boss integration tests — 51 tests using real hooks for all 10 worlds

**Phase 18 (Education XP) — COMPLETE:**
- XP calculation foundation — educationXpManager.ts with 32 tests, 98.6% coverage
- Database schema — Migration 062 adds XP/level/streak columns
- useEducationXp hook — State management with 16 tests, pendingUpdate for persistence
- Translation keys — education.xp section in 4 languages (en, he, sv, ja)
- LevelUpCelebration component — 20 tests, confetti integration, accessible modal
- XpProgressBar component — 15 tests, animated level progress, RTL support
- StreakBonusIndicator component — 16 tests, bonus thresholds, badge/inline variants
- PracticeSessionProvider — 15 tests, wraps practice with XP context
- Practice integration complete — FlashcardReview and SoloPracticeBoard with XP display
- Supabase persistence — XP saved on session completion
- Total: 114 tests, full XP system functional

**Phase 19 (Achievement System) — COMPLETE:**
- Achievement badges complete — 23 tests, 4-tier system (bronze/silver/gold/platinum), 18 achievement types
- Classroom leaderboard complete — 24 tests (13 hook + 11 component)
  - useClassroomLeaderboard hook — Top 3 + current user rank, inactive detection (7+ days)
  - ClassroomLeaderboard UI — Neo-Brutalist design, emoji badges (🥇🥈🥉), RTL support
  - getClassroomLeaderboard query — XP aggregation across lessons, privacy-scoped to classroom
  - Translations — 4 languages (en, he, sv, ja) for leaderboard section
- Achievement unlock detection complete — 30 tests (12 hook + 18 modal)
  - useAchievementUnlock hook — FIFO queue, localStorage persistence, before/after comparison
  - AchievementUnlockModal UI — Toast for Bronze/Silver, full modal for Gold/Platinum
  - Confetti integration — fireLevelUpConfetti for Gold/Platinum tiers only
  - Translations — 4 languages for unlock celebrations
- Profile badge display complete — 33 tests (16 card + 17 grid)
  - AchievementProgressCard — Tier colors, progress bars (X/Y format), pin functionality
  - EducationBadgeGrid — Category grouping, featured badges (max 3 pins), collapsible sections
  - Secret badges show "???" until unlocked, locked badges show hints
  - All translations in 5 languages (en, he, sv, ja, es)
- Student dashboard integration complete — All integration points verified (19-05)
  - ClassroomLeaderboard integrated on student dashboard with conditional rendering
  - PracticeSessionProvider calls checkForUnlocks after XP award (22 tests passing)
  - Profile page with EducationBadgeGrid, achievement fetching, pin management
- Total: 110 tests passing, 5/5 plans complete, full achievement system operational

**Phase 20 (Analytics Dashboard) — COMPLETE:**
- Analytics foundation complete — getClassroomMetrics, getCommonMistakes, getStudentProgressMetrics (20-01)
- Total: 144 tests passing, verification 5/5
- COPPA compliance — Legal review required before launch, anonymous student IDs only (research pitfall 4)
- Teacher co-design needed — Build dashboard with teachers, not for them (research pitfall 9)

**Phase 21 (Rich Lesson Delivery) — IN PROGRESS:**
- Text-to-speech service complete — Web Speech API integration, 30 tests passing (21-01)
- Enriched vocabulary card complete — TTS integration, contextual examples, Neo-Brutalist design (21-02)
- Swipe gesture hook complete — Framer Motion motion values, 150px threshold, keyboard shortcuts (21-03)
- Swipeable flashcard stack complete — Stack visual, green/red feedback, tap-to-reveal flow (21-04)
- Daily Buzz context service complete — Fuzzy matching, stem algorithm, WebSocket handler (21-05)
- Hebrew TTS limitation — Most browsers lack Hebrew voices, will use IPA fallback
- Browser compatibility — Safari iOS requires user gesture for first speech
- Voice quality variance — Android voices robotic, iOS natural (rate 0.9 helps consistency)

**Phase 24 (CrazyGames Portal Integration) — COMPLETE:**
- Visual consistency verified — CSS isolation + viewport hook implemented (24-02 complete)
- SDK lifecycle integration — gameplayStart/Stop tracking with visibility handling (24-03 complete)
- Multiplayer invites complete — Auto-hide on room full/start, instant multiplayer, 11 tests (24-04 complete)
- Testing & compliance complete — 48 tests verify bundle size, lifecycle, multiplayer (24-05 complete)
- Enhanced SDK integration — Ads, cloud save, settings hook placeholder (24-06 complete)
- OAuth hiding complete — External OAuth hidden on platform, CrazyGames SDK auth integrated (24-07 complete)
- Total: 68 tests passing, all verification gaps closed
- Ready for CrazyGames portal deployment

**Phase 25 (Capacitor Native Apps) — COMPLETE:**
- Capacitor 8.x installed — Core, CLI, iOS/Android platforms, 8 plugins (25-01 complete)
- WebView configuration complete — Points to https://www.lexiclash.live production webapp
- @capacitor/http NOT installed — Prevents Socket.IO WebSocket interference
- Platform detection utilities complete — isNative/isIOS/isAndroid/isWeb with tree-shaking (25-02 complete)
- Native haptics with web fallback — vibrateTap/Success/Error progressive enhancement (25-02 complete)
- App lifecycle hooks — useAppLifecycle for foreground/background callbacks (25-02 complete)
- Safe area handling complete — useSafeArea hook with CSS custom properties (25-03 complete)
- Offline fallback complete — OfflineFallback component with translations in 5 languages (25-03 complete)
- CSS custom properties — Combined approach uses max() of env() and Capacitor values (25-03 complete)
- Build scripts complete — iOS/Android build automation with npm workflow (25-04 complete)
- Socket.IO verified working — Native WebView multiplayer tested and approved by user (25-04 complete)
- Native integrations wired — NativeAppProvider and NetworkStatusHandler in provider tree (25-05 complete)
- Safe area in GamePageWrapper — CSS custom properties applied with fallback (25-05 complete)
- Network status monitoring — useOnlineStatus hook with offline detection (25-05 complete)
- Socket reconnection on foreground — App lifecycle integration complete (25-05 complete)
- Test coverage: 93 tests passing — All native infrastructure tests passing
- Total duration: 52 minutes across 5 plans
- Ready for App Store/Play Store submission

**Phase 20 (Analytics Dashboard) — COMPLETE:**
- Analytics foundation complete — getClassroomMetrics, getCommonMistakes, getStudentProgressMetrics (20-01)
- useClassroomAnalytics hook — Parallel fetch, loading/error states (20-01)
- MetricCard + AnalyticsDashboard — 4 key metrics with actionable buttons (20-02)
- StudentProgressTable — Sortable columns, "needs help" indicator (20-03)
- LessonEffectivenessChart — Recharts bar chart, dual Y-axes (20-04)
- VocabularyHeatmap — Student × word grid, mastery-level coloring (20-05)
- LiveActivityIndicator — Supabase Realtime, connection status (20-06)
- Analytics page — Radix UI Tabs, all components integrated (20-06)
- Gap closure: Schema mismatch fixed (32bf6b3a)
- Total: 144 tests passing, verification 5/5

## Session Continuity

Last session: 2026-01-29
Stopped at: Completed 21-04 (Swipeable Flashcard Stack)
Resume file: None

**Next action:** Execute Phase 21 plan 06

**Phase 21 Summary (so far):**
- 5/6 plans complete (46 minutes total)
- Wave 1 complete: TTS, enriched card, swipe hook, Daily Buzz context
- Wave 2 in progress: Flashcard stack component ready for integration
- All lesson delivery UI components functional

**Phase 20 Summary:**
- 6/6 plans complete (127 minutes total)
- 144 tests added
- Verification passed 5/5 after gap closure (schema mismatch fixed)
- All 5 ANALYTICS requirements satisfied

---
*State initialized: 2026-01-22*
*Last updated: 2026-01-29 (Phase 21 plan 04 complete - swipeable flashcard stack)*
