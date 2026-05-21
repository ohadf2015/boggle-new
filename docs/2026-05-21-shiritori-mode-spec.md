# Shiritori (しりとり) — Japanese-native Multiplayer Mode Spec

**Date:** 2026-05-21
**Status:** Spec + Phase 1 (chain engine) in progress. Later phases scoped below.
**Why:** The JA gameplay audit (`docs/2026-05-21-japanese-multiplayer-gameplay-audit.md`) found Boggle/wheel modes are a hard sell in Japan and identified **Shiritori** as the single strongest acquisition wedge — it is *the* word game every Japanese speaker knows, phonetic by construction, and naturally multiplayer/turn-based. This is the "target Japanese users" deliverable, not another correctness fix.

---

## 1. The game

Players take turns. Each word must **start with the last kana (mora) of the previous word**. Chain continues until a player can't answer in time, repeats a word, plays an invalid word, or is forced into a word ending in ん (which has no valid successor).

Example chain: `しりとり → りんご → ごりら → らっぱ → ぱん(× ends in ん)`.

This is a **chain** game, fundamentally different from Boggle (grid/path) or WheelRush (anagram). No board. The "content" is the player's vocabulary + recall speed.

---

## 2. Linguistic rules (the hard part — Phase 1)

The chain rule is "next word's head kana == previous word's tail kana," but Japanese orthography makes "head" and "tail" non-trivial. Both are **normalized through the same function**, then compared for equality.

| Case | Rule | Example |
|---|---|---|
| **Long vowel ー** | A trailing `ー` is replaced by the **vowel** of the preceding kana. | `すきー` → tail = い (き's vowel) → next starts い |
| **Small kana ゃゅょ** | A trailing small kana maps to its **large** form. | `きんぎょ` → tail = よ → next starts よ |
| **Sokuon っ** | A word never legally ends in っ; if it does, fall back to the preceding kana. | (defensive only) |
| **Dakuten / handakuten** | Voicing is **kept** (standard rule): `が` matches `が`, not `か`. (A lenient variant exists; we use strict for clarity, configurable later.) | `たまご` → tail = ご → next starts ご |
| **ん ending** | No word starts with ん → the player who plays a ん-ending word **loses the round**. | `みかん` → game over for that player |
| **Head extraction** | First kana, normalized the same way (small→large; a leading ー is invalid). | `ぎゅうにゅう` head = ぎゅ→ぎ? No — head is first *mora*; small kana attaches: ぎゅ → ぎ. See engine. |

**Mora vs kana nuance:** combos like `きゃ`/`しゅ`/`ちょ` are single morae (kana + small y-kana). For shiritori the conventional, forgiving rule used here: compare on the **base large kana** of the relevant mora (head: first base kana; tail: last base kana after ー/small resolution). This is the common casual-play convention and keeps the chain approachable. Exact-mora matching is a future toggle.

Validity also requires: word ∈ hiragana validation dictionary (`japanese_words.txt`, the now-wired hiragana set), length ≥ 2, not previously used this round, answered before the turn timer expires.

---

## 3. Multiplayer structure

- **Turn-based**, 2–8 players in a room (reuse existing room/lobby infra).
- **Turn timer** (default 15s, configurable) — running out = elimination or point penalty (mode variant).
- **Two scoring variants** (pick one for v1):
  - **Survival** (recommended v1): last player standing wins. Simple, party-friendly, matches the cultural game.
  - **Score race**: each valid word scores by length/rarity; fixed round length.
- **Anti-griefing / fairness:**
  - Word must validate server-side (authoritative) — no client trust.
  - Used-word set prevents repeats.
  - ん-ending detection is explicit and surfaced ("〜ん で終了！").
  - Turn timer prevents stalling.
- **Bot fill** (later phase): a bot that, given the required head kana + used set, picks a valid dictionary word — straightforward prefix lookup over the hiragana dict.

---

## 4. Architecture (reuse WheelRush as the template)

WheelRush (`backend/modules/wheelRushManager.ts` + `backend/handlers/wheelRushHandler.ts` + `gameStartHandler.ts` wiring) is the closest existing MP mode (server-authoritative validation, per-room state, socket events). Shiritori mirrors that shape:

- `shared/utils/shiritori.ts` — **Phase 1, this commit.** Pure chain engine: head/tail extraction, normalization, `chains(prev,next)`, `endsInN`. No deps. Importable by backend + frontend + bot.
- `backend/modules/shiritoriManager.ts` — room state machine: turn order, used-word set, timer deadlines, validation (chain + dictionary + dedupe), win/lose resolution. Pure-ish, unit-tested.
- `backend/handlers/shiritoriHandler.ts` — socket glue (`submitShiritoriWord`, turn advance, timeout).
- `gameStartHandler.ts` + `GameMode` union — register `'shiritori'`.
- Client: turn UI, chain history rail, required-head-kana prompt, turn timer, kana input (IME-aware — see audit's deferred IME note; this mode makes IME input first-class).
- i18n: 5 locales; JA copy native-reviewed; the mode is JA-first but playable in any language's syllabary later (English shiritori = last-letter chain; out of scope v1).

---

## 5. Phasing

1. **Chain engine (`shared/utils/shiritori.ts`) — THIS COMMIT.** Pure functions + exhaustive TDD on the linguistic rules. De-risks the hardest part with zero infra.
2. **`shiritoriManager.ts`** — room state machine + validation, unit-tested (mirror `wheelRushManager`).
3. **Socket handler + `GameMode` registration + `gameStartHandler` wiring.**
4. **Client UI** — turn rail, chain history, head-kana prompt, timer, IME-aware input.
5. **Bot** — prefix lookup over hiragana dict.
6. **i18n (5 locales) + native review; analytics events; landing/positioning** (しりとり SEO, per audit §6 targeting).

Each phase is independently shippable and testable. Ghost-traffic caveat still applies: this is a *bet* on JA acquisition — sequence marketing only after the mode is complete and dictionary depth (kuromoji, deferred) lands.

---

## 6. Open questions (reasonable defaults chosen; revisit with playtest)

- Dakuten strict vs lenient (default: **strict** が→が).
- Long-vowel ー → vowel vs preceding-kana (default: **vowel**, the standard rule).
- Survival vs score-race for v1 (default: **survival**).
- Min word length (default: **2**).
- Turn timer (default: **15s**).
