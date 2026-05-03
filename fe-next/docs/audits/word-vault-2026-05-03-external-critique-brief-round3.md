# Word Vault — External Critique Brief — Round 3 (2026-05-03)

> **For LLM reviewers:** Round 2 was 2 hours ago. We took your feedback and shipped a "Scope E" pass — 7 distinct mechanic changes addressing the 4 unanimous round-2 asks plus the cross-room teaching inconsistency you flagged. This doc is the post-change state. **Score each new mechanic 1-5 + answer 3 holistic questions.** Hard scope: don't re-litigate the 5×5-grid removal, the 1.1 redesign direction, or naming. Naming: this mode is "Word Vault." Game is **Hebrew-first**, RTL.

---

## 0. What we want from you

Read §1 (round-2 response table) so you don't re-critique fixed items. Then complete the per-mechanic scorecard in §6 + answer the 3 holistic questions. ≤1,500 words. Be specific about *what* you'd change, not just *what's wrong*.

---

## 1. Round-2 response table

| # | Round-2 ask (4/4 unanimous) | What we shipped in Scope E | Worth a fresh critique? |
|---|---|---|---|
| **R2-U1** | "Brass-key whisper too generous — needs nerf" | **Brass-key now silently auto-snaps the FIRST valve (gas) to its correct position on mount.** Player still must figure out air → fire (2 combinations). The "GAZ AVIR ESH" whisper is GONE. Time-valve still shows the cryptic "זמן לא אופים" line for everyone (regardless of key). | YES — does silent auto-snap deliver the right amount of help? |
| **R2-U2** | "Room 1.1 must be reworked" | **Full rewrite.** 5×5 grid drag-trace dropped entirely. New flow: scene starts in near-darkness; player finds + taps lantern hotspot; lantern lights → boss roar fires 600ms later; 2 letter glyphs (א, ש) become visible carved INTO the door; player taps them in correct order to spell `אש`. Door opens → solved. ~730 lines (was 889). | YES — first-impression matters most |
| **R2-U3** | "Restore active-spelling moment — Word Vault lost the 'Word'" | **Added spelling seal to 1.6 climax.** After all 4 ritual items placed, a 6-letter HE pool appears and player must spell `אורי` (the brother's name) in correct letter order. ONLY THEN does Gachelet → Uri transformation fire. | YES — does the seal feel earned, or tacked-on? |
| **R2-U4** | "Broom cross-room flow needs visibility" | **Added one-time broom bark.** First time player taps the honey carving while holding the broom, a whisper fires: "המטאטא שלך מנגב את העובי הזה." Plus the affordance-glow change (R2-M2) gives the wiped-but-untapped state a visible cue. | YES — is the bark too on-the-nose now, or just right? |

## Scope E also shipped (round-2 majority/emergent items)

| # | Round-2 ask | What we shipped |
|---|---|---|
| **R2-M1** | "Ritual order is too narrative/arbitrary" | **Ritual now any-order completion.** Player can place the 4 items in any sequence. If they happen to use the canonical order (lantern → key → photo → recipe-book = light → opens → memory → truth), a bonus VO whisper fires after the spelling seal: "אש זכרה את הסדר של אורי." Otherwise just the standard transformation. |
| **R2-M2** | "Discovery-first 1.3 needs an affordance signal" | **Affordance glow + pulse on carving panels** when wipe ≥ effective threshold AND not yet filled AND not currently active. Brighter border + outer glow + ember-pulse animation. Latent bug also fixed: hint visibility now uses per-carving threshold (was always 0.55). |
| **R2-M3** | "Revisit needs content delta" | **Per-room revisit banner.** When player re-enters a solved room from the hub, a small "↻ <delta line>" chip fades in at top-center for ~5 seconds. Lines: `1.1 הדלת נשארה פתוחה` | `1.2 הצנצנות עוד שם. הקור פחות` | `1.3 הסימנים שלו זוהרים פחות עכשיו` | `1.4 התנור עוד דולק` | `1.5 המטבח התקרר` | `1.6 המזבח נשאר ריק. הוא הלך`. |
| **R2-Emergent** | "Cross-room teaching is incoherent — broom = inference, key = answer-reveal" | **Resolved by R2-U1.** Brass-key now matches broom's pattern: silent perk, no announcement, observe-the-difference. Both items teach the same lesson. |

---

## 2. Architecture (current state)

**Linear scene chain** for first-pass: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → end-of-book cinematic.

**Revisit flow:** worldmap from hub → tap solved room → enter scene with banner → re-solve → return to hub.

**Inventory: 7 items, all 6 wired** (cinder-charm = HUD glow cosmetic only; will be mechanical in Book 2).

**Scope E delta inventory of mechanics:** 7 distinct changes (see §6 scorecard).

---

## 3. Scene-by-scene delta (changed scenes only)

### Room 1.1 — The Cracked Door (FULL REWRITE)

**Old mechanic:** 5×5 grid of HE letter tiles; drag-trace `ש`→`א` to spell אש backward.

**New mechanic (Scope E):**
1. Scene loads dark — door visible as silhouette, brightness ~0.32. 3 hotspots barely visible.
2. Player explores hotspots: diary + portrait give whisper-only flavor lines (lore). Lantern hotspot is the IGNITION trigger.
3. Tap lantern → scene brightens to 0.85, ember overlay densifies, parallax reveals the door's surface. After 600ms, boss roar whisper fires: "חזרי, קטנטונת!"
4. 2 letter glyphs (א at 0.32×0.45, ש at 0.62×0.55) become visible — golden, glowing, tappable, carved INTO the door's cracks.
5. Player taps א first, then ש. Wrong order = shake + whisper "לא בסדר הזה. תאיתי קודם את האות הראשונה."
6. Both correct → burst animation → door opens → onSolved() after 2s.

**Open question:** does this set up the rest of the book correctly (lantern as primary tool, scene IS the interface, discovery-first), or does it overcorrect into "tutorial that's too quiet"? Specifically: if a new player can't find the lantern hotspot in the dark, are they stuck?

### Room 1.3 — The Sooted Wall (UI POLISH)

Two changes:
1. **Affordance glow:** when a carving is wiped past its (per-carving) threshold AND not yet filled AND not currently active, the carving panel gets brighter border (`rgba(255,200,120,0.85)`), outer glow (`0 0 18px rgba(255,180,80,0.55)`), and the ember-pulse animation.
2. **Broom bark:** first time honey-carving becomes active for a broom-holder, fires whisper "המטאטא שלך מנגב את העובי הזה."

**Open question:** does the affordance glow read as "tap me" or as "this is solved"? Is the broom bark too didactic (round-1 critic B said "let player feel clever once in their life")?

### Room 1.4 — The Cold Stove (MECHANIC SWAP)

**Old:** brass-key whisper revealed full sequence on time-valve tap.

**New:**
- On mount: if player has brass-key, sequence pre-populates with `['gas']` (the first valve in CORRECT_ORDER). Visually, the gas valve is in `revealed` state from the start — player sees the sequence display showing "גז" as if they already turned it.
- Time-valve handler: same cryptic whisper for everyone (no key branch). It's still a red herring.
- New `sequence.includes(id)` guard: re-tapping a valve already in the current attempt is a no-op with whisper "כבר סובב."

**Open question:** is silent auto-snap legible enough? A player might not realize the brass-key did it — they just see the puzzle started one step in. Does that read as "I'm being helped" or "did I miss a step"?

### Room 1.6 — The Last Recipe (FULL CLIMAX REWORK)

**Pre-Scope-E (post-Scope-B):** ordered ritual altar; player taps inventory items in fixed order (lantern → key → photo → recipe-book). Wrong order or decoy → shake + decoy line.

**Post-Scope-E:** 3 phases.
1. **`placing` phase:** player taps inventory items in ANY order. Decoy items (defrost-candle, broom, cinder-charm) shake + per-item line. Already-placed items get "כבר על המזבח." When 4 ritual items placed → whisper "כתבי את שמו." → phase advances.
2. **`spelling` phase (NEW):** 4 placeholder slots show empty. Below them, a 6-letter HE pool: `[א, ו, ר, י, ת, ה]`. Player must tap `א`→`ו`→`ר`→`י` in order. Wrong letter = shake + "לא האות הזאת." Correct letter fills next slot.
3. **`transforming` phase:** if items were placed in canonical order, fire bonus VO "אש זכרה את הסדר של אורי." Then standard Cinder/Gachelet → Uri transformation cinematic. After 2.2s → done. After another 0.8s → onSolved().

**Open questions:**
1. Is the spelling seal a satisfying restoration of the "Word" identity, or does it now feel like 8 micro-puzzles (4 items + 4 letters) crammed into one room?
2. Does the "any-order with canonical-bonus VO" deliver player agency, or just punish/reward arbitrarily?
3. Decoy ratio: completionists have 2 decoys (broom + defrost-candle) in inventory. Players who skipped broom hotspot have 1 decoy. Players who somehow have cinder-charm at this point would have 3 decoys (impossible since cinder-charm is the 1.6 reward, but defensive code).

### Hub revisit banner (NEW)

When player re-enters a solved room from worldmap, a fixed-position chip fades in at top-center: `↻ <REVISIT_LINES[roomId]>`. Stays ~5s with css keyframe fade (0→1→1→0). Doesn't block scene UI (`pointer-events-none`).

**Open question:** the banner is the only revisit content delta. The actual scene resets to fresh state — same puzzles, same letter pool, same enemies. Is one floating chip enough to make backtracking feel meaningful, or do scenes still feel "static museum"?

---

## 4. The cross-room teaching unification

Round-2 critics flagged that broom (subtle) and brass-key (loud answer) taught contradictory patterns. Scope E unifies them: both are now silent perks that make a SPECIFIC element of the next room friendlier.

| Item | Source room | Effect in next room | Teach pattern |
|---|---|---|---|
| Lantern | 1.1 reward | Auto-reveals first carving in 1.3 | Silent perk on mount |
| Defrost candle | 1.2 reward | Lowers wipe threshold globally in 1.3 (0.55 → 0.40) | Silent perk on mount |
| Broom | 1.2 hotspot (optional) | Lowers wipe threshold on honey carving in 1.3 (0.55 → 0.25); fires bark on first activation | Silent perk + ONE legibility moment |
| Brass-key | 1.3 reward | Auto-snaps first valve (gas) in 1.4 | Silent perk on mount |
| Family-photo | 1.5 reward | Slot 3 of 1.6 ritual | Required for ritual completion |
| Recipe-book | 1.4 reward | Slot 4 of 1.6 ritual | Required for ritual completion |

**Open question:** Is "silent perk on mount" a strong enough pattern, or does it still need ONE explicit moment per item? Currently only broom has the bark.

---

## 5. New mechanics that didn't exist in round 2

These are post-Scope-B + post-Scope-E:

- **Lantern-light-reveal** (1.1): scene-as-interface intro. The opening interaction is finding the lantern, not tracing letters.
- **Spelling seal** (1.6): 4-letter HE word puzzle gating the transformation.
- **Affordance glow** (1.3): visual cue when a carving is "ready to tap."
- **Brass-key silent auto-snap** (1.4): pre-populated sequence on mount.
- **Ritual any-order** (1.6): set-based completion with canonical bonus.
- **Broom legibility bark** (1.3): one-time whisper to make broom perk felt.
- **Revisit banner** (RoomShell): floating chip on solved-room re-entry.

---

## 6. Per-mechanic scorecard

For each mechanic below, give a 1-5 score (1 = ship-blocker, 3 = shippable with notes, 5 = perfect) AND one specific tweak you'd make.

| # | Mechanic | Score (1-5) | Specific tweak |
|---|---|---|---|
| 1 | Lantern-light-reveal in 1.1 (scene-IS-the-interface intro) | _ | _ |
| 2 | Spelling seal in 1.6 (spell אורי after 4 items) | _ | _ |
| 3 | Affordance glow on wiped 1.3 carving | _ | _ |
| 4 | Brass-key silent auto-snap of first valve in 1.4 | _ | _ |
| 5 | Ritual any-order + canonical-bonus VO | _ | _ |
| 6 | Broom legibility bark in 1.3 | _ | _ |
| 7 | Revisit banner (floating chip on re-entry) | _ | _ |

---

## 7. Three holistic questions

1. **Does Word Vault now feel like one game or seven mechanics in a trench coat?** Scope E added/changed 7 distinct interactions. Round 1's 6 rooms used 3 mechanic patterns (spell-from-pool, cipher-jar, logic-sequence). Now we have: lantern-reveal, hotspot-discovery, cipher-jars, wipe-then-spell, valve-sequence, story-clicker, ritual-altar, spelling-seal. Is the bouquet too big?

2. **Did we restore the "Word" or just paste it on?** The spelling seal in 1.6 is the only place in the climax where the player creates a word. Is this enough to claim Word Vault delivers on its title? Or does it feel like a vestigial feature added to please critics?

3. **What's now the WEAKEST piece?** Round 1: 1.1 (busywork). Round 2: 1.1 (still). Round 3: ___? Or has it shifted to 1.2 (still has the unused letter-shard hotspot rewards) or 1.5 (still story-only with no real puzzle)?

---

## 8. Format for your response

```
### Verdict (one sentence, brutal)

### Per-mechanic scores
1. Lantern-light-reveal (1.1):     X/5 — <tweak>
2. Spelling seal (1.6):            X/5 — <tweak>
3. Affordance glow (1.3):          X/5 — <tweak>
4. Brass-key auto-snap (1.4):      X/5 — <tweak>
5. Ritual any-order (1.6):         X/5 — <tweak>
6. Broom bark (1.3):               X/5 — <tweak>
7. Revisit banner:                 X/5 — <tweak>

### Holistic questions
- One game or seven mechanics?
- Restored "Word" or pasted on?
- Weakest piece NOW?

### What I'd ship next (≤4 items, ordered)
```

Be opinionated. Quantify where possible. Cite scene numbers. Don't soften.
