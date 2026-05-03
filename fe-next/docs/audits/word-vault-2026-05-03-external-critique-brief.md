# Word Vault — External Critique Brief (2026-05-03)

> **For LLM reviewers:** This is a self-contained design brief. You have NO codebase access. All facts you need are in this doc. Critique the **game design**, not the code. Focus on **mechanic shape, riddle quality, narrative coherence, and the gap between intent and execution.** Naming note: this mode is internally called **Word Vault** but the user occasionally still calls it "Adventure mode" — it replaced the prior Adventure mode 2026-05-02.

---

## 0. What we want from you

Read the brief. Then answer these four questions in order. Be opinionated. Quantify where possible (e.g., "I'd cut 3 of 6 rooms" not "consider trimming"). Cite scene numbers (1.1–1.6). Write under 1,500 words.

1. **Mechanic critique:** Which of the 6 scenes' mechanics actually feel like an escape room vs feel like a worksheet? Why?
2. **Riddle quality:** Pick the 3 weakest riddles. What's wrong with each (logic gap, cheap difficulty, unsatisfying click, no insight moment)?
3. **Connectedness:** The user wants a connected escape-room world (items carry between rooms, backtracking, decoy inventory, infer-don't-prompt) but current shape is 6 isolated linear scenes. What's the **minimum architectural change** that would deliver that feel without a full rewrite?
4. **Native Hebrew:** Current character names sound like transliterations to native HE speakers. We've proposed `אש` (protag), `גחלת` (boss), `אורי` (brother). Are these better? Worse? What naming patterns work in HE narrative games?

**Anti-scope** (don't waste tokens on these): UI polish, accessibility, performance, testing, code quality, asset production, monetization. Game design only.

---

## 1. Project context

**Game:** LexiClash — Hebrew-first word game. 5 locales (he/en/sv/ja/es), but Hebrew is the design-target audience.

**Word Vault** is one of the modes — a single-player narrative campaign. Pitch: emotional escape-room about a small protagonist (Melo) entering corrupted "halls" to confront 4 cousins who became monsters. Each book = 1 cousin. Currently shipped: Book 1 ("Hearth Halls"), 6 rooms, ~10–15 minutes total play.

**Design pillars** (claimed but not fully delivered):
- **Escape-room feel, not worksheet.** Discover objects in scene → puzzle reveals itself → solve → reward.
- **Hebrew-first.** Real HE letters, real HE riddles, real HE character names.
- **Emotional core.** Each cousin was a person before they were corrupted. Solving = remembering them.
- **RPG-light.** Items found in earlier rooms become tools in later rooms. Some items are decoys.
- **Coherent chaos.** Quirky-electric brand; neo-brutalist UI (lime/pink/cyan/purple, hard pixel shadows).

**What "shipped" means here:** code runs at `/he/word-vault`, all 6 rooms playable end-to-end, RPG inventory works, tests pass. But the *feel* doesn't yet match the pillars — that's the gap this doc asks you to attack.

---

## 2. Architecture (what exists right now)

**Linear scene chain.** Player enters Room 1.1 → solves → Room 1.2 → … → Room 1.6 → end-of-book cinematic. No backtracking. No room selection. Hub screen is a thin wrapper that says "Continue → next unsolved room."

**Per-scene structure:** each room is a React component that renders:
- A static scene background (illustrated environment art)
- 2–5 interactive elements (hotspots, tiles, jars, valves, mementos)
- A persistent HUD on top showing 🪙 coins · 💡 hints · 🎒 items count
- A modal "scene-solved" panel with rewards

**Inventory system:** `permanentItems: ItemId[]` lives in a global Zustand store. Items are awarded on room-solve via the room's `rewards.items` array. A scene can read `hasItem('lantern')` to gate behavior. Persists to localStorage.

**Item perks wired in 2 scenes only:**
- Lantern (from 1.1) auto-reveals first carving in 1.3
- Recipe Book + Family Photo (from earlier rooms) give one-shot hints in 1.6

**Three riddle engines** (the game's mechanical vocabulary):
- `word-constraint` — pool of HE letter tiles, spell target word(s) from min-length up
- `cipher` — scrambled HE word in a labeled jar, drag letters to unscramble
- `logic-sequence` — N labeled steps, drag into correct order

---

## 3. Scene-by-scene catalog

### Room 1.1 — The Cracked Door (`DarkDoorScene`)
**Story:** Melo enters the Hearth Halls. Lantern lights up. A distant roar. Cinder (boss) calls "GO BACK, LITTLE ONE."
**Mechanic:** Drag-trace the HE word `אש` (fire) on a dim 5×5 letter grid. 3 ambient hotspots: diary / lantern / portrait — each shows a one-line story snippet on tap.
**What works:** First contact with a word-tracing gesture; lantern hotspot becomes the inventory item later.
**Concerns:**
- The grid is 5×5 = 25 letters but only 2 are needed (`א`, `ש`). Feels like a tutorial, not a puzzle.
- Hotspots are flavor text only — no mechanical consequence. Player learns "hotspots are decorative" which hurts later rooms where hotspots ARE mechanical.
- Boss "GO BACK" line lands without buildup — first 5 seconds of the game.

### Room 1.2 — The Cipher Pantry (`CipherPantryScene`)
**Story:** A frozen pantry with 4 sealed jars. Each jar contains an abstract concept word (blessing / life / sleep / brothers — `ברכה / חיים / שינה / אחים`). Solve → pantry door opens.
**Mechanic:** 4 jars, each scrambled. Open jar → see hint ("an abstract concept; 4 letters") → drag letter tiles from a shared pool (with decoys mixed in) to spell answer. 3 discovery hotspots: cobweb / floorboard / **broom** — each rewards a "letter shard" (currently UI-only, doesn't feed into a real puzzle).
**What works:** Decoys in the letter pool. Hint-then-solve flow. Hotspots have visual presence.
**Concerns:**
- "Letter shard" rewards from hotspots have no use anywhere. They feel like XP that doesn't level anything.
- Abstract-concept answers are well-themed but the unscramble gesture (drag letters into slots) is mechanically the SAME as Room 1.1's word-trace — it's spell-the-word twice in a row.
- The "broom" is currently a flavor object. The user has asked for it to become a real cross-room tool (broom found in 1.2 → unlocks something in 1.3).
- 4 jars × 4 letters each = ~16 puzzle moments in one scene. Padded.

### Room 1.3 — The Sooted Wall (`SootedWallScene`)
**Story:** Walls covered in soot. Carvings hidden underneath. Wipe to reveal.
**Mechanic:** Drag-wipe gesture (pointer drag accumulates "wipe%" on each carving panel). At >55% wipe, the carving's hint reveals. Then fill the missing HE letter from a shared tile pool. 4 carvings. Lantern (item from 1.1) auto-reveals the first one.
**What works:** Wipe gesture is satisfying — the *only* mechanic in the game that uses real continuous-input. Lantern perk pays off the inventory loop.
**Concerns:**
- After wiping, the puzzle becomes "drag letter into slot" again — a third repeat of the spell-from-pool gesture.
- Wipe threshold is binary (55% reveals, 54% does nothing) — no progressive feedback during the wipe itself.
- 4 carvings is too many; once you wipe one, you've seen the pattern.
- The user has explicitly flagged this room: "the riddle shouldn't appear cold — discover the carving first, THEN the riddle materializes." Currently the slot+pool UI is visible from the moment the wipe starts.

### Room 1.4 — The Cold Stove (`ColdStoveScene`)
**Story:** A stove with 4 unlabeled valves. Find the ignition order.
**Mechanic:** 4 valves, each turns left or right. Player tries an order; on wrong, comic smoke shapes puff from the chimney as feedback ("too much smoke = wrong"). One valve (`זמן` = time) is a red herring — it's broken.
**What works:** First room with a logic-discovery loop instead of a spelling loop. Smoke as humorous wrong-answer feedback. Red-herring valve is a nice escape-room beat.
**Concerns:**
- 4 valves × 2 directions = 16 combinations, but with the red-herring + "ignition order" framing it actually becomes ~6 valid sequences. Brute-force solvable in <90 seconds, which is below the satisfaction threshold for an escape-room reveal.
- No feedback distinguishes "you got 2 of 4 right" from "you got 0 of 4 right" — the smoke just says "wrong, try again." No partial-progress signal.
- Why is a `זמן` valve in a kitchen? The thematic stretch is visible.

### Room 1.5 — Cael's Old Kitchen (`OldKitchenScene`)
**Story:** A pristine kitchen frozen in time before the corruption. Family photo of all 5 cousins. Melo sheds a tear. The signature dish's ingredient ORDER is revealed environmentally.
**Mechanic:** 5 mementos. Tap each → a memory voice line appears with one word highlighted. Tap the highlighted word → it goes into your "memory bank." After 5 memories, the dish ingredient order unlocks for use in 1.6.
**What works:** Tonally the strongest room. No timer, no fail state. The "tap-the-highlighted-word" interaction is delicate.
**Concerns:**
- Marked `isStoryOnly: true` in the data — there's no real puzzle here, it's a forced-march cinematic with 5 click-to-progress beats.
- "Memory bank" doesn't actually exist as a UI feature visible to the player — the order is just stored in state and applied automatically in 1.6. Player isn't told the connection. They reach 1.6 and the ingredient order "happens to be revealed" — feels like coincidence not earned reward.
- 5 mementos is the ceiling of "still feels like exploration"; one more and it'd be a chore.

### Room 1.6 — The Last Recipe (`LastRecipeScene`)
**Story:** Final room. Spell 3 ingredients (`מים / קמח / דבש` = water / flour / honey) in correct order from an HE letter pool. On the third correct word, Cinder transforms back into Cael (the brother), weeps, hugs Melo, vanishes.
**Mechanic:** Word-constraint puzzle with 8 letter tiles in a shared pool. Spell ingredient 1, then 2, then 3. Recipe Book item (from 1.4) gives one hint. Family Photo (from 1.5) gives a "first letter of next ingredient" hint.
**What works:** Emotional payoff is real. Item perks finally land. Letter-song cinematic on solve.
**Concerns:**
- This is the game's THIRD spell-from-pool puzzle (after 1.1 and 1.2). The mechanical climax = the same gesture as the tutorial.
- "Order matters" is a weak twist — it adds memory load without adding insight.
- No moment where the player feels they outsmarted the boss; they just spelled three words.

---

## 4. RPG layer (current state)

**6 ItemIds defined**, awarded one per room:
| Room | Item | Stated effect | Actually wired? |
|---|---|---|---|
| 1.1 | Melo's Lantern | "Reveals first carving on a wall" | ✅ in 1.3 |
| 1.2 | Defrost Candle | "Wipes soot faster" | ❌ never read |
| 1.3 | Brass Key | "Fixes the broken time-valve" | ❌ never read (1.4 doesn't check) |
| 1.4 | Cael's Recipe Book | "Shows recipe order once" | ✅ in 1.6 |
| 1.5 | Family Photo | "Reveals first letter of next ingredient" | ✅ in 1.6 |
| 1.6 | Cinder Charm | "+1 coin from fire-themed riddles" | ❌ no later rooms exist yet |

**4 of 6 items are non-functional.** The HUD says "🎒 6" at end of book but only 2 of those 6 actually did anything. This is the user's "decoy inventory" complaint inverted: items that LOOK useful but never trigger.

**No backtrack capability.** Once you leave a room, you cannot return. So even if Brass Key existed in your inventory, there's no way to re-enter 1.4 to use it on the broken valve.

---

## 5. Hebrew language concerns

**Character names:**
| Role | Current | Why it's flagged | Proposed |
|---|---|---|---|
| Protagonist | מלו (Melo) | Reads as English transliteration; not a HE word | אש (Esh = "fire") — also fits Word Vault as the first 2-letter HE word in 1.1 |
| Book 1 boss | סינדר (Sinder) | Direct transliteration of "Cinder" | גחלת (Gachelet = "ember") |
| Book 2 boss | פרוסט-מיוט (Frost-Mute) | English-English compound | דממה (Demama = "silence") or כפור (Kfor = "frost") |
| Book 3 boss | הנשכח (HaNishkach) | Already HE, OK | keep |
| Book 4 boss | צופן (Tzofen = "code") | Already HE, OK | keep |
| Brother | קאל (Cael) | Reads as English name, not HE | אורי (Uri = "my light") or just האח ("the brother") |

**Riddle text quality:** All HE strings in the game are AI-drafted. No native-speaker review pass has happened. Some lines flag as "off" but no specific catalog has been built. If you (the critic) speak HE, please flag any of the riddle hints / story beats above that read awkwardly.

**RTL:** Game is RTL-rendered when locale=he. This is technically working but means any English LLM critic should mentally flip directional words ("first" jar = rightmost, etc.).

---

## 6. The redesign options on the table

The user gave 5 paths last session. They picked **B-proto** but want this critique before any further code lands.

| Option | What | Effort |
|---|---|---|
| **A — Polish linear** | Keep 6 linear scenes. Add hotspots that DO something, rename characters HE-native, fix the 4 dead items. | 1–2 hr |
| **B-proto** ★ user picked | Wire 1 room pair (1.2 broom → 1.3 carving) for cross-room item flow + decoy inventory + revisit button. Validate connected-world feel before committing further. | 3–4 hr |
| **B-full** | Rewrite to graph-router. Hub becomes a navigable map. All items mechanically gate cross-room. | 1 day |
| **C — Metroidvania** | Multi-step inter-room puzzles, item-inspect mode, secret passages. | 2–3 days |
| **names-only** | Just rename characters, defer architecture. | 30 min |

User's comment that triggered the redesign:
> "Riddles shouldn't appear cold — player should DISCOVER an interactive object first, then the riddle materializes. Inventory needs decoys. Player must INFER what to do like real escape rooms — no on-screen 'click X to solve Y' prompts. Inter-room movement. Items carry across rooms as puzzle keys. Native-HE character names."

---

## 7. Specific questions where opinion divides

These are points where the team is split and external opinion would unblock:

1. **Is 6 rooms too many?** Each is ~90–120s of play. Total ~10 min. Some scenes (1.5 story-only, 1.6 final) could absorb the puzzles of trimmed rooms. Would 4 deeper rooms beat 6 shallow rooms?

2. **Does the spell-from-pool gesture appearing in 3 of 6 rooms hurt the game?** Or is mechanical repetition the right call for a 10-min experience (player only just learned it)?

3. **Decoys: how aggressive?** User wants decoys in inventory. Should ~30% of items found be useless? 50%? Or only 1–2 per book to preserve trust in the inventory?

4. **Story-only room (1.5):** keep, cut, or convert to a real puzzle that earns the family-photo item?

5. **Boss reveal in 1.6:** is "spell three ingredients in order" earning the emotional beat? Or does the puzzle undercut the moment?

6. **Cross-room flow scope:** if we go B-proto first, is 1.2→1.3 the right pair? Or would 1.4 (broken time-valve) → 1.3 (brass-key reward) be a more dramatic loop — except the player already has Brass Key when they enter 1.4, breaking the "find tool, then come back" arc.

---

## 8. Format for your response

Write your critique in this shape:

```
### Verdict (one sentence, brutal)

### Strongest scene + why
### Weakest scene + why

### Riddle quality — top 3 problems

### Connectedness — minimum viable change

### Hebrew naming — your call

### What I'd ship next (ordered list, ≤5 items)
```

Don't soften. The user gets more value from a sharp critique they can disagree with than from balanced feedback they can't act on.
