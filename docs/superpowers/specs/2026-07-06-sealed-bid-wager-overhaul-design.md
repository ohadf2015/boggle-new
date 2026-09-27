# Sealed Bid — Wager Overhaul Design

**Date:** 2026-07-06
**Status:** Approved-by-directive (autonomy mode — no approval gate)
**Scope:** Solo Sealed Bid full overhaul. MP: input parity only (wager deferred).

---

## 1. Goal

Turn solo Sealed Bid from a static tap-a-rack preview into a **betting game**: spin up a word on a
**word wheel**, then **stake chips** on whether your word is *unique* against hidden opponents. Unique
bids pay out at odds scaled to word rarity; clashes lose the stake. Add PixiJS + GSAP juice so it reads
like a high-stakes auction/casino table, on-brand with the neo-brutalist "electric party" identity.

The mode is already surfaced on the homepage (calm-modes "Take Your Time" section, `3f8b260cf`) but the
solo page still blocks non-admins. This overhaul finishes it enough to **ungate**.

---

## 2. Core loop (solo)

Each game = 5 rounds. Player starts with a **chip stack** (e.g. 100 chips).

Per round:
1. **Deal** — a 7-letter rack appears on a wheel. The rack is random-looking but guaranteed to contain
   at least one full-rack ("all letters") word and several shorter words.
2. **Spell** — drag across wheel tiles to build a word (reuse `useWheelDragSpell`).
3. **Read the odds** — as the word forms, an **odds board** shows the live payout multiplier for *this*
   word if it lands unique (rarer/longer word → higher multiplier → but higher clash risk).
4. **Wager** — stake chips (chip tray: tap/slide to set amount, min 5, max = current stack).
5. **Lock bid** — sealed. Opponents' picks are hidden until reveal.
6. **Showdown** — opponents' words flip up. Resolve:
   - **Unique** (no opponent bid the same word): `payout = stake × multiplier`. Chips stream in.
   - **Clash** (≥1 opponent same word): lose the stake. Chips shatter.
   - **Pass / invalid**: stake returned (no word submitted), or a small ante lost on invalid.
7. Advance. After round 5, **cash out**: remaining chips convert to coins at a modest rate and award via
   `CoinContext.awardCoins` (once/day dedupe, existing `awardSoloDaily` pattern).

Opponents in solo = 2–3 **bots** with curated/heuristic picks per rack (extends `rounds.ts` bot-pick
pattern). Bots bias toward common high-value words so the *safe* short word is more clash-prone and the
*rare* long word is more likely unique — this is what makes the wager a real decision.

---

## 3. The "guaranteed full-rack word" generator

**Constraint:** solo is client-only; there is no shipped client dictionary (only `/api/dictionary/check`,
one word per call). So the guarantee is established **offline at build time**, not at runtime.

