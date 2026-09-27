# Blast v2 — Lose Condition, Result-Page Redo, Feel Polish

**Date:** 2026-06-06
**Mode:** Blast v2 (admin-only solo level campaign — `lib/blast/v2`, `components/blast/v2`, `app/[locale]/blast/v2`)
**Inputs:** advisor (2 passes, reconciled) + claude-council (Gemini + Grok). Both council members + the codebase author + advisor converge on the design below.

## Problem / Goal

1. **Loose end:** Blast v2 has **no lose condition** — every level advances, even a partial finish (1★). Product owner wants *"progress saved unless the player loses a level."* A loss must be possible and felt.
2. The result page is functional but should be **genuinely fun to watch**, and must handle **all outcomes** (incl. the new loss).
3. Improve **general feel** (juice / pacing / dopamine) with cheap, high-impact changes.

## Key design decisions (locked)

### A. Lose = per-level STRIKE budget (NOT partial-as-loss, NOT a timer)
- **Rejected: partial-as-loss.** Collapse gravity can strand a theme word through no fault of the player; the outcome is opaque ("reads as bug, not challenge" — both council members; "isn't a skill failure" — `completion.ts` author). Punishing it makes the mode *less* fun, contradicting the goal. **Partial stays a 1★ WIN that advances.**
- **Rejected: timer.** Timers punish thinking — the core loop of a word game. (Both council members.)
- **Chosen: STRIKE budget.** A *strike* = a **confirmed wrong guess**: the player committed a structurally-valid path forming letters that are neither a theme word nor a real dictionary word (the existing `rejectConfirmed` path). Run out of strikes with theme words remaining → **`levelFailed`** → retry same level.
  - **Provably fair for ANY budget ≥ 1, no solver dependency:** perfect play makes **0 strikes** (min moves to master = `words.length`, each a valid theme submit; cascades only *reveal*, they don't auto-submit). A careful player can always win. Only deliberate wrong guesses cost. Bonus-word finding and thinking time are *never* punished (the council's exact fear).
  - **Late-ramping & generous:** no budget before `STRIKE_UNLOCK_LEVEL` (= 6) — preserves chill Wordscapes onboarding. From L6: `6` strikes, −1 per 20 levels, floored at `3`.
  - **What is NOT a strike:** structural mis-drags (gap / axis / length / frozen) — those are fat-finger, not guesses; duplicates (the word was real); any accepted theme/bonus word.

### B. Progress semantics (the PO requirement, falls out for free)
- Server `clear-level` RPC (bumps `current_level`, awards coins/chest) is called **only on a win** (`mastered` or `partial`). It is **never** called on `levelFailed`.
- ⇒ A loss never advances the campaign and never persists in-level coins/chest. Campaign progress (current level, total coins, chest) is preserved. **"Progress saved unless you lose" with no server change.**

### C. Result page = one card, outcome-scaled celebration
`BlastResultCard` renders three variants; celebration intensity scales to outcome:
- **`mastered`** — full juice: stars cascade (1–3), coin counter, confetti, new-best badges, highlight line. → "Next Level".
- **`partial`** — softer win: "Board Cleared", 1★, modest FX, gentle highlight. → "Next Level".
- **`levelFailed`** — **NO confetti.** Calm, encouraging "Out of guesses" frame (mascot, "so close — N/M words"), shows what they found. → primary "Try Again" (retry same level) + secondary back. Never punitive copy.

### D. Feel polish (council Tier-A — several are already-computed, just unsurfaced)
1. **Theme clear louder than bonus** — invert current emphasis (theme = `TARGET!` burst; bonus = quiet `+N`).
2. **"Cascade available" telegraph** — when `detectAllCascades` returns hits after a clear, pulse those tiles / chip.
3. **Almost-word nudge** — `almost-word.ts` exists; surface a shimmer + quip when 1 letter from a remaining theme word.
4. **Strike feedback** — when a strike lands, a clear (non-cruel) "✕ strikes left" pip animation in the HUD.
5. **Instant result** — tap-to-skip settle before the result card.

## Implementation phases (TDD on all pure logic; per-phase commit, ask first)

- **Phase 1 — Lose engine (pure + reducer):**
  - `lib/blast/v2/strike-budget.ts` (NEW, pure): `computeStrikeBudget(levelNumber): number | null`.
  - `lib/blast/v2/engine/outcome.ts` (NEW, pure): `selectResultVariant(...)` → `'mastered'|'partial'|'levelFailed'` + which CTA.
  - `useBlastV2.ts`: add `strikesUsed`, `strikeBudget`; add status `'levelFailed'`; on `rejectConfirmed` increment strike and flip to `levelFailed` when exhausted & not mastered; block play when failed; expose to HUD.
  - Wire `BlastV2PageClient` retry: `levelFailed` → "Try Again" remounts same level (no advance, no clear-level).
- **Phase 2 — Result-page redo:** `BlastResultCard` variants, outcome-scaled animation (gsap-core / impeccable:animate), full i18n ×5, RTL.
- **Phase 3 — Feel polish:** theme/bonus emphasis, cascade telegraph, almost-word nudge, strike pips, instant result.

## Out of scope (explicit)
- No cross-level lives/energy economy (per-level strikes only).
- No move/timer pressure mechanic beyond strikes.
- No generator/solver rewrite, no new special-tile types, no chest-economy redesign.
- No changes to MP/legacy blast (`components/blast/legacy/`).
- Server anti-cheat: strikes are client-tracked; loss has no coin reward so no new cheat surface. (Optional future: validate `strikesUsed` server-side.)

## Provably-fair note (for reviewers)
`all-levels-solvable.test.ts` guarantees every shipped level is masterable via a theme-only submission sequence of length `words.length`. A theme-only player makes **0 strikes**, so `levelFailed` is unreachable by correct play at any budget ≥ 1. The loss is therefore *self-inflicted by wrong guessing*, never by board RNG.
