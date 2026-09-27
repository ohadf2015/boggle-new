# Word Bridge (Connections) — Hebrew Overhaul + Competitive/Addiction Layer

**Date:** 2026-05-30
**Game:** Word Bridge (`/[locale]/connections`, Hebrew "ראש זנב") — two words shown, find the single bridge word that collocates with both.
**Goal (user):** Make it genuinely good in **Hebrew** + more **satisfying**; replace open text input with **on-screen letters**; improve riddles; add **UGC** riddle suggestions + **dynamic ranking**; add **leaderboard + competitive elements to make people addicted**; better celebrations/fun; better landing.

---

## 0. Decisions locked (advisor-reviewed)

1. **Input = on-screen full 22-letter Hebrew keyboard (Wordle-style), NOT a letter-rack.** A bridge answer is an *unknown* word; a rack of its scrambled letters leaks length + letter-set and turns a riddle into an anagram. Mirror the proven `lib/wordAlchemy/keyboard.ts` pure-fn + `AlchemyKeyboard` component shape.
2. **Two ranking systems kept separate**: (a) **player leaderboard** (compete) and (b) **UGC riddle ranking** (good riddles rise by community vote). Never merged.
3. **No Supabase realtime** for any of this (project rule `50-supabase-perf.md`; prior 94.82%-CPU incident). On-demand / polling fetch only.
4. **Edits serial + TDD + small per-phase commits** (daemon clobbers uncommitted tracked files; parallel writers race, translations worst). Read-only fan-out only.
5. **Riddle improvement = prune broken, not blind-add.** The forum harvest under-delivered; new-riddle generation needs a validated Hebrew-quality gate (Wave 2).

---

## 1. Current state (from understanding pass)

- **Engine** (`lib/connections/gameLogic.ts`, pure): `checkGuess(input, puzzle)`, `applyGuess(state, input)`, `advancePuzzle`, `giveUp`, `revive`, `revealHint`, `markRated`, `xpForPuzzle`. Points easy/med/hard = 100/200/350, INITIAL_LIVES=3, streak bonus threshold 3.
- **State** (`lib/connections/types.ts`): `GameState { puzzles, currentIndex, score, streak, lives, wrongAttempts, status, input, completedIds, ratedIds, hintRevealed }`. `GameStatus = playing|correct|wrong|gaveUp|outOfLives|finished`. `ConnectionPuzzle { id, word1, word2, bridge, acceptedAnswers?, hint?, difficulty }`.
- **Controller** (`components/connections/ConnectionsGame.tsx`, **513 lines, over cap**): 7-action reducer (`SET_INPUT, SUBMIT, GIVE_UP, REVIVE, REVEAL_HINT, MARK_RATED, RESET`); fires `connections:correct|wrong|lifeLost|gameOver|levelUp` window events; XP POST `/api/education/record-xp`; `trackGameStart/trackGameEnd`; `sessionScore`/`xpEarned` accumulators.
- **Input UI** (`components/connections/PuzzleCard.tsx`, **454 lines**): the ONLY text `<input>`. Props: `onInputChange, onSubmit, onGiveUp, onRevealHint, onRate, onNext`. `commitAndSubmit` buffers `inputRef.value`, IME via `onCompositionEnd`.
- **Data** (`lib/connections/puzzles/*`): id `he-e-001`/`he-m-050`/`he-h-033`/`he-g-1`. `getPuzzleForLevel(locale, level, banned)`, `interleaveByBridge`, banned via `v_connections_banned_puzzles`. **No sofit normalization anywhere.**
- **Landing** (`app/[locale]/connections/page.tsx` + `PageClient.tsx` + 7 section components): copy hardcoded in `content.ts` (EN/HE only). Demo uses **reveal buttons**, not playable. 3 JSON-LD (FAQ/VideoGame/Breadcrumb).
- **Reusable FX** (confirmed): `fireVictoryConfetti/fireStreakConfetti/fireLevelUpConfetti/fireConfetti`, `useHapticFeedback()` + `GAME_HAPTICS`, sound methods `playVictorySound/playLevelUpSound/playStreakSound`, mascot `pickCelebrationKind`.
- **Infra**: season-aware `leaderboard` + `player_ratings`/tiers (stone..grandmaster) tables exist; UGC patterns (`community_boards`, `ugc_word_packs`, `*_ratings`, `*_reports`, RPC counter bumps) exist but nothing wired for connections.

### Riddle quality reality
- Generated-hard (`he-g-*`) **poor** (validator checks only Wikipedia bigram freq; e.g. `תחליף|בשר|בקר`, `סירת|גומי|ערבי` incoherent).
- 11 flagged-but-unfixed: calques (`ניקיון|אביב|פורח` = "spring cleaning"), reversed smichut, literary/archaic, plural-broken (he-e-022/094/098/100/105, he-m-006/052/058/119, he-h-088/097).
- Harvest yield low + many degenerate → defer net-new riddles to a validated Wave 2 pass.

---

## 2. Scope — Waves

### WAVE 1 (this effort — ship + test green)

