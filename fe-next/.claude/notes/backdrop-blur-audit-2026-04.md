# backdrop-blur Perf Audit — 2026-04-18

Inventory of 146 `backdrop-blur-*` sites across 111 files. Classifies each by render frequency (hot vs cold path) and visual necessity. Produces per-surface decision input; does **not** commit to removal.

## Method
- `rg "backdrop-blur"` across `components/`, `app/`, `host/`.
- Classification axes:
  - **Frequency**: `hot` (per-frame during gameplay / HUD / tile), `warm` (interaction-triggered, not per-frame), `cold` (modal/overlay shown once).
  - **Multiplier**: `N×` means cost scales by tile count / list size / player count.
  - **Perceptibility**: blurs `<3px` on dark semi-opaque backgrounds are at or below visual threshold on retina — pure GPU cost.
- Design-system doc (`.claude/docs/design-system.md`) emphasizes "NO blur" for shadows → brand tolerates minimal blur; cold-path modal scrim blur is the least surprising use.

## Tier 1 — REMOVE (hot + sub-perceptible)

High-confidence wins. Rendered every frame during gameplay, blur radius below perceptibility threshold.

| Site | Blur | Surface | Multiplier | Notes |
|---|---|---|---|---|
| `components/blast/BlastTile.tsx:356` | `[1px]` | Diamond reveal tile overlay | N×M (grid) | invisible; `bg-blue-900/40` alone suffices |
| `components/adventure/TileBadge.tsx:99` | `[2px]` | Frost overlay on themed tile | N× (tiles) | test at `__tests__/TileBadge.test.tsx:106` asserts class — pair removal with test update |
| `components/adventure/themed/ThemedTile.tsx:139` | `[1px]` | Themed tile wash | N× | invisible |
| `components/results/PerformanceChartInner.tsx:399` | `[1px]` | Empty-state chart overlay | 1× | cold but imperceptible anyway |
| `components/DesktopGameNav.tsx:55` | `[2px]` | Desktop game nav bar | 1×, per-frame | sticky bar; below threshold |
| `components/header/HeaderMobileMenu.tsx:282` | `[2px]` | Mobile menu scrim | 1×, interaction | warm; borderline — keep or drop safely |

## Tier 2 — REMOVE (hot-path chrome, visible but replaceable)

Rendered every frame during gameplay. Blur contributes depth cue but is duplicated by `border` + `bg-*/opacity`. Can be replaced with heavier border or deeper opacity with negligible visual loss.

