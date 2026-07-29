# Onboarding 2: Per-Mode Practice + MP Stress Reduction

**Date:** 2026-05-03
**Author:** Ohad + Claude
**Status:** Research + design (slice E + scope decomposition). Implementation gated on user approval per slice.
**Builds on:** [`2026-04-27-onboarding-glow-up-design.md`](./2026-04-27-onboarding-glow-up-design.md) (first-ever FTUE). This doc covers what happens AFTER FTUE: per-mode teaching, replayable practice, MP stress, and cross-promo.

---

## TL;DR

LexiClash has a one-shot first-time tutorial (`TutorialGame.tsx`, 4×4 grid). After that, every mode (Word Wheel, Word Hunt, Boggle, Connections, Blast, Wheel Rush MP) drops the player in cold. Practice mode = a thin wrapper around solo-bots, not a fun-on-its-own surface. Multiplayer fires popups mid-round (signup prompts, achievements, etc.) which players have flagged as stressful.

**This doc proposes a 3-surface model + 4-slice ship plan:**

| Surface | Purpose | Replayable | Stakes | Build effort |
|---|---|---|---|---|
| **Tutorial seed** | Teach 1 mechanic in ~30s on first entry to a mode | No | None | M |
| **Practice mode** | Casual replayable warm-up — fun for its own sake | Yes | Self-goals only | L |
| **Competitive mode** | MP / daily / scored | Yes | Real | exists |

Plus 2 cross-cutting concerns:
- **MP stress reduction** — defer all non-critical popups to post-round, bot-pad first 3 MP matches, hide MMR.
- **Practice → MP graduation** — extend `NextStepPrompt` to route practice → MP after N sessions.

---

## Audit (Current State)

### What exists
| Surface | File | Notes |
|---|---|---|
| First-time tutorial | `components/onboarding/TutorialGame.tsx` | 4×4 grid, 3 words, one-shot. Doesn't teach per-mode. |
| Static how-to-play | `app/[locale]/how-to-play/PageClient.tsx` | SEO/static, not in-flow. |
| MP welcome card | `components/multiplayer/MultiplayerWelcomeCard.tsx` | 3-step text+icons in lobby, dismissible, **pre-game safe**. |
| Word Hunt tutorial gate | `components/daily/tutorial/shouldAutoShowTutorial.ts` | Phase guard only; UI lives in DailyChallenge. Word Wheel has none. |
| "Practice" results | `components/singleplayer/results/PracticeResults.tsx` (457 ln) | Solo grid wrapper. No fun-modifiers, no goals, no streak-lite. |
| Cross-promo router | `components/results/NextStepPrompt.tsx` | `practice → bots`, `daily → MP`, `word-hunt → MP`. **No `practice → MP`.** |
| Cross-promo telemetry | `cross_promo_click` event | Wired on word-hunt → wheel CTA. |

### Gaps (matching user's asks)
1. **No per-mode teaching** for Word Wheel, Word Hunt, Boggle, Connections, Blast, Wheel Rush MP. Player meets each cold.
2. **Practice mode is not fun on its own** — no modifiers, no self-goals, no streak-lite, no PR celebration, no replay-loop hooks.
3. **No video/animation teaching content anywhere** — only icons + text. (Per research below: this is fine; build interactive seeds instead.)
4. **MP popups during round** — signup prompts, achievements, level-ups, friend-joins all unaudited for mid-round suppression.
5. **`NextStepPrompt` switch (line 87-89) routes practice → bots only** — never to MP.
6. **No bot-padding / hidden MMR** for first MP matches → new players face elo-matched real opponents day 1 → loss spiral.

---

## Research Findings

Web research summary. Sources at end.