**P1. On-screen Hebrew keyboard input (+ sofit normalization fix)** — *the "letters on screen" + Hebrew-core*
- New `lib/connections/keyboard.ts` (pure): `getKeyboardLetters(locale)` (he → `HEBREW_BASE_LETTERS`, else A–Z), `appendLetter(cur, l)` (cap MAX_GUESS_LEN), `backspace(cur)`.
- New `components/connections/ConnectionsKeyboard.tsx`: dir-aware key grid + backspace + submit, `disabled`, RTL shadow auto-flip; props mirror Alchemy.
- **Fix `checkGuess`**: normalize BOTH guess and answer(s) with `normalizeHebrewWord` (Hebrew) so base-letter keyboard input matches sofit-ending bridges. TDD a failing case first (e.g. bridge `עץ`→ok, a sofit-ending bridge currently unsolvable from base input).
- Replace `<input>` in PuzzleCard with the keyboard, keeping the live typed buffer rendered (read-only display) + Enter/submit via on-screen key. Preserve exact PuzzleCard prop names. Extract input block into the new component to relieve the 454-line file.
- Desktop: allow physical keyboard typing to still drive the buffer (progressive enhancement), but on-screen is primary.

**P2. Celebrations / satisfaction / fun**
- Hook existing FX to events: `connections:correct` → success haptic + correct SFX + (streak≥3) `fireStreakConfetti`; new personal-best / milestone → `fireVictoryConfetti` + `playVictorySound` + mascot pop; `connections:wrong` → error haptic + shake (respect reduced-motion + Cosy intensity).
- Satisfying reveal animation when bridge is revealed (correct/gaveUp): the bridge word "snaps" between word1/word2.
- Combo escalation feedback (consecutive correct in session): escalating tone + intensity (purely client; no backend).

**P3. Competitive / addiction layer** — *the headline*
- **Daily Challenge**: deterministic puzzle set seeded by UTC date (`dailySeed(date, locale)` pure) — same puzzles for everyone that day; one play/day; shareable result string.
- **Leaderboard (player)**: score submit API + read API for connections daily scores; ranked board (top N + own-rank window ±2, "rivals" view). New table `connections_daily_scores`. No realtime.
- **Streak**: consecutive-day solve streak persisted (server for authed, localStorage for guests); 🔥 escalation + milestone celebration at 3/5/10; comeback handling.
- Tie score into existing tier/XP where natural; surface rank + streak in-game HUD.

**P1.5 (safe, low-risk, folded in). Riddle pruning**
- Remove the clearly-broken generated-hard + the 11 flagged puzzles from active pool (removal only — no rewrite, no native-Hebrew risk). Keep ids stable; don't reuse.

### WAVE 2 (specified, deferred — next session)
- **UGC riddle submission** (`connections_ugc_puzzles` + moderation_status) + **community vote ranking** (separate board, min-votes gate, "Classics" surfacing). Reuse UGC table/RPC patterns.
- **Validated new-riddle generation**: workflow that proposes Hebrew bridge puzzles → adversarial Hebrew-quality gate (both compounds real, natural register, correct smichut direction, base-letters) → curated add. Replaces the pruned ones.
- **Landing redesign**: interactive playable demo using the on-screen keyboard (not reveal buttons); refreshed hero/sections; keep EN/HE; extend JSON-LD.
- **Weekly challenge / rare-riddle / rival-duel** extras from the design lane (effort M/S/M).

---

## 3. Constraints / invariants
- All UI strings via `t('key')` across **5 langs** (en/he/sv/ja/es); stage only my own i18n hunks (daemon contaminates translation files).
- Hebrew: **store/compare BASE letters, render SOFIT at display edge only** (`applyHebrewFinalLetters`).
- Keep new files < 500 lines; split `ConnectionsGame.tsx`/`PuzzleCard.tsx` as the input change forces extraction.
- TDD RED→GREEN→REFACTOR; `npm run lint && npm run test && npm run build` before each phase commit.
- New Supabase table → migration in `fe-next/supabase/migrations/` (timestamped); RLS; NOT added to `supabase_realtime`.
- Server score writes via service client + `auth.getUser()`/guest fingerprint, rate-limited, like existing custom-puzzle attempt routes.

---

## 4. Build order (per-phase commits)
1. **P1a** sofit-normalization fix in `checkGuess` (TDD) — smallest, unblocks Hebrew correctness.
2. **P1b** `lib/connections/keyboard.ts` pure (TDD) + `ConnectionsKeyboard.tsx`; wire into PuzzleCard, retire `<input>`.
3. **P1.5** prune broken puzzles.
4. **P2** celebrations/fun wiring.
5. **P3a** daily-challenge seeding (pure, TDD) + HUD.
6. **P3b** `connections_daily_scores` migration + submit/read APIs (TDD) + leaderboard UI + streak.
7. Playwriter live-verify Hebrew RTL at 390px (keyboard taps, celebration, leaderboard).
8. Wave 2 if context remains.

Deferred explicitly: UGC submission, validated new-riddle generation, landing redesign, weekly/rare/rival extras.
