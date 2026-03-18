# LexiClash 8-Expert Game Improvement Audit
**Date:** 2026-03-18
**Agents:** Game Design, UX/Playability, Engagement/Retention, UI Feedback/Polish, Game UI Design, Gameplay Mechanics, Level Design, Gamification/Usability Psychology

---

## Executive Summary

8 parallel expert agents audited all 7 game modes (Classic, Blast, Adventure, Word Hunt, Daily Challenge, Multiplayer, Education) across game design, UX, engagement, feedback, UI patterns, mechanics, level design, and psychology. **92 unique issues identified**, deduplicated and ranked below.

**Top 5 systemic problems:**
1. **Fragmented progression** — two currencies, no cross-mode player level, modes are islands
2. **Economy is broken** — gold 40% deflationary, coins 100% client-side (cheatable), retry costs are dead mechanics
3. **Onboarding gaps** — Blast has zero tutorial, Classic tutorial is passive, 7 modes with no guidance
4. **Missing game feel** — no SFX system, orphaned juice code, boss fights have no visual feedback
5. **Difficulty curve issues** — W1 boss as hard as endgame, W2→W3 triple spike, flat intra-world progression

---

## CRITICAL (Fix immediately — retention/integrity threatening)

| # | Issue | Modes | Source Agents | Fix |
|---|-------|-------|---------------|-----|
| C1 | **Coin economy is 100% client-side (localStorage)** — DevTools exploit gives infinite coins | Daily, Classic, MP | Mechanics, Retention | Migrate to server-validated coins (like adventure gold) |
| C2 | **Two separate currencies with zero bridge** — coins (localStorage) vs gold (Supabase), no exchange | All | Retention, Mechanics, Design | Unify or add conversion. Coins from Classic/MP should fuel Adventure |
| C3 | **Gold economy 40% deflationary** — perfect playthrough earns 5,600g, upgrades cost 9,280g | Adventure | Level Design, Retention | Double base gold (20*stars) or reduce upgrade costs 40% |
| C4 | **World 10 unlock (45 stars) easier than World 9 (88 stars)** — formula bug | Adventure | Mechanics, Level Design | Fix `getWorldUnlockRequirement` to use escalating curve |
| C5 | **No SFX system at all** — sound effect params threaded but no implementation | All | Feedback | Create `useSFX` hook with Web Audio API / Howler.js |
| C6 | **No Blast mode onboarding** — unique mechanics never explained to new players | Blast | UX | Auto-show BlastHelpModal on first game |
| C7 | **Japanese Word Hunt nearly unplayable** — life drain at 1.2/s, 2-char words restore only 2 HP | Word Hunt | Mechanics | Scale life drain/restore by language |

---

## HIGH (Fix soon — significantly impacts player experience)

