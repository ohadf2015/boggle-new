# Word Vault — External Critique Brief — Round 4 (2026-05-03)

> **For LLM reviewers:** Round 3 was 1.5 hours ago. Scope F (visual-feedback polish) shipped immediately after. Scope G shipped just now and addresses the 3 deferred round-3 asks: Room 1.5 puzzle redesign, mid-book אורי foreshadowing, unified verb taxonomy. **This is round 4 — judge whether the architectural fixes landed AND whether the game is now coherent enough to start Book 2.** Hard scope: don't re-litigate fixed mechanics. Naming: this mode is "Word Vault." Game is **Hebrew-first**, RTL.

---

## 0. What we want from you

Read §1 (round-3 response table) so you don't re-critique fixed items. Then complete the 3 G-item scorecard in §5 + answer the 4 holistic questions. ≤1,200 words.

The critical question this round: **is Word Vault Book 1 ship-ready?** If yes, Book 2 design starts next. If no, what's the single biggest blocker?

---

## 1. Round-3 response table

| # | Round-3 ask | What we shipped | Worth a fresh critique? |
|---|---|---|---|
| **R3-G1** | "1.5 is the weakest piece — needs a real verb" (3 of 4 critics) | **Full rewrite.** 5 mementos scattered in the kitchen scene; tap each → reveals a memory voice line + spawns a photo fragment in the drawer. Tap a fragment → moves to its slot in the family-photo frame (TL/TR/BL/BR/center cross layout). All 5 composed → family-photo award + onSolved. Verb taxonomy: REVEAL + COMPOSE (matches 1.3 pattern). | YES — does it now feel like a real puzzle, or a different worksheet? |
| **R3-G2** | "Spelling seal feels stapled — אורי appears nowhere earlier" (critics B+C) | **Foreshadowing in 1.5.** When the player composes the center photo fragment, a handwritten "אורי" caption renders below the assembled photo for 3s, with whisper "בכתב ידו. אורי." The brother's name now lands visually in 1.5 before the 1.6 seal. | YES — does this make the 1.6 seal feel earned, or is one foreshadow not enough? |
| **R3-G3** | "Unify interaction grammar: pick 3 verbs, reuse aggressively" (critic A) | **Verb-taxonomy JSDoc headers added to all 6 scenes.** No behavioral refactor — design-doc-as-code. Each scene declares PRIMARY + SECONDARY verb from `{REVEAL, SEQUENCE, COMPOSE}`. Future Book 2 scenes inherit the contract. | YES — is documentation enough, or is this just papering over without real consolidation? |

## Scope F (round-3 polish) also shipped — capsule recap

| Mechanic | Round-3 score avg | Shipped fix |
|---|---|---|
| Brass-key auto-snap (2.75) | Worst score → fixed | + 1.2s golden shimmer on gas valve |
| Revisit banner (2.0) | Worst score → fixed | + persistent post-solve env (1.4 stove warmth, 1.6 altar ember) |
| Broom bark (3.0) | Too didactic → fixed | Whisper REPLACED with 1.5s sparkle burst |
| Spelling seal (3.5) | Felt 8 micro-puzzles → fixed | Pool 6→4 letters; intermediate whisper dropped |
| Canonical bonus VO (4.0) | Arbitrary → fixed | Replaced with 1.5x ember density + brighter tint |
| Affordance glow (4.5) | Already strong → polished | Ready=pulsing animated, solved=steady cool gold |
| Lantern reveal (3.75) | Softlock risk → fixed | 8s idle hint = soft ember pulse near lantern |

---

## 2. Current room verb-taxonomy map

```
1.1 The Cracked Door  REVEAL   + COMPOSE   (find lantern → tap א ש in order)
1.2 The Cipher Pantry  COMPOSE  + REVEAL   (unscramble jars + 3 hotspots)
1.3 The Sooted Wall    REVEAL   + COMPOSE  (wipe soot + fill missing letter)
1.4 The Cold Stove     SEQUENCE + REVEAL   (valve order + time-valve red herring)
1.5 Uri's Old Kitchen  REVEAL   + COMPOSE  (mementos + photo fragments)
1.6 The Last Recipe    SEQUENCE + COMPOSE  (place items + spell אורי seal)
```

**Pattern:** Every room uses 2 verbs from the 3-verb set. No room introduces a new tutorial — each is a remix.

---

## 3. New mechanics worth judging

### 3.1 Room 1.5 — Family Photo Composer

**Old:** 5 mementos with memory voice lines + tap-the-highlighted-word interaction. Family-photo item awarded passively (`isStoryOnly: true`).

**New:** 5 mementos scattered over the kitchen scene (kettle, apron, spice shelf, recipe sheet, family photo). Each tap:
- Fires the memento's HE memory voice line ("הקומקום שלו. תה בוקר. בכל בוקר.")
- Reveals the corresponding photo fragment (corner-tl, corner-tr, corner-bl, corner-br, or center)

Bottom of the scene shows a 3×2 cross-layout photo frame (TL TR center BL [empty] BR). Plus a drawer of revealed-but-not-composed fragments. Tap a fragment chip → moves it into its frame slot.