### Format choice: interactive > video > Lottie > text+icon
Game-UX consensus is unambiguous: "the more interactive a tutorial, the more it resembles actual gameplay, the better the player learns" ([Game Developer](https://www.gamedeveloper.com/design/interactive-tutorials-for-an-interactive-medium)). Mega Man X teaches via designed first-encounters; Portal puts the gun on a rotating pedestal that fires itself. Video/Remotion is *better than nothing* but inferior to a 1-mechanic playable seed.

**Decision: drop the "Remotion video" idea. Build tutorial seed puzzles per mode.** A "seed" = a pre-baked board where the only valid path teaches the mechanic. ~30s, ends in success, fires the same dopamine primitives as a real round (`fireOnboardingBurst`, mascot reaction, count-up). Lottie/Remotion only as a 2-3-second attract loop *before* the seed begins.

### First-time gating: per-mode flag, not global
Clash Royale ships 5 mini-tutorials triggered at relevant moments, not a global onboarding ([Apple FTUE guidance](https://developer.apple.com/app-store/onboarding-for-games/)). Mirror this: gate per-mode via `first_played_<mode>` server flag (Supabase, mirrors localStorage for guests). Avoids re-tutorial on new device/account.

### Practice → MP graduation: bot-pad + hidden MMR
Industry pattern (Fall Guys, Apex, Royal Match): hide MMR for first ~5 matches + pad lobbies with bots. LexiClash already has bots in MP (`backend/handlers/...`); the missing piece is a `first_mp_matches < 3` flag + matchmaker bias.

### Mid-round interruption: hard ban list (NN/G + game-UX consensus)
Popups during critical tasks are the #1 UX complaint ([NN/G](https://www.nngroup.com/articles/popups/), [Xmartlabs](https://blog.xmartlabs.com/blog/pop-up-ux-design/)). Apply to active MP rounds:

**BAN mid-round:**
- Achievement toasts
- Level-up celebrations
- Friend joins / leaves (queue for post-round)
- `SignupPromptHost`
- Cross-promo / next-step prompts
- Ads (rewarded only if player-triggered)
- Daily-streak banners

**ALLOW mid-round:**
- Critical errors (disconnect, kicked)
- Direct game-state feedback (your word scored, opponent eliminated — already in-grid not modal)
- Timer warnings (in-HUD, not modal)
- Boost / power-up activation visuals (player-initiated)

### Stress reduction patterns (from research + memory)
1. **Hidden MMR for first ~5 matches** (Apex, Valorant)
2. **Bot padding** so worst-case is "I beat the bots" (Royal Match early levels)
3. **Always-positive results screens** — lead with "Best word: X · New PR: Y", never with miss count
4. **No-loss-streak shield** for first week (Royal Match)
5. **Generous timers in practice** + optional no-timer mode

### Cross-promo placement: post-results only
NextStepPrompt is correctly mounted post-results in `PracticeResults.tsx`. Don't add a pre-results prompt — that's the stress vector.

---

## What Makes Practice Mode Fun (Not a Chore)

Per user's added constraint ("our practice should also be fun + engaging"), practice ≠ tutorial seed. Practice is a **replayable destination** with engagement loops independent of competition.

### Engagement pillars

| # | Pillar | Cost | Existing primitive? |
|---|---|---|---|
| 1 | Variable seed boards (never the same puzzle) | ~0 | `lib/board-selection-system` (best-of-N solver) |
| 2 | Optional self-goals ("find 5 power words", "rare-letter combo") | S | `components/missions/*` (reuse) |
| 3 | Generous / no-timer mode toggle | S | `useSinglePlayerConfig.ts` |
| 4 | Free hint button (forbidden in MP) | M | needs new `HintReveal` component |
| 5 | Always-positive results card | S | extend `PracticeResults.tsx` |
| 6 | Daily practice streak (lite, doesn't break on skip) | M | mirror `useStreak` w/ no-break flag |
| 7 | "What if?" replay — show 1 missed word + tap-to-trace | M | reuse `WordPathHighlight` from results |
| 8 | Random fun modifier per session ("vowel-only", "double-letter day", "S-words boss") | L | NEW `lib/practice/modifiers.ts` |

`★ Engagement multiplier`: Pillar 8 (modifier roulette) is the single most replayable lever. Royal Match / Candy Crush extend lifespan via modifiers, not new content. ~12 modifiers cycling = effectively infinite novelty for ~2 weeks of work.

### Anti-patterns to avoid
- ❌ "Practice" labeled as "tutorial" — kills replay intent (player thinks "done, never again")
- ❌ Score comparison vs other players — practice is self-stakes only
- ❌ Coin/XP rewards equal to MP — would cannibalize MP. Practice grants ~10-25% of MP rate.
- ❌ Locked behind "complete tutorial" — must be accessible from landing day 1.

---

## 3-Surface Model (Detailed)

### Surface 1: Tutorial Seed (per-mode, one-shot)

**Trigger:** First entry to a mode where `first_played_<mode> === false`.
**Format:** ~30s pre-baked board. Single mechanic. Guaranteed success.
**Skippable:** Yes (top-right "Skip"). Skip sets the flag so it doesn't re-show.
**Per mode:**

| Mode | Mechanic to teach | Seed design |
|---|---|---|
| Word Wheel | Drag through ring letters to spell | Wheel pre-loaded with `CAT, BAT, TAB`; 3-word target hint visible |
| Word Hunt | Time-pressure + grid scan | 4×4 grid with 5+ short obvious words; 60s timer; "find any 3" prompt |
| Boggle | Adjacency rule | 3×3 grid w/ `THE, HER, EAR` solvable along a single path |
| Connections | Group-of-4 | 4×4 with one obvious group highlighted as example, 3 to find |
| Blast | Goal-word + power tile | 5×5 with `target_word=PLAY` and one color_power tile |
| Wheel Rush MP | Steal mechanic + scoring | Solo seed using 1 bot; teach steal in 2 turns |

**Tech:** New `components/<mode>/TutorialSeed.tsx` per mode. Shared `lib/tutorialSeed/runner.tsx` orchestrates: attract loop → seed → success burst → "Try the real thing →" CTA.

### Surface 2: Practice Mode (replayable, fun-on-its-own)

**Trigger:** Player picks "Practice" from mode card or post-tutorial CTA.
**Format:** Real game w/ 4 modifications:
1. Random fun-modifier banner ("Today: VOWEL-ONLY · Earn 1.5× for words with no consonants")
2. Self-goals chip strip ("☐ Find 5 words · ☐ Word ≥ 6 letters · ☐ Beat your PR")
3. Free hint button (3 hints/session)
4. Generous timer toggle (default 1.5× MP timer; off-mode available)

**Results screen:** `PracticeResults.tsx` (extended) leads with PR + best-word + streak-lite, then small score footer. Mascot speech-bubble reaction. No comparison to other players.

**Streak-lite:** New `usePracticeStreak.ts` — increments on any practice session, never breaks. Pure dopamine ladder.

**Reward:** ~15% of MP coin rate. Modifier roulette resets daily.

### Surface 3: Competitive Mode (existing, ban popups)

**Mid-round popup audit + ban list** = slice D (separate spec).
**Bot-pad first MP matches + hide MMR** = slice D.

---

## Slice Plan

| Slice | Scope | Effort | Risk | Order |
|---|---|---|---|---|
| **E** | Research synthesis (this doc) | done | none | done |
| **D** | MP mid-round popup audit + interruption-suppression rules + bot-pad first 3 matches + hide MMR | M | low (defensive only) | next |
| **B+A pilot** | Word Wheel: tutorial seed + practice mode w/ 3 modifiers + self-goals + streak-lite + free hints | L | medium (new components, new state) | after D |
| **B+A clone** | Repeat pilot pattern for Word Hunt → Connections → Blast → Boggle → Wheel Rush MP | L per mode | low (pattern proven) | after pilot |
| **C** | Extend `NextStepPrompt`: add `practice → multiplayer` arc gated on `practiced_mode_count >= N` + mascot graduation moment | S | low | after pilot |

`★ Sequencing rationale`: D first because it ships value to existing players this week with zero new content. Then pilot one mode end-to-end (Wheel — biggest traffic per memory), prove the pattern, only then clone. This avoids the failure mode of designing 6 mode tutorials in parallel and discovering the seed-runner abstraction doesn't fit.

---

## Out of Scope (this doc)

- First-ever FTUE polish — covered in `2026-04-27-onboarding-glow-up-design.md`. Ship that first or in parallel.
- Education/classroom practice (`PracticeSessionProvider.tsx`) — separate domain (SRS for students), not gameplay warm-up.
- Adventure mode practice — Adventure has its own progression; practice equivalent = repeat-level. Out of scope.
- Word Vault — separate v3.5 spec, escape-room not practice paradigm.
- New backend score/economy changes — see `economy-balance-audit-2026-04-22`.
- Lottie/Remotion attract loops — optional polish, defer to post-pilot.

---

## Open Questions (for slice D and pilot)

1. **Slice D**: Is "post-round summary" the right defer target for queued mid-round notifications, or a separate "what you missed" tray?
2. **Slice D**: Bot-padding policy — pad to lobby_size or just pad any single empty slot? Affects matchmaker change scope.
3. **Pilot**: Word Wheel modifiers — start with how many? Recommend 3 (vowel-only, double-letter, S-words) and grow based on session-2 retention.
4. **Pilot**: Streak-lite — should it grant coins, just visual badge, or both? Recommend visual + small per-day coin to keep economy clean.
5. **Cross-promo C**: Threshold N for practice→MP graduation prompt. Recommend N=3 sessions in a single mode.

---

## Sources

- [Game Developer — Interactive Tutorials for an Interactive Medium](https://www.gamedeveloper.com/design/interactive-tutorials-for-an-interactive-medium)
- [Apple — Onboarding for Games](https://developer.apple.com/app-store/onboarding-for-games/)
- [Inworld — Best practices for video game onboarding](https://inworld.ai/blog/game-ux-best-practices-for-video-game-onboarding)
- [Inworld — Best practices for tutorial design](https://inworld.ai/blog/game-ux-best-practices-for-video-game-tutorial-design)
- [Adrian Crook — Mobile Game Onboarding](https://adriancrook.com/best-practices-for-mobile-game-onboarding/)
- [NN/G — Popups: 10 Problematic Trends](https://www.nngroup.com/articles/popups/)
- [Xmartlabs — Closing the Pop-Up Dilemma](https://blog.xmartlabs.com/blog/pop-up-ux-design/)
- [SuperJump — Video Game Tutorials Are Awful](https://www.superjumpmagazine.com/video-game-tutorials-are-awful/)
- [TheGamer — Clever Tutorials That Didn't Feel Like Tutorials](https://www.thegamer.com/clever-video-game-tutorials-didnt-feel-like-tutorials-hidden-blended/)
- [Mobile Game Doctor — FTUE & Onboarding](https://mobilegamedoctor.com/2025/05/30/ftue-onboarding-whats-in-a-name/)
- [UX Collective — Games UX: Building the right onboarding experience](https://uxdesign.cc/games-ux-building-the-right-onboarding-experience-a6e99cf4aaea)

---

## Appendix: File Index for Implementation

When this design transitions to implementation plans, expect:

**New files:**
- `lib/tutorialSeed/runner.tsx` — orchestrator
- `lib/tutorialSeed/seeds/<mode>.ts` — per-mode pre-baked boards
- `lib/practice/modifiers.ts` — modifier roulette
- `hooks/usePracticeStreak.ts` — break-proof streak
- `hooks/useFirstPlayedFlag.ts` — server+localStorage gate
- `components/<mode>/TutorialSeed.tsx` — per-mode seed UI
- `components/practice/ModifierBanner.tsx`, `SelfGoalChips.tsx`, `HintButton.tsx`
- `backend/handlers/markFirstPlayedHandler.ts` — server flag write

**Modified:**
- `components/results/NextStepPrompt.tsx` — add `practice → multiplayer` arc
- `components/singleplayer/results/PracticeResults.tsx` — positive-frame extension
- `backend/handlers/...matchmaker...` — bot-pad + hidden MMR for first 3 matches
- `components/multiplayer/*` — mid-round popup suppression (slice D)
- `translations/*.json` — 5 locales for all new strings