| # | Issue | Modes | Source Agents | Fix |
|---|-------|-------|---------------|-----|
| H1 | **No unified cross-mode progression** — no shared player level | All | Gamification, Design | Create unified Player Level fed by XP from all modes |
| H2 | **Scoring formula too flat** — 7-letter word only 3x a 3-letter word | All | Design | Switch to exponential: `Math.pow(length-1, 1.5)` or Boggle curve |
| H3 | **Blast combo streak orphaned** — multiplier code exists but not mounted/wired to scoring | Blast | Design, Feedback, Mechanics | Wire `BlastComboStreakBadge` + `BlastReactiveBackground` |
| H4 | **Boss damage feedback invisible** — no health bar reacts to word submissions | Adventure | Feedback | Add boss HP bar with hit flash, damage numbers, stagger animation |
| H5 | **5 post-game screens in Adventure** — cinematic→unlock→story→loot→modal | Adventure | UX | Allow skip after first view, combine into 2 screens max |
| H6 | **W2→W3 triple difficulty spike** — 28% timer drop + grid size jump + new mechanic | Adventure | Level Design | W3 timer: 140s (5.6s/tile) not 130s |
| H7 | **Tutorial boss (W1) has 2.0x speed = same as endgame** | Adventure | Level Design, Design | msGrammar Phase 3: 1.5x, Phase 2: 1.2x |
| H8 | **Landing page 7 equal-weight modes** — Hick's Law violation | All | Gamification | Show ONE primary CTA for new players, "Continue" for returning |
| H9 | **Word Hunt penalizes exploration** — non-target-length words cost lives | Word Hunt | Design | Only penalize wrong-length target guesses, not discovery words |
| H10 | **Failure screens lack Zeigarnik pull** — no "you were THIS close" framing | Adventure | Gamification | Show objective progress bars, near-miss card on failure |
| H11 | **Classic tutorial is passive** — all steps have `action: 'none'` | Classic | UX | Make swipe/combo steps require `waitForInteraction: true` |
| H12 | **Combo timer doesn't pause during Blast cascades** — lose combo to animation | Blast | Design | Pause combo timer when `CascadePhase !== 'idle'` |
| H13 | **Timer race condition** — starts before all players ACK | Multiplayer | Mechanics | Wait for all ACKs before countdown |
| H14 | **W1 word count target is 8 on 4x4** — too demanding for tutorial | Adventure | Level Design | Start at 5, ramp to 7 by level 7 |
| H15 | **Missing `touch-action: none` on grid** — mobile swipes trigger page scroll | All | UX | Add to grid container CSS |
| H16 | **No upgrade activation feedback** — 11 upgrades fire silently during gameplay | Adventure | Feedback | Show "+UPGRADE NAME" toast when upgrade triggers |
| H17 | **Education XP isolated from main profile** | Education | Design, Mechanics, Retention | Bridge at 50% rate to main profile XP |
| H18 | **No score delta / "overtaken" notification in MP** | Multiplayer | Feedback, Design | Show "+45" flying numbers and "Player X passed you!" banner |
| H19 | **Multiplayer runaway leader** — first-finder takes all, no catch-up | Multiplayer | Design | Award 50% points for "confirming" already-found words |
| H20 | **Streak milestones give no tangible rewards** — just emoji messages | Daily | Retention | Add gold, cosmetics, streak freeze at milestones |
| H21 | **Endless mode unplayable at floor 25** — 48s for 7x7 grid | Adventure | Level Design | Decay 2s/floor, minimum 45s |
| H22 | **World mechanics invisible during regular levels** — no feedback on bonus triggers | Adventure | Design | Show "+25% SYNONYM BONUS" toast on mechanic trigger |
| H23 | **Star gate replay guidance missing** — players don't know which levels to replay for stars | Adventure | Design | Show specific missed objectives per level with replay buttons |
| H24 | **Results screen cognitive overload** — 15 sections on MP results | Multiplayer | Gamification, UI Design | Only PlacementHero + Rewards + CTA above fold |
| H25 | **Diamond/Silver tile RNG variance in MP Blast** — 2.0-2.5x creates unfair score spikes | Blast | Mechanics | Cap multiplier at 1.8x in multiplayer or normalize tile distribution |

---

## MEDIUM (Improve quality — balance, polish, engagement)