| Site | Blur | Surface | Multiplier | Recommended replacement |
|---|---|---|---|---|
| `components/adventure/hud/AdventureHUD.tsx:90` | `xs` | Adventure HUD header | per-frame | drop blur; `hudTheme.headerBg` already opaque |
| `components/adventure/hud/AdventureHUD.tsx:143` | `xs` | Adventure HUD footer | per-frame | same |
| `components/adventure/AdventureTimer.tsx:160` | `xs` | Timer bar (active every frame) | per-frame | drop; timer animates → worst offender |
| `components/adventure/AdventureViewHeader.tsx:39` | `xs` | Fixed header | per-frame | drop |
| `components/adventure/ui/GameHeader.tsx:95` | `md` | Game header (adventure) | per-frame | downgrade `md→xs` or remove; `md` is expensive |
| `components/adventure/ui/GameHeader.tsx:273` | `xs` | Nested header | per-frame | drop |
| `components/adventure/ui/GameSidebar.tsx:164` | `xs` | Game sidebar | per-frame | drop |
| `components/adventure/ui/GameSidebar.tsx:394` | `xs` | Nested sidebar | per-frame | drop |
| `components/game/in-game/components/ScoreDisplay.tsx:54` | `xs` | Desktop score chip | per-frame, pulses | drop |
| `components/game/in-game/components/ScoreDisplay.tsx:109` | `xs` | Mobile score chip | per-frame, pulses | drop |
| `components/grid/ComboIndicator.tsx:289` | `xs` | Combo popup (animates) | interaction-pulse | drop |
| `components/grid/ComboBreakEffect.tsx:88` | `xs` | Combo break popup | interaction-pulse | drop |
| `components/game/MobileGameDrawer.tsx:70` | `xs` | Drawer handle | per-frame | drop |
| `components/game/MobileGameDrawer.tsx:125` | `xs` | Drawer body | per-frame, scrollable | drop — blur on scroll container is worst case |
| `components/practice/PracticeHeader.tsx:99` | `xs` | Practice header | per-frame | drop |
| `components/wordhunt/WordHuntGameOverOverlay.tsx:213` | `xs` | Game-over chip | per-frame until dismiss | drop |
| `components/wordhunt/WordHuntGameOverlay.tsx:42` | `xs` | Game overlay | interaction | cold-ish — keep safely |
| `components/wordhunt/WordHuntQuickRules.tsx:67` | `xs` | Quick rules bar | per-frame | drop |
| `components/wordhunt/WordHuntDeathRecap.tsx:103` | `xs` | Death recap | per-frame | drop |
| `components/wordhunt/WordHuntFirstTimeNudges.tsx:142` | `xs` | Nudge toast | per-frame while visible | drop |
| `components/singleplayer/game/components/LandscapeGameLayout.tsx:339` | `xs` | Landscape chip | per-frame | drop |
| `components/daily/survival/SurvivalMobileInfoBar.tsx:108,160` | `xs` ×2 | Survival mobile HUD | per-frame | drop both |
| `components/views/ResultsPage.tsx:862` | `xl` | Sticky footer bar | per-frame on scroll | **priority** — `xl` is the most expensive class |
| `components/engagement/StreakBar.tsx:72` | `xs` | Streak bar | per-frame while visible | drop |
| `components/keyboard/KeyboardInlineHint.tsx:117` | `xs` | Inline hint | per-frame | drop |
| `components/keyboard/KeyboardDesktopBadge.tsx:66` | `xs` | Keyboard badge | per-frame | drop |
| `components/multiplayer/OpponentWordFeed.tsx:40` | `xs` | Opponent feed pills | N× (words) per-frame | drop — `N×` multiplier |
| `components/daily/DailyLeaderboard.tsx:260,305` | `xs` ×2 | Leaderboard rows | N× | drop |
| `components/daily/TabbedDailyLeaderboard.tsx:582` | `xs` | Leaderboard row | N× | drop |
| `components/singleplayer/results/PracticeResults.tsx:440` | `xs` | Fixed bottom CTA | per-frame on scroll | drop |
| `components/singleplayer/SinglePlayerResults.tsx:407` | `xs` | Fixed bottom CTA | per-frame on scroll | drop |
| `components/adventure/power-ups/PowerUpBar.tsx:299` | `xs` | Power-up bar | per-frame | drop |
| `components/adventure/themed/ChapterIndicator.tsx:101` | `xs` | Chapter indicator | per-frame | drop |
| `components/adventure/FlashChallengeToast.tsx:60` | `xs` | Challenge toast | per-frame while visible | drop |
| `components/adventure/MechanicBonusToast.tsx:49` | `xs` | Mechanic toast | per-frame while visible | drop |
| `components/adventure/LevelEntryOverlay.tsx:270` | `xs` | Level-entry label | warm | drop |
| `components/adventure/quests/ChapterQuestPanel.tsx:31` | `xs` | Quest panel | per-frame | drop |
| `components/adventure/LevelCompleteContent.tsx:86,91,98,376` | `xs` ×4 | Level-complete cards | modal-ish | keep (cold once open) |
| `components/adventure/BossDialogue.tsx:199` | `xs` | Boss dialogue | interaction | keep |
| `components/game/QuickReactions.tsx:152` | `xs` | Reactions bar | per-frame while visible | drop |
| `components/game/in-game/components/MobileChatFab.tsx:105` | `xs` | Chat FAB | per-frame | drop |
| `components/game/KeyboardHintTooltip.tsx:100` | `md` | Keyboard hint tooltip | warm | downgrade `md→xs` or drop |
| `components/keyboard/KeyboardQuickTip.tsx:39` | `md` | Quick tip | warm | downgrade |
| `components/training/TrainingHints.tsx:261` | `xs` | Training hints | warm | drop |

**Priority within Tier 2**: `ResultsPage.tsx:862` (blur-xl on scroll), `AdventureTimer.tsx:160` (per-frame animated), `GameHeader.tsx:95` (blur-md per-frame), `OpponentWordFeed.tsx:40` (N× multiplier).

## Tier 3 — KEEP (cold modal/overlay scrims)

Render once on open, dismiss to remove. Blur is the scrim's job. Not a perf problem.

