# Word Vault — Book 2 Design Doc (2026-05-03)

> Status: Initial sketch. Inherits Book 1's contract verbatim; remixes for an ice/frost theme. Round-4 critics 3/4 said Book 1 is ship-ready and the contract templates Book 2. This doc applies that template.

---

## Working title + cousin name

**Book 2 — The Frozen Larder.** Cousin (formerly "Frost-Mute"): native-HE rename pending player feedback. Three candidates:

| Candidate | Meaning | Strength | Risk |
|---|---|---|---|
| **דממה** (Demama) | "silence" | Lands the "mute" half of the original concept; resonates with absence/loss | Slightly abstract; not a person-name |
| **כפור** (Kfor) | "frost" | Concrete, sensory; pairs aesthetically with אש (fire) ↔ כפור (frost) as Book 1 ↔ Book 2 mirror | Loses the "muteness" theme entirely |
| **דוממת** (Domemet) | "the silent one" (feminine) | Carries both silence + identity as a corrupted family member | Made-up word; less natural |

**Decision: כפור (Kfor) — locked 2026-05-03.** Book 1 = אש vs גחלת (fire vs ember); Book 2 = אש vs כפור (fire vs frost) reads as a clean mirror. The "muteness" theme will come through environmental design (frozen voices, no echoes, glass-like silence) rather than the name.

Brother memory thread: cousin in Book 2 is a different character from Book 1's אורי. Naming proposal: **רוני** (Roni — common Israeli name + means "my joy" — ironic given the corruption). **OPEN — not yet locked. User will pick at next-session opening.**

---

## Theme + sensory palette

**Book 1 (Hearth Halls):** fire, soot, ember, hearth. Warm orange/amber. Discovery via wiping AWAY soot.

**Book 2 (Frozen Larder):** frost, glass, breath, silence. Cool cyan/white. Discovery via THAWING frost. The "mute" beat: the world has no echoes — voices land flat, footsteps don't carry.

| Book 1 | Book 2 | Translation |
|---|---|---|
| Soot covers | Frost coats | Obscuring layer changes texture, not concept |
| Wipe to reveal | Breathe/warm to thaw | Same REVEAL verb, different gesture |
| Fire valves | Frost-locks | Same SEQUENCE verb, "ignition order" → "thaw order" |
| Spell `אורי` | Spell `רוני` (or whatever brother name) | Same COMPOSE verb, new word |
| Hearth / kitchen | Larder / cellar | Cousin's domain shifts from cooking to preserving |
| Ember overlay | Frost-particle overlay | Same Pixi pattern, different tint (cyan instead of orange) |

---

## Inherited contract (Book 1's template)

Locked from Book 1, applies to Book 2 verbatim:

1. **6 rooms.** Same chapter shape: tutorial, mid-discovery, mechanic-deep, climax-prep, story-quiet, ritual-climax.
2. **2 verbs per room** from `{REVEAL, SEQUENCE, COMPOSE}` — declared in JSDoc header at top of scene file. No room introduces a fourth verb.
3. **Cross-room item perks** = silent perks with optional one-shot visual feedback. Must use the existing `useReveal` / `useSequence` / `useCompose` primitives — no bespoke state machines.
4. **Discovery-first UI** = puzzle slots/pools hidden until the player has interacted with the scene. The scene IS the interface.
5. **Climax pattern** = ritual altar with set-based completion + canonical-order bonus + final word seal (4 letters, exact pool).
6. **Hub revisit** = banner + persistent post-solve environmental delta in at least 2 rooms.

---

## 6-room sketch (verb mapping)