| # | Issue | Modes | Fix |
|---|-------|-------|-----|
| M1 | **XP/player level does nothing** — no gameplay benefit | Adventure | Tie to tangible rewards (gold mult per 10 levels, cosmetics) |
| M2 | **No haptic escalation during tile selection** — 4 visual tiers, 0 haptic tiers | All | Progressive haptics: 5ms→10ms→15ms→20ms per tier |
| M3 | **Combo decay is invisible** — resets silently | Classic | Add visible combo meter/bar that drains |
| M4 | **No score weight differentiation** — 3pt and 12pt words get same animation | Classic | Scale animation size, particles, screen shake by score |
| M5 | **Dead-end in Blast ends game in 500ms** — too abrupt | Blast | Increase to 1500ms, show "No more words!" overlay |
| M6 | **No end-of-game word reveal** — players never learn missed words | Classic | Show board solution on results screen |
| M7 | **Daily retry is dead mechanic** — 500 coins = 4 sessions | Daily | Replace with free practice mode (no leaderboard impact) |
| M8 | **Upgrades gated too late** — only 3 of 11 in W1, salvageClaw locked until W3 | Adventure | Move salvageClaw to W1, add free starter upgrade after W1L1 |
| M9 | **No difficulty variation within worlds** — all 7 levels share grid/timer | Adventure | Add -5s per level within world |
| M10 | **No new upgrades in W6-10** — discovery stops at W5 | Adventure | Add at least 1 new upgrade at W7 or W8 |
| M11 | **Combo timeout same for 4x4 and 7x7** — larger grids need more time | Adventure | Auto-scale: `3000 + (gridSize-4) * 400` ms |
| M12 | **Flash challenge rewards not calibrated** — palindrome (100g) vs easy challenges (30g) | Adventure | Calibrate to actual completion rates |
| M13 | **Word Hunt dual feedback confusion** — "accepted" green for non-target words | Word Hunt | Differentiate: "accepted" vs "discovery" feedback types |
| M14 | **No daily login reward calendar** | All | Day 1: 10g → Day 7: 100g + cosmetic |
| M15 | **23 files still use physical RTL properties** (mr-/ml- instead of me-/ms-) | All | Migrate to logical properties |
| M16 | **LevelCompleteModal has 14 sections** — should be max 3-4 focal points | Adventure | Split into multi-step results flow |
| M17 | **Ad buttons bury primary CTA** — 2 ad buttons before "Continue" | Adventure | Move ads below primary CTA |
| M18 | **WordHuntTargetArea uses generic Tailwind** — not neo-brutalist tokens | Word Hunt | Migrate to `neo-navy`, `neo-lime`, shadow-hard |
| M19 | **Loot chests only drop gold/XP** — no item variety | Adventure | Add consumable items (free Freeze, free Shuffle) for boss chests |
| M20 | **No streak-at-risk urgency** — 14-day streak player sees no drama | Daily | Pulsing streak counter, push notification tie-in |
| M21 | **Two independent streak systems** — daily vs adventure | All | Unify into "play any mode" streak |
| M22 | **MP placement bonus cliff** — 1st=25, 2nd-3rd=10, 4th+=0 in 50-player room | Multiplayer | Percentile-based: top 10% = bonus, top 25% = smaller |
| M23 | **No skill-based matchmaking** — veteran vs newcomer on equal terms | Multiplayer | Add ELO or handicap system |
| M24 | **Efficiency score never explained to players** | Daily | Show on results screen with tooltip |
| M25 | **Boss mechanic targets scale UP for harder bosses** — should scale DOWN | Adventure | Invert: harder bosses need fewer mechanic triggers |
| M26 | **Hidden words hardcoded English** — Hebrew/Japanese can never find them | Adventure | i18n hidden words per language |
| M27 | **World mechanic multipliers too similar** (1.25-1.5x) — palindrome effort ≠ reward | Adventure | Palindrome: 2.0x, synonymPairs: 1.25x (match difficulty) |
| M28 | **Duel draw XP (175) > loss XP (120-150)** — incentivizes collusion | Education | Draw: 140 XP (between loss and win) |
| M29 | **No student onboarding in Education** | Education | Add student dashboard with guided first practice |
| M30 | **Spaced repetition not wired to DB** — resets every session | Education | Wire to `student_lesson_progress` table |
| M31 | **BlastGame blank screen when grid is null** — no loading state | Blast | Show skeleton matching grid dimensions |
| M32 | **InGameScreen 40+ flat props** | Classic | Group into domain objects |
| M33 | **AdventureGame.tsx 829 lines** — exceeds 500-line limit | Adventure | Extract overlay stack component |
| M34 | **No cross-mode achievements** | All | Add 3-5 daily cross-mode achievements |
| M35 | **TapToDragTooltip auto-dismisses in 4s** — too fast | Classic | Increase to 6-8s, add persistent help button |

