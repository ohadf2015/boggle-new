# Connections / Word Bridge — Viral + DB-backed + All-Languages

**Date:** 2026-06-01 · **Source:** /claude-council:ask (gemini-3-flash + grok-4.20) + online research (NYT Connections, COMPOUND, Bridge Words, ChainWhich) + advisor review.

## Problem
1. **3 of 5 languages are broken.** `resolveLocale` (puzzles/index.ts:104) falls back to `'en'` for any locale not in the pool. `PUZZLES_BY_LOCALE` has only `en` (336) + `he` (337). So **sv / ja / es players play English puzzles** behind a translated UI — nonsensical.
2. **Puzzles are static `.ts` only.** No DB source-of-truth, no editing, no per-locale candidate pipeline. User wants puzzles managed "using the db".
3. **Share is anemic.** `dailyShareText` = `🌉 Word Bridge 2026-06-01 / 2/5 ✅ · 🔥7 · #14`. No story-of-the-chain grid → dies in group chats. Council ranked the emoji grid the #1 viral lever; competitor COMPOUND has no grid → open lane to own it.
4. Reveal lacks signature juice; no "why it works" teach-moment.

## Architecture decision (load-bearing)
**DB = authoring source-of-truth. Static `.ts` = build-time materialized snapshot (committed to git) = runtime load path.**
- Preserves the daily's byte-identical determinism (leaderboard integrity) — daily stays a *pure* function over committed static pools. No async-at-runtime, no mid-day set drift.
- DB (`connections_puzzles`) is where puzzles are created/edited/reviewed; a `sync` script materializes active rows → `.ts` pool files.
- Non-native / generated puzzles land as **candidates gated through the existing review pipeline** (`connections_ugc_puzzles` / `connections_puzzle_reviews` / `connections_puzzle_feedback_stats`), never dumped straight into the active daily pool. (Grok: "never ship non-native unverified puzzles.")

## Phases (sequenced by verifiability; commit per phase)
- **P-A — Emoji-grid share card (viral, independent, zero DB risk).** Pure `buildDailyBridgeGrid()`: one row per bridge, symbol-coded by solve quality (🟩 clean · 🟨 hint/1-wrong · 🟥 fail · ⚡ perfect-fast · 💡 hinted), plus social callout (Perfect! / N-away). Localized header, language-agnostic body. TDD. Wire into share handler.
- **P-B — DB foundation.** Migration `connections_puzzles` (id, locale, word1, bridge, word2, accepted_answers[], hint, examples jsonb, difficulty, source, is_active, available_from, quality cols). Seed all 673 existing. RLS public-read-active, admin-write. Add `examples`/`source` to `ConnectionPuzzle` type. Widen `PuzzleLocale` → 5 langs. Sync script DB→static. Safe: en/he behavior unchanged.
- **P-C — Fix 3 broken languages.** Council-vetted (gemini+grok as semi-native reviewers) native bridge seeds for es / sv / ja. Insert to DB + materialize static pools so all 5 langs play native puzzles. Small verified seed, not a large unverifiable dump. Watch pitfalls: ES gender, SV closed-compound length, JA kanji jukugo + input method.
- **P-D — Bridge-snap reveal + why-it-works juice.** Anchors slide apart, bridge materializes with difficulty-tiered color-flash; show real compound examples (from `examples`) below = teach-moment + talkability. Escalating streak juice. Reuse `ConnectionsEffectsCanvas` / `useSoundEffects` / `useHapticFeedback`.

## Constraints
- TDD mandatory; files < 500 lines; all UI text via `t()`; 5 langs incl. Hebrew RTL.
- Daily set must stay identical per (date, locale) for all players.
