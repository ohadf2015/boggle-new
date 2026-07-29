# Word Vault — External Critique Brief — Round 2 (2026-05-03)

> **For LLM reviewers:** Round 1 was 4 hours ago. We took your feedback and shipped a "Scope B" pass — wired 4 dead items, replaced the 1.6 spell-from-pool climax with an inventory ritual, added cross-room item flow, renamed characters to native HE, added a revisit-room flow, hid puzzle UI until discovery, added graduated feedback in 1.4. This doc is the post-change state. **Critique what's still wrong + what we BROKE by changing things.** Hard scope: don't re-litigate the settled debates (rooms-stay-at-6, protag-name-is-אש) — the user has decided. Naming: this mode is "Word Vault." Game is **Hebrew-first**, RTL.

---

## 0. What we want from you

Read the round-1 response table (§1) so you don't re-critique fixed items. Then attack:

1. **Did the fixes land?** Pick 2 of the 7 round-1 complaints we tried to address. Did our patch actually solve it, or did we paper over it?
2. **What did we break?** Every fix has a side effect. The inventory ritual changed the climax from a word-spelling moment to an item-arrangement moment. The discovery-first UI in 1.3 hides the letter pool until a carving is wiped — does this teach the wrong thing? Find the regressions.
3. **What's STILL the weakest piece** of Book 1 in this new state? (Round 1 said 1.1 — is that still true?)
4. **The new mechanics** — broom cross-room flow, brass-key time-valve hint, ritual altar with decoys — judge each on its own. Which one is shippable, which one needs another pass?

Anti-scope: UI polish, accessibility, performance, tests, code quality, asset production, monetization. Game design only. ≤1,500 words. Use the response template at the end.

---

## 1. Round-1 response table