| # | Room | HE name | Verbs | Mechanic |
|---|---|---|---|---|
| 2.1 | The Frozen Door | הדלת הקפואה | REVEAL + COMPOSE | Door is iced over. Player breathes (hold to fog) onto it; specific spots thaw to reveal 2 letters. Tap them in order to spell `אש` (callback to Book 1 — "you are still fire"). Validates the protag's identity in the new world. |
| 2.2 | The Vacuum Pantry | המזווה הריק | COMPOSE + REVEAL | Jars contain nothing — labels list contents but jars are empty. Compose the right LABEL (re-spell the missing word from a letter pool) for each jar. Hotspots include a frozen broom and a thaw-candle (cross-room item items, mirroring Book 1's hidden-broom). |
| 2.3 | The Glass Wall | קיר הזכוכית | REVEAL + COMPOSE | Wall is frozen mirror. Breathing thaws sections — each section reveals a Hebrew word fragment. Fill missing letters from pool. Cross-room: defrost-candle (Book 1) + thaw-candle (Book 2) stack to widen thaw radius. |
| 2.4 | The Ice Lock | מנעול הקרח | SEQUENCE + REVEAL | A 4-step ice-lock (pins must thaw in correct order). Wrong order = lock refreezes (wipe progress on later pins, keep earlier). Brass-key from Book 1 carries over: holders auto-snap the first pin (recursive callback). |
| 2.5 | רוני's Old Cellar | המרתף של רוני | REVEAL + COMPOSE | Story-quiet room (parallels 1.5). Mementos = preserved jars containing memories. Thaw each (reveal) → fragments of a letter-from-Roni-to-Esh. Compose the 5 fragments into a single page. The page contains רוני's signature — foreshadowing the seal. |
| 2.6 | The First Thaw | ההפשרה הראשונה | SEQUENCE + COMPOSE | Climax altar. Place 4 ritual items (thaw-candle / brass-key / Roni's letter / a recipe-from-Book-1 — yes, items LITERALLY carry forward across books). Then spell `רוני` from a 4-letter pool (ר-ו-נ-י). On completion: כפור crystallizes for one breath, becomes רוני, hugs Esh, melts into water. |

---

## Items inherited + new

**Carried from Book 1 (player keeps them across books):**
- `melo-lantern` — still auto-reveals first carving in any REVEAL room
- `defrost-candle` — global wipe-rate buff (now stacks with `thaw-candle` in Book 2)
- `brass-key` — auto-snaps first step in any SEQUENCE room
- `cael-recipe-book` (now: `uri-recipe-book`) — required for ritual altar in any book
- `family-photo` — required for ritual altar in any book
- `cinder-charm` — cosmetic HUD glow (Book 2: pulses cyan when near frozen hotspots = SOFT mechanical hint)
- `broom` — bonus exploration item; still speeds 1.3-style soot wipes (no Book 2 effect)

**New in Book 2:**
- `thaw-candle` (Book 2 reward of 2.2) — companion to defrost-candle; doubles thaw-rate when both are held
- `frost-key` (Book 2 reward of 2.3) — Book 3 dependency
- `glass-page` (Book 2 reward of 2.4 — hand-written letter from Roni)
- `roni-photo` (Book 2 reward of 2.5)
- `frost-charm` (Book 2 climax reward)

**Decoy items in Book 2 ritual:** broom + defrost-candle (Book 1 items that don't fit Book 2's cold theme).

---

## Per-room "word moments" (round-4 critic D's recommendation)

Critic D: "By the time players hit the Book-2 seal, 'the Word' has been a living mechanic, not just an endpoint." Each room gets a small linguistic decision:

- 2.1: spell `אש` (2 letters) — opening callback
- 2.2: spell jar labels (3-4 letters each, 4 jars; 1 is a decoy concept like 1.2)
- 2.3: fill missing letter in 4 carved fragments (matches 1.3 pattern)
- 2.4: choose between 2 valid `אורי`-related words to label each pin (e.g., אור/אורח/אוריון) — picks the one that fits theme
- 2.5: compose Roni's letter — 5 word fragments → 1 page
- 2.6: spell `רוני` (4 letters)

Total word touches: ~20 across the book vs Book 1's ~12. Book 2 leans harder into language as ASKED by round-4 critics.

---

## Architectural plan

**Hooks already extracted (Round 4):**
- `lib/word-vault/hooks/useReveal.ts` ✓
- `lib/word-vault/hooks/useSequence.ts` ✓
- `lib/word-vault/hooks/useCompose.ts` ✓

**New hooks needed (Book 2 only):**
- `useThaw(targetIds, perks)` — could be a thin wrapper over `useReveal` with a different "wipe rate" semantic (breath-hold cumulative time instead of pointer-distance). Decision deferred to scene 2.1 prototype.

**State extension:**
- `gameStore.ts` adds book2-specific items to `ItemId` union when work starts
- `book2-larder-stub.ts` (sibling of book1-hearth-stub.ts) declares 6 rooms + items + cousin
- `RoomShell.tsx` extended to discriminate on book2 room ids OR refactored to take a generic ROOM_TABLE

**Cross-book persistence:**
- Player items from Book 1 stay in `permanentItems` — Book 2 scenes read via the same `getGameStore()` pattern
- Solved-rooms list grows; revisit can cross book boundaries (player can revisit a Book 1 room while in Book 2)

---

## Risks + open questions

1. **Cross-book item bloat.** By Book 4, `permanentItems` could hold 25+ items. Decoy ratio creep. Consider an "archive" UX in HUD that hides Book-1 items by default in Book-2+ rooms.
2. **Asset production.** Each room needs 1 BG image + 3-5 hotspot glyphs. Book 1 used `mcp-image` for 4 BGs; Book 2 needs 5-6 new ones. ~$50 / 1 day budget.
3. **HE quality.** All scene strings will need native-review. Pattern is now established (mark "AI-drafted, native review pending" in commit messages).
4. **Verb-3 absorption rate.** If Book 2 rooms drift toward COMPOSE-heavy (per critic D's word-moments push), the SEQUENCE verb may feel under-used. Watch ratio across all 6 rooms during prototyping.
5. **Frost-Mute name.** **DECIDED — locked to `כפור` 2026-05-03.** Book 2 implementation can proceed with this name. Brother name (`רוני` proposed) still open.

---

## Recommended next-session opening

1. ~~Confirm cousin name~~ — **DONE: locked to `כפור` 2026-05-03.**
2. Confirm brother name (`רוני` or alternate) — still open
3. Prototype scene 2.1 (Frozen Door) using the existing `useReveal` hook — proves the abstraction transfers across themes
4. If 2.1 lands clean → continue with 2.2/2.3 in next session(s)
5. Cross-book item bloat decision before 2.6

The contract is locked. The asset production is the real Book 2 cost. Code-side risk is low because all 3 verbs have proven primitives.