**Approach** (mirrors `wordWheelGeneration.ts`'s ship-curated-data precedent):
- A Node script (`scripts/genSealedBidRacks.ts`) uses the existing backend trie
  (`backend/boggleSolver.ts` → `findAllWords` / `getCachedTrie`) to evaluate candidate 7-letter
  multisets per language (en, he).
- Keep a rack only if it has **≥1 seven-letter word** (the "bingo") AND **≥6 total formable words**
  spanning short (3–4) and long (6–7) — guaranteeing both a safe play and a risky play exist.
- Emit `lib/sealedBid/sp/data/sealedBidRacks.generated.json`:
  ```
  { en: [ { letters: "AEINRST", bingoWords: ["RETINAS","RETSINA","STAINER","ANESTRI"],
           wordsByLen: { "3": [...], "4": [...], ... }, botPicks: [...] } ], he: [ ... ] }
  ```
- Client picks a rack per round deterministically (PRNG seed from date+round, `mulberry32`) and
  **shuffles the letters** for display so the rack looks random and telegraphs no single answer
  (multi-solution racks reinforce this).
- `botPicks` precomputed from `wordsByLen` (weighted toward common mid-length words).

**Rarity → odds multiplier**: reuse `lib/wordWheel/wordRarity.ts` scoring. Longer + rarer word → higher
multiplier (e.g. 1.5× … 6×). The multiplier is the *published odds*; clash risk rises with commonness,
which the player learns to read.

**Player word validation at lock**: still `/api/dictionary/check` (authoritative) + `canFormFromRack`
(existing) + min length 3. The generated pool guarantees *a* word exists; the player's own word is
checked live as today.

---

## 4. Currency — mode-local chip wallet

- New `lib/sealedBid/sp/chipWallet.ts` (pure): `startStack`, `stake`, `settle(unique|clash|pass)`,
  `cashOut(chips) → coins`. No global-coin spend during play (avoids loss-aversion churn on hard
  currency — Blast gem-wallet precedent).
- Only the **final cash-out** touches `CoinContext` (award, never spend). Conversion modest (e.g.
  10 chips → 1 coin), capped, once/day to stay economy-safe.
- Going bust (stack hits 0) ends the game early with a "busted" state — a real stakes consequence.

---

## 5. UI / components

**Aesthetic direction — neo-brutalist poker table.** Fuse the brand (dark navy, hard pixel shadows,
solid borders, electric accents, Fredoka/Rubik) with **poker vibes**: a felt playing surface, physical
chip stacks, sealed-bid "cards" that flip at showdown, a published odds board like a betting parlor.
Not literal Vegas gradients/glass — keep hard shadows and solid fills. Use the **frontend-design skill**
+ `.claude/docs/design-system.md` tokens when building each surface so it reads as an intentional,
distinctive table, not a templated card list. Felt = deep green-tinted navy (`neo-navy` base with a
subtle felt texture/vignette), chips color-coded by denomination (lime/cyan/pink/purple accents),
gold reserved for payout/jackpot moments.

Rework `app/[locale]/sealed-bid/page.tsx` (solo) into a table-felt betting layout:

| Zone | Component | Notes |
|---|---|---|
| Wheel | **new** `SealedBidWheel.tsx` wrapping `useWheelDragSpell` + `WordWheelParts` (all `isCenter=false`) + a recolored `WordWheelPixiRing` (gold/casino orbital) | 7 flat tiles, no center |
| Odds board | **new** `OddsBoard.tsx` | live "UNIQUE PAYS ×N" + current word value; GSAP odometer roll |
| Chip tray | **new** `ChipTray.tsx` | set stake; GSAP chip toss to the felt |
| Stack HUD | inline | current chips, round, potential payout |
| Showdown | **new** `Showdown.tsx` | GSAP card-flip of opponent words; unique=jackpot, clash=shatter |
| Cash-out | extend `SealedBidSessionSummary.tsx` | chips→coins tally, share card |

**Juice (Pixi + GSAP):**
- Wheel orbital ring recolored gold; connection line = neon "bet line".
- Chip toss: GSAP `back.out` arc onto the felt.
- Odds odometer: GSAP number roll on the multiplier.
- Lock: sealed-envelope / wax-stamp stamp (GSAP scale+rotation punch).
- Showdown reveal: staggered `flip`-style card turn (GSAP), `elastic.out` on the winner.
- Win: `SharedFxApp.spawnCoinStream` chips→stack; jackpot burst on a unique full-rack bingo.
- Clash: chip-shatter particle burst (Pixi Graphics), screen shake (bounded), red flash.
- All motion behind `useReducedMotion` / `gsap.matchMedia` reduced-motion (static fallback).

**Assets (generate only if CSS/Graphics falls short):**
- Poker chip sprite(s) in neo palette — *likely CSS/Graphics, no asset needed*.
- Mascot "high-roller" pose PNG (personality) — generate via higgsfield if cheap; optional.
- Wax-seal / gavel glyph — CSS/SVG first.

Ponytail: default to Graphics/CSS for chips and seals; generate a PNG only for the mascot personality beat.

---

## 6. Engine changes

`lib/sealedBid/sp/sbEngine.ts` gains wager-aware resolution alongside the existing point scoring:
- `resolveRound` already returns unique/clash/none. Add `settleWager(outcome, stake, multiplier)` →
  chip delta. Keep base points for the summary/leaderboard; **chips are the headline currency**.
- `multiplier` derived from word rarity/length at bid time, passed into settle.
- New pure module `chipWallet.ts` owns the stack math (tested).
- Bot picks sourced from the generated pool's `botPicks`.

MP engine (`sbMpEngine.ts`) untouched.

---

## 7. Multiplayer (deferred wager, optional input parity)

- **Wager in MP is OUT of scope** — cross-player chips raise fairness/economy/protocol concerns
  (new socket payload, engine, tests). Deliberate deferral, noted here.
- **Optional, low-cost:** swap MP `SealedBidVersus` tile input to the shared `SealedBidWheel` for input
  parity. Only if the component extracts cleanly with zero protocol change. Otherwise skip.

---

## 8. Ungating

Final step, after the solo experience is solid:
1. Replace `canSeeInWorkModes` guard at `page.tsx:226` with a soft-launch check (ship to all; keep a
   kill-switch flag if one exists, else remove guard).
2. Confirm the homepage calm-modes card routes correctly (already wired per `3f8b260cf`).
3. Do **not** add to the in-game MP `GameModeSelector` (MP stays beta).

---

## 9. Testing (TDD — mandatory, RED first)

Invariants that get a failing test before implementation:
1. **Rack guarantee** — every rack in `sealedBidRacks.generated.json` (per language) has non-empty
   `bingoWords`, all `bingoWords` use all 7 letters, all are formable via `canFormFromRack`, and total
   words ≥6 spanning ≥2 length buckets.
2. **Wager math** — `settleWager`: unique → `+stake×(multiplier−1)` net (stake returned + winnings);
   clash → `−stake`; pass → `0`; invalid → `−ante`. `chipWallet` never goes negative; bust at 0.
3. **Multiplier** — rarer/longer word yields ≥ multiplier of a common short word (monotonic-ish).
4. **Cash-out** — chips→coins conversion floors correctly, awards once/day, never spends.
5. Existing `sbEngine`/`rackBuilder` tests stay green (base scoring preserved).

Generator script also self-checks (asserts every emitted rack meets the guarantee before writing).

---

## 10. Files

**New**
- `scripts/genSealedBidRacks.ts` (build-time generator, self-verifying)
- `lib/sealedBid/sp/data/sealedBidRacks.generated.json`
- `lib/sealedBid/sp/chipWallet.ts` (+ test)
- `lib/sealedBid/sp/rackPool.ts` (deterministic pick + shuffle from generated JSON) (+ test)
- `components/sealedBid/SealedBidWheel.tsx`
- `components/sealedBid/OddsBoard.tsx`
- `components/sealedBid/ChipTray.tsx`
- `components/sealedBid/Showdown.tsx`

**Changed**
- `app/[locale]/sealed-bid/page.tsx` (rework to betting layout + ungate)
- `lib/sealedBid/sp/sbEngine.ts` (`settleWager`, multiplier, bot picks from pool) (+ test)
- `components/sealedBid/SealedBidSessionSummary.tsx` (cash-out tally)
- `translations/{en,he,sv,ja,es}.js` (all new copy via `t()`; native — he/ru need care)

**Untouched:** MP engine/handler/socket schema, `rounds.ts` (kept for MP fallback), backend.

---

## 11. Risks / open

- **Generator dictionary access** — script must import backend trie loader in a Node context; verify it
  runs standalone. If not, fall back to hand-curating ~20 racks per language and verifying each via
  `/api/dictionary/check` in a one-off script.
- **he racks** — Hebrew sofit normalization already handled in `rackBuilder`/engine; generator must emit
  base forms, display applies sofits (`toDisplay`). he word authoring quality: verify against dict, don't
  trust model-authored he.
- **Economy** — chip→coin rate must be conservative; sanity-check daily-coin ceiling isn't blown.
- **Wheel duplicate letters** — racks with repeated letters render as distinct tiles; `canFormFromRack`
  multiset logic already correct.