---

## LOW (Polish — minor improvements)

| # | Issue | Modes | Fix |
|---|-------|-------|-----|
| L1 | 2-letter words allowed by default | Classic | Default MIN_WORD_LENGTH=3, keep 2 as "easy" toggle |
| L2 | No "near miss" feedback on rejected words | Classic | Show "almost!" for words 1 letter short of valid |
| L3 | Timer has no board-level escalation below 30s | Classic | Add vignette, heartbeat effect at <15s |
| L4 | Star earn moment is flat — no per-star cascade | Adventure | Delay-cascade star reveal with SFX |
| L5 | XP/Gold animations simultaneous — should cascade | Adventure | Score first, then XP, then gold sequentially |
| L6 | Flash challenge toast too subtle | Adventure | Full-screen overlay with countdown |
| L7 | No Word Hunt clue reveal animation | Word Hunt | Scale bounce + glow on letter reveal |
| L8 | No "getting warmer" proximity feedback | Word Hunt | Color shift or proximity meter |
| L9 | No daily leaderboard position climb animation | Daily | "Rising through ranks" animation |
| L10 | No personal best comparison on daily results | Daily | "New record!" or "X points from your best" |
| L11 | Reaction cooldown invisible in MP | Multiplayer | Brief grey-out on throttled reactions |
| L12 | No lesson word celebration in Education | Education | Bigger animation + mastery progress for vocabulary words |
| L13 | Streak multiplier caps at 7 days | Adventure | Extend to 3.0x at 30 days |
| L14 | Chapter 2-2-3 pacing uneven | Adventure | Consider 2-3-2 for more even distribution |
| L15 | Endless mode word count no cap — 110 words at floor 50 | Adventure | Cap at 30-40 words |
| L16 | Classroom leaderboard rewards speed over accuracy | Education | Weight: accuracy * sessions |
| L17 | Hardcoded strings in tooltips and fallbacks | Cross-cutting | Migrate to `t()` keys |
| L18 | Reduced-motion gaps in WordHuntLifeBar, GameModeIntro | Cross-cutting | Add `prefersReducedMotion` checks |
| L19 | ComboDisplay 519 lines — exceeds limit | Classic | Extract RARITY_COLORS and Sparkle |
| L20 | FloatingScoreAnimation z-[100] conflicts | Classic | Shared z-index layer system |
| L21 | CrazyGames SDK blocks non-CG users | Multiplayer | Non-blocking SDK init for web players |
| L22 | Grid missing ARIA grid/gridcell roles | All | Add `role="grid"` and `role="gridcell"` |

---

## Recommended Sprint Priorities

### Sprint 1: Foundation (Economy + Onboarding)
- C1: Server-side coins
- C2: Currency bridge/unification
- C3: Gold economy rebalance
- C6: Blast onboarding
- H8: Landing page mode hierarchy
- H11: Interactive tutorial
- H15: touch-action: none

### Sprint 2: Game Feel (Feedback + Juice)
- C5: SFX system
- H3: Wire orphaned Blast juice
- H4: Boss damage feedback
- H12: Pause combo during cascades
- M2: Haptic escalation
- M4: Score weight differentiation

### Sprint 3: Progression + Balance
- C4: World unlock formula fix
- H1: Unified cross-mode player level
- H2: Exponential scoring
- H6-H7: Difficulty curve fixes
- H14: Tutorial targets
- M8: Front-load upgrades

### Sprint 4: Engagement + Polish
- H5: Post-game screen reduction
- H10: Failure screen Zeigarnik pull
- H20: Streak milestone rewards
- M7: Daily practice mode
- M14: Login reward calendar
- M34: Cross-mode achievements

### Sprint 5: Mode-Specific Fixes
- C7: Japanese Word Hunt fix
- H9: Word Hunt life penalty rework
- H13: MP timer race condition
- H17: Education XP bridge
- H19: MP catch-up mechanic
- M23: Matchmaking system