Modal overlays & dialogs (51 sites — not enumerated individually):
- `AuthModal`, `WinnerOnboarding`, `CommandPalette`, `MatchmakingOverlay`, `TrainingAnalysisModal`, `ImagePreviewModal`, `CustomPuzzleCreator`, `AuthModal`, `ChallengeInviteDialog`, `GiftModal`, `AdminGiftModal`, `ParentalConsentModal`, `ReferralMilestonePopup`, `ComebackBonusModal`, `ShareReferralModal`, `KeyboardShortcutsOverlay`, `AdventureViewModals` (×2), `WeeklyChallengePanel`, `WordAlbumPanel`, `SkillUnlockModal`, `LevelCompleteModal`, `BossVictory`, `BossIntro`, `AdventureLevelUpModal`, `RetryAssistModal`, `AchievementUnlockModal`, `ForfeitConfirmDialog`, `DuelDisconnectOverlay`, `UnifiedAchievementModal`, `education/LevelUpCelebration`, `MilestoneCelebration`, `animations/LevelUpCelebration`, `WordHuntPromoPopup`, `DailyChallengeInlineSignup`, `TournamentStandings`, `TomorrowPreview`, `NearMissCard`, `SignupToast`, `GoRipplesAnimation`, `EarthquakeWarning`, `OnboardingFlow`, `MiniGrid`, `FlashcardOnboarding`.

All leave as-is.

## Tier 4 — KEEP (brand headers, low frequency)

| Site | Blur | Why |
|---|---|---|
| `components/Header.tsx:83` | `xs` | App header, not per-frame game re-render |
| `components/EducationHeader.tsx:135` | `md` | Education page header, not gameplay |
| `components/adventure/AdventureHub.tsx:153` | `xs` | Hub landing, cold |
| `app/[locale]/friends/PageClient.tsx:58` | `sm` | Page header, cold |
| `app/[locale]/referrals/PageClient.tsx:329` | `sm` | Page header, cold |
| `app/[locale]/student/lessons/[id]/PageClient.tsx:228` | `xs` | Lesson header, cold |
| `host/components/pre-game/ChatBubble.tsx:69` | `sm` | Lobby bubble, low frequency |
| `components/brain/BrainScoreShareCard.tsx:207,216` | `xs` ×2 | Share card, cold rendered to image |
| `components/results/ResultsPodium.tsx:149` | `xs` | Menu popover, warm |
| `components/results/MvpAwards.tsx:338` | `xs` | Awards card, cold |
| `components/adventure/RPGLevelCard.tsx:91` | `md` | Level select card, cold but `md` is heavy — downgrade candidate |
| `components/adventure/ui/PremiumCard.tsx:138,146,154,162,170` | `md` ×4 + `xs` | Premium cards in shop, cold |
| `components/consent/ParentalConsentModal.tsx:160` | `xs` | Modal scrim |
| `components/views/ResultsPage.tsx:214` | `xs` | Decorative chip on results |
| `components/singleplayer/results/components/ResultsInfoCards.tsx:35` | `xs` | Result card, cold |
| `components/singleplayer/results/components/CelebrationHero.tsx:192` | `xs` | Celebration, cold |
| `components/multiplayer/MultiplayerWelcomeCard.tsx:43` | `xs` | Welcome card, cold |
| `components/HowToPlay.tsx:185` | `xs` | How-to card, cold |
| `components/daily/UnauthenticatedCreateChallengeSection.tsx:105` | `xs` | CTA card, cold |

## Achievements Test Files

Three references in `components/achievements/__tests__/neo-brutalist-fixes.test.tsx` are **assertions that blur was removed** — design-system intent confirmed. No action.

## Summary
- **Tier 1 removals (free win, sub-perceptible):** 6 sites
- **Tier 2 removals (hot-path chrome):** ~40 sites
- **Tier 3 keep (modal scrims):** ~51 sites
- **Tier 4 keep (low-frequency headers):** ~20 sites
- **Tests asserting absence:** 3 (confirms design intent)
- **Tests asserting presence:** 1 (`TileBadge.test.tsx:106` — Tier 1 candidate)

## Recommended commit shape
1. `perf: remove sub-perceptible backdrop-blur from gameplay tiles` — Tier 1 only + `TileBadge` test update (`toHaveClass` → `not.toHaveClass`).
2. `perf: drop per-frame backdrop-blur from HUD and scoreboards` — Tier 2 subset prioritized by hot-path (timer, header, opponent feed, ResultsPage sticky footer).
3. Leave Tiers 3 + 4 untouched.

## Mobile measurement
No Lighthouse/DevTools trace captured yet. Recommend measuring `AdventureTimer` + `ScoreDisplay` before/after on low-tier Android (Pixel 3a or throttled CPU 4×) to confirm frame-time improvement before expanding Tier 2 removals.
