# Word Vault Critique Synthesis (2026-05-03)

Source: 4 external LLM critiques of `word-vault-2026-05-03-external-critique-brief.md` (A/B/C/D below).

---

## Unanimous (4/4) — ship without further debate

| # | Action | Why |
|---|---|---|
| **U1** | **Rename boss סינדר → גחלת (Gachelet = ember)** | Native HE; thematically perfect; pairs with hearth motif |
| **U2** | **Rename brother קאל → אורי (Uri = my light)** | Real warm Israeli name; light/dark contrast; works |
| **U3** | **Wire dead items** (Defrost Candle, Brass Key, Cinder Charm currently never read) | Dead inventory actively erodes player trust |
| **U4** | **B-proto: broom (1.2 → 1.3 carving)** | All 4 explicitly endorse this exact pair |
| **U5** | **Discovery-first UI: hide puzzle slots/pool until after environmental discovery** | The "riddle shouldn't appear cold" complaint, restated by every critic |
| **U6** | **NO graph-router rewrite (B-full)** | All 4 said state-driven gating in existing Zustand is enough; B-full is overkill |
| **U7** | **Room 1.6 climax must NOT be a third spell-from-pool** | All 4 hate the repetition; transformation/synthesis/ritual instead |

## Strong majority (3/4)

| # | Action | Dissent |
|---|---|---|
| **M1** | **B-proto SECOND loop: Brass Key (1.3 reward) → 1.4 broken time-valve** | Critic A doesn't mention; B/C/D all add it |
| **M2** | **Room 1.1 cracked door is the weakest scene; compress or convert to "scene-as-interface" (start in darkness, find lantern hotspot, then letters reveal)** | Critic B picks 1.5 weakest instead |
| **M3** | **Room 1.2 cipher pantry: cut from 4 jars to 2** | A doesn't address; B/C/D all want trim |
| **M4** | **Cap decoys at 1–2 total per book**, not "30% of items" | Critic A says 30%; others say 1–2 max — dead items hurt more than missing decoys |
| **M5** | **Room 1.4 stove needs graduated feedback** (not binary smoke = wrong); add partial-progress signal | A doesn't address; B mentions toothless; C/D detailed |

## Split (2/2 or contested) — needs user call

| # | Question | Camp 1 | Camp 2 |
|---|---|---|---|
| **S1** | **Protag rename to אש (Esh = fire)?** | A & D: yes — elegant, ties to first puzzle word, mirrors journey | B & C: no — אש is a noun not a name; give human given name (e.g., אורי-pattern: עידו/תום/יערה), use אש as in-world nickname |
| **S2** | **Cut rooms from 6 to 4?** (Merge 1.1+1.2; absorb 1.5 into 1.6) | B: yes — "you don't have 6 ideas, you have 3.5" | A/C/D: no — keep 6, fix mechanics |

## What each critic ranked as "ship next" (top action)

- **A:** Execute B-proto (broom + revisit + Brass Key + Defrost Candle wired)
- **B:** Kill 2 rooms first, then B-proto, no announcements ("let player feel clever")
- **C:** Cut/compress weakest mechanics first, then make 1.4 flagship
- **D:** Implement 1.2→1.3 broom loop with revisit button (lowest effort, highest "connected feel" delta)

3 of 4 put **B-proto wiring as the primary action**. B is the outlier because B wants room-trimming first.

---

## Recommended action scopes (pick one)

### Scope A — "Convergence-only" (~2 hr)
Ship just the unanimous + strong-majority items. Defer all splits.
- U1, U2 (rename boss + brother) [30 min]
- U3, U4, M1 (wire all 4 dead items, broom + brass-key cross-room) [1 hr]
- U5 partial: hide 1.3 letter-slot UI until carving fully wiped [30 min]

**What you get:** Working cross-room flow, named characters, no dead items. Validates connected-world feel. Doesn't touch room count or 1.6.

### Scope B — "Convergence + 1.6 fix" (~half day)
Scope A + replace 1.6 climax with inventory ritual (use lantern + key + photo + decoy in correct combination instead of spelling 3 words).
- All of Scope A
- U7 + M5 (1.6 transformation puzzle + 1.4 graduated feedback) [3 hr]

**What you get:** Connected world + earned emotional climax. Game shape stays 6 rooms but plays meaningfully different.

### Scope C — "Critic B's brutal cut" (~full day)
Reduces rooms 6→4, ships everything else.
- All of Scope B
- M3 (1.2 jars 4→2)
- Cut 1.5 standalone, fold mementos into 1.6
- Compress 1.1 to <30s prologue or scene-as-interface darkness reveal

**What you get:** Tighter pacing, deeper rooms, but invalidates ~½ of shipped scene work and reorders the emotional arc.

### Splits to resolve regardless of scope
- **S1 (protag name):** אש vs human-name-with-אש-nickname
- **S2 (room count):** stay 6, or cut to 4 (only relevant if you pick Scope C)

---

## Files affected (estimate)

**Scope A:**
- `lib/word-vault/types.ts` — no change (existing ItemId set covers it; broom is new — add 1)
- `lib/word-vault/content/book1-hearth-stub.ts` — rename strings; add broom item; add cross-room metadata
- `components/word-vault/scenes/CipherPantryScene.tsx` — broom hotspot awards `broom` item to inventory (currently letter-shard only)
- `components/word-vault/scenes/SootedWallScene.tsx` — `hasItem('broom')` gates one carving slot OR speeds wipe; reveal letter-slot UI only after wipe complete
- `components/word-vault/scenes/ColdStoveScene.tsx` — `hasItem('brass-key')` enables the broken time-valve repair
- `components/word-vault/scenes/LastRecipeScene.tsx` — defrost-candle visual perk
- `components/word-vault/HubFoyer.tsx` — add "Revisit room" list (room ids unlocked once solved)
- `app/[locale]/word-vault/PageClient.tsx` — accept revisit nav from hub
- `translations/{he,en,sv,ja,es}.json` — name rename + new strings (he native; others AI-drafted with native-review flag)
- Tests: 3–4 new test cases for cross-room item gating

**Scope B adds:**
- `LastRecipeScene.tsx` — climax replaced (significant rewrite)
- `ColdStoveScene.tsx` — graduated-feedback (per-valve correct/wrong signal)

**Scope C adds:**
- Delete 1.5 scene file or repurpose
- `book1-hearth-stub.ts` — cut to 4 rooms
- 1.1 scene rewrite or prologue trim