| # | Round-1 complaint | What we shipped | Worth a fresh critique? |
|---|---|---|---|
| **R1-1** | "4 of 6 items are dead — never wired" (all 4 critics) | Wired all 4: defrost-candle speeds wipe in 1.3; brass-key fixes time-valve in 1.4; cinder-charm = HUD coin-pill flame glow; broom (NEW item) speeds 1.3's hardest carving | YES — does the wiring deliver the inference loop? |
| **R1-2** | "Names sound transliterated" (all 4) | Renamed: סינדר→**גחלת**, מלו→**אש** (now feminine — protag is grammatically female), קאל→**אורי** | NO — name choices are settled. But flag any HE inflection mistakes from the gender flip if you spot them. |
| **R1-3** | "Riddles appear cold — discover object first" (all 4) | 1.3: letter-slot UI now hidden until player wipes a carving past threshold. 1.6: spell-pool gone entirely (see R1-5). | YES — did this go far enough, or is it cosmetic? |
| **R1-4** | "No backtracking / revisit" (3 of 4) | Added isRevisit flag in router. Worldmap "revisit" buttons land you in a solved room; on exit, return to hub instead of auto-advance. | YES — does this change anything emotionally if no scene CHANGES on revisit? |
| **R1-5** | "1.6 climax is the same gesture as the tutorial" (all 4) | **Replaced** with inventory-ritual altar: 4 ordered slots (lantern→key→photo→recipe-book). Player taps inventory items; correct one fills next slot; decoys (defrost-candle, broom) shake + give per-item line. After all 4 → Gachelet→Uri transformation. | YES — this is the biggest structural change. Highest risk. |
| **R1-6** | "1.4 stove is brute-forceable, no partial-progress signal" (3 of 4) | Wrong-sequence now KEEPS the correct prefix (was: full reset). Brass-key holders trying the time-valve get a one-shot whisper revealing the order. | YES — is "keep prefix on wrong" enough, or do we still need per-valve flame pips? |
| **R1-7** | "Decoys: how aggressive?" (split) | Defrost-candle + broom act as ritual decoys in 1.6 (they're useful items in 1.3 but wrong for the altar). 2 decoys per book. | YES — is 2/7 inventory items being decoys the right ratio? |

---

## 2. Architecture (current state)

**Linear scene chain** for first-pass solve: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → end-of-book cinematic.

**Revisit flow** (NEW): from hub worldmap, tap any solved room → enter scene → on exit, return to hub (not transition to next).

**Inventory: 7 items, 6 wired**

| ID | Source | Effect | Status |
|---|---|---|---|
| Esh's Lantern | 1.1 reward | Auto-reveals first carving in 1.3 | ✅ |
| Defrost Candle | 1.2 reward | Lowers wipe threshold 0.55→0.40 in 1.3 (universal) | ✅ NEW |
| Broom | 1.2 hotspot (explorer-only) | Lowers wipe threshold 0.55→0.25 on the "honey" carving in 1.3 (deepest soot) | ✅ NEW |
| Brass Key | 1.3 reward | Time-valve in 1.4 reveals correct order whisper | ✅ NEW |
| Uri's Recipe Book | 1.4 reward | Slot 4 of ritual altar | ✅ |
| Family Photo | 1.5 reward | Slot 3 of ritual altar | ✅ |
| Gachelet Charm | 1.6 reward | Cosmetic flame glow around HUD coin pill | ✅ NEW (cosmetic only — Book 2+ will use mechanically) |

**Discovery loop test:** A player who skips the 1.2 broom hotspot enters 1.3 with only `defrost-candle`. Their honey-carving wipe threshold is 0.40 (defrost) instead of 0.25 (broom). They feel the carving is hard but solvable. They never know they "missed" the broom. → Question: is this acceptable, or should the game signal "you missed an optional pickup"?

---

## 3. Scene-by-scene delta

Only listing scenes that CHANGED. Everything else is stable from round 1.

### Room 1.1 — The Cracked Door (UNCHANGED — still weakest per round 1, same critique applies)

> Round 1 verdict: "tracing אש on a 5×5 grid is busywork." Still true. Not in Scope B. **Worth flagging in your response if you think it's now the bottleneck.**

### Room 1.2 — The Cipher Pantry (MINOR change)

**What changed:** broom hotspot now silently grants the `broom` item to inventory in addition to its existing letter shard. No tooltip, no announcement. Player discovers the broom by opening the 🎒 inventory drawer.

**Open question:** the "letter shards" from cobweb / floorboard / broom hotspots STILL don't feed any system — they're just visible pickups in the scene's UI. Worth removing or wiring?

### Room 1.3 — The Sooted Wall (MEDIUM change)

**What changed:**
- Letter pool UI hidden by default. Renders only when player has tapped a carving that's been wiped past its threshold.
- Per-carving threshold function: `honey` carving = 0.25 (with broom) / 0.40 (with defrost) / 0.55 (base). Other carvings = 0.40 (with defrost) / 0.55 (base).
- Removed dead `SOOT_HOTSPOTS` array (never rendered). The hotspot pattern now lives in 1.2 only.

**Open question:** Player without broom never sees the 0.55 baseline because they always have defrost-candle (auto-awarded by 1.2 solve). So the only "felt" speedup is broom's, on the honey carving. Is one-carving differentiation enough payoff for the cross-room flow?

### Room 1.4 — The Cold Stove (MEDIUM change)

**What changed:**
- Wrong sequence no longer wipes progress. The correct prefix is kept; only the wrong-tail and after are dropped. Player who did `gas → air → fire` (correct) and then accidentally hit `time` doesn't lose `gas → air`.
- Brass-key holders who tap the time-valve get a one-shot whisper: "גז. אוויר. אש. — אורי תיקן את הברז." The valve becomes the reward instead of the trap.
- Without brass-key: time-valve still reads "זמן לא אופים. אבל הזמן אופה אותנו." (cryptic, no help).

**Open question:** Brass-key whisper REVEALS the answer. Is that too generous? Should it instead reveal a single hint (e.g., "אורי שאל: מה אש שורפת קודם?") and let the player still infer?

### Room 1.5 — Uri's Old Kitchen (UNCHANGED)

Still story-only, still the slideshow critic B called out. Defer.

### Room 1.6 — The Last Recipe (FULL REWRITE)

**Before:** spell 3 ingredients (`מים / קמח / דבש`) from a letter pool in correct order. Recipe-book + family-photo gave hints. Cinder→Cael transformation on third correct word.

**After:** Inventory ritual altar.

```
RITUAL_ORDER: [melo-lantern, brass-key, family-photo, cael-recipe-book]
```

The narrative arc embedded in the order: **light reveals → key opens → memory remembers → truth heals.**

UI:
- 4 numbered altar slots in a row
- Inventory drawer at bottom shows all owned items as tappable emoji cards
- Tap correct next item → fills slot, ✓ feedback whisper, slot ignites
- Tap wrong item (decoy or right-but-wrong-order) → altar shakes, per-item decoy line whispers
- All 4 placed → transformation cinematic (Gachelet shrinks → Uri appears, glow, hug, vanish)

Decoy lines:
- Defrost candle: "הנר ימס את הפיח. לא את האח."
- Broom: "מטאטא לא מנגן את שירת האחים."
- Gachelet charm: "הקמע שלך — אבל לא הזמן שלו." (defensive — player won't have it yet)

Success lines (one per slot):
1. "...אש? הפנס שלך... מאיר."
2. "...זה הברז של הזמן. מהמרתף."
3. "...אני זוכר. אני זוכר אותם."
4. "מים. קמח. דבש. לחם של אורי. — אורי חזר."

**File: 645 → 423 lines.**

**Open questions on the rewrite:**

1. The ritual is ORDERED. Player must drag in the right sequence (light → key → memory → truth). Is order satisfying, or arbitrary? Could it be unordered (any 4 items, only the SET matters)?
2. The 4 ritual items are all auto-awarded room rewards (1.1, 1.3, 1.4, 1.5). A player who completed all rooms HAS all 4 by the time they reach 1.6. So the ritual isn't a CHALLENGE of "did you collect them?" — it's a challenge of "do you remember the narrative order?" Is that still a game?
3. Decoys are ONLY defrost-candle and broom. A player who skipped the broom hotspot has only 5 items in inventory, including 1 decoy. A completionist has 6 items including 2 decoys. Does the decoy ratio scaling-by-completion feel right?
4. The 4th success line ("לחם של אורי") name-drops the old recipe target words (מים/קמח/דבש). Does this preserve the spelling-puzzle's emotional callback, or does it feel like a remnant?

### Hub / PageClient (NEW: revisit flow)

**What changed:** PageClient now tracks `isRevisit` per scene mount. Worldmap "revisit" buttons send player into a solved room with `isRevisit=true`; on `onExit`, returns to hub instead of advancing.

**Critical gap (acknowledge):** scenes don't CHANGE on revisit. The 1.3 carvings, 1.4 valves, 1.6 altar all reset to fresh state. Player can re-solve, but there's no "new content" to find. Adding scene-level "revisit-mode" content is out of Scope B.

**Open question:** Does an unchanged-scene revisit have ANY player value? Is it a cosmetic feature ("look I can go back") or does the act of replaying a solved puzzle have its own pleasure?

---

## 4. New things that critics from round 1 didn't see

These weren't in round 1's purview because they didn't exist:

- **Cross-room item flow** (broom 1.2 → 1.3): This is the connected-world prototype. Critic the loop, not the destination. Did we deliver "find tool → use elsewhere → infer the connection"?
- **Brass-key time-valve hint**: an item from 1.3 makes a 1.4 puzzle ELEMENT (not the puzzle as a whole) friendlier. Different from the broom flow — broom helps you wipe faster; key reveals an answer. Are these two patterns coherent or contradictory?
- **Decoy lines in 1.6 ritual** (per-item personality whispers): is "defrost candle: 'this melts soot, not flesh'" the right voice for Uri/Esh narrator, or does it break the tone?
- **HUD glow for cinder-charm**: cosmetic-only. Does cosmetic-only inventory feel like a system, or like vapor?

---

## 5. Specific tension points where we want your judgment

1. **The discovery-first 1.3 UI:** by hiding the letter pool until wipe-then-tap, we removed a visible affordance. New player on 1.3 sees walls and has to *figure out* "wipe to reveal, then tap to select letter." Round 1 wanted this. But: does it now feel mysterious-good or confusing-bad?

2. **The 1.4 brass-key whisper:** answers the puzzle if you have the key. We could make it a HINT instead (one valve in correct position visually). What's the right amount of help for "you earned the key by solving 1.3"?

3. **The 1.6 ritual order:** is "light → key → memory → truth" intuitive enough that players will infer it from the per-slot success whispers? Or are we asking too much of narrative inference?

4. **Native-HE gender:** protag אש is grammatically feminine. Every verb about her is now feminine-conjugated (נכנסת, מזילה, קוראת). The brother אורי + boss גחלת stay independent. Does this gender flip change anything about the family dynamic the game wants to convey? (Brother–sister vs cousin–cousin tension.)

---

## 6. Format for your response

```
### Verdict (one sentence, brutal)

### Did the fixes land?
- R1-1 (dead items wired): _
- R1-3 (discovery-first UI): _
- R1-5 (1.6 inventory ritual): _
- R1-6 (graduated feedback in 1.4): _

### What did we break?

### Weakest piece NOW (post-Scope B)

### The 3 NEW mechanics — ship-ready or needs polish?
- Broom cross-room flow:
- Brass-key time-valve hint:
- Inventory ritual altar:

### What I'd ship next (≤4 items, ordered)
```

Critics from round 1: feel free to compare against your own prior take. Critics seeing this fresh: skip §1's response table and judge §2-§5 on its own merits.