When all 5 fragments composed → "Continue" CTA. Tap → triggers the special G2 foreshadowing if center was composed last → onSolved → family-photo awarded by RoomShell.

**Foreshadowing detail:** The center fragment is the family photo. When it's composed, "אורי" (handwritten signature) appears below the assembled photo for ~3s with whisper "בכתב ידו. אורי."

**Open questions:**
- Does fragment-assembly feel like a real puzzle? Or is "tap-then-tap-again" still too shallow?
- The mementos are scattered with `position: absolute` — is the discovery layer legible on smaller screens?
- The center fragment has the foreshadowing payoff. If a player composes center FIRST instead of LAST, does that break the dramatic reveal?

### 3.2 Mid-book Uri foreshadowing

**Where it lands:** 1.5 center fragment. The player is told "behind the photo — a signature" via the memento line, then sees "אורי" handwritten when the photo is assembled.

**Where it does NOT land:** anywhere else in the book. Critics suggested ghost-outlines on the 1.6 altar that the seal letters snap into. We did NOT implement that — would require redesigning the spelling-seal UI.

**Open question:** is one foreshadowing moment enough? Or does the seal still feel sudden?

### 3.3 Verb-taxonomy headers

**What landed:** JSDoc block at top of each scene file declaring its primary + secondary verb. Example:

```ts
/**
 * Room 1.3 — The Sooted Wall
 *
 * Verb taxonomy:
 *   PRIMARY:   REVEAL  (drag-wipe soot to expose carved word fragments)
 *   SECONDARY: COMPOSE (after wipe past per-carving threshold, fill the
 *                       missing letter from the shared pool)
 *
 * Cross-room item perks: melo-lantern auto-reveals first carving;
 * defrost-candle lowers wipe threshold globally (0.55→0.40); broom
 * lowers it deeply on the honey-carving (0.55→0.25) + visual sparkle.
 */
```

**What did NOT land:** shared interaction primitives (e.g., `useReveal()` hook, `useSequence()` helper). The verbs are documented, not abstracted. Each scene still implements its own state machines.

**Open question:** is documentation enough for unification, or does the lack of shared primitives mean Book 2 scenes will drift into new bespoke patterns?

---

## 4. Architectural state for Book 2

If Book 1 is ship-ready, Book 2 (boss = "Frost-Mute" or whatever rename — see synthesis) starts. The contract Book 2 inherits:

- **6 rooms**, each implementing 2 verbs from `{REVEAL, SEQUENCE, COMPOSE}`
- **Cross-room item perks** = silent perks with optional one-shot visual feedback (broom sparkle, brass-key shimmer)
- **Discovery-first UI** = puzzle slots/pools hidden until player has interacted with the scene
- **Climax pattern** = ritual altar with set-based completion + canonical-order bonus + final word seal
- **Hub revisit** = banner + persistent post-solve environmental delta in at least 2 rooms

Open question: does this contract hold up for a non-fire theme (Book 2 = ice/frost)?

---

## 5. Per-mechanic scorecard

For each G-item, give a 1-5 score AND one specific tweak:

| # | Mechanic | Score (1-5) | Specific tweak |
|---|---|---|---|
| G1 | Room 1.5 fragment-assembly puzzle | _ | _ |
| G2 | Uri foreshadowing on 1.5 center fragment | _ | _ |
| G3 | Verb-taxonomy JSDoc headers (no behavioral refactor) | _ | _ |

---

## 6. Four holistic questions

1. **Is Word Vault Book 1 ship-ready?** Yes / No. If No, name the single biggest blocker.

2. **Did "one game vs seven mechanics" resolve?** Round 3: critics 3/4 said "seven mechanics in trench coat." After Scope G's verb-taxonomy doc + 1.5 fitting the REVEAL+COMPOSE pattern, has it cohered into one game?

3. **Did the "Word" actually land?** Round 3: critics said "spelling seal in 1.6 was the only real word moment, felt stapled." After G2 foreshadowing in 1.5, plus the seal collapsed to exact 4 letters (Scope F), is the "Word" identity sufficient — or does Book 1 still feel like a discovery game with a word puzzle bolted on?

4. **What's the FIRST thing you'd cut from Book 2's design contract?** If the answer is "nothing, ship as-is," then Book 1 graduates from prototype to template.

---

## 7. Format for your response

```
### Verdict (one sentence, brutal)

### Per-G-item scores
G1 (1.5 fragment puzzle):    X/5 — <tweak>
G2 (Uri foreshadowing):       X/5 — <tweak>
G3 (verb-taxonomy headers):   X/5 — <tweak>

### Holistic questions
- Book 1 ship-ready? Yes/No + biggest blocker if no:
- One game or seven mechanics now?
- Did the "Word" land?
- First thing to cut from the Book 2 contract:

### What I'd ship next OR Book 2 design priority (≤3 items, ordered)
```

Be opinionated. Quantify where possible. If you say "ship as-is," commit.
