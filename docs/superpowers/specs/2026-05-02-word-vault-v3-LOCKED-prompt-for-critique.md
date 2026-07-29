# Word Vault — v3 LOCKED Plan (Round 3) for Final Validation

> **For the user:** Round 3 critique. Self-contained. Ask 2 different LLMs (e.g., GPT-5 + Gemini 2.5 Pro). If they both say "ship it" or both flag the same single issue, you have your answer. If they contradict each other, ignore both and ship.

---

## CRITIQUE PROMPT (paste at top — sets LLM role)

You are reviewing **round 3** of the Word Vault game plan. Two prior rounds (4 reviewers + 3 reviewers, total 7 critiques) have already shaped this plan. Cuts have been substantial. The user is close to committing 14 weeks of solo + AI-assisted dev to this.

**Your job is to gate the GO/NO-GO decision.** Not full critique — focused validation.

Specifically answer:

1. **Is the v3 plan tight enough to actually ship in 14 weeks?** Or is there ONE more thing to cut?
2. **Is the v3 plan still distinctive enough to matter in market?** Or have the cuts diluted what made it special?
3. **Is keeping Hebrew (with smaller scope traded in exchange) the right call?** Hebrew testers exist; ~250k-word HE dictionary already in repo; RTL infrastructure already proven in earlier prototypes.
4. **Is there a smaller "vertical slice" inside this plan** (e.g., 3 rooms, 1 engine) that should ship first to validate before committing to all 6 rooms?
5. **What's the ONE thing most likely to derail it?** Be specific.

Format: tight (≤500 words total). No exhaustive sub-sections. Be decisive.

End with: **GO / NO-GO / GO-WITH-REVISION** verdict. If revision: name exactly what to change.

---

# 1. CONTEXT — TWO ROUNDS BEHIND US

**Original plan:** 5 books × 8-10 rooms × 8 riddle types × 5 locales × 10 weeks. 7 critics agreed it was fantasy.

**Round 1 cuts (4 critics):** 1 book + hub only, 4 engines, English-only, 12 weeks, no audio/lateral/pattern riddles, single inventory currency, DOM-only puzzles, JSONB content layer.

**Round 2 cuts (3 critics):** 6 rooms not 8, 3 engines (drop Memory), Lottie everywhere (drop Rive), no ElevenLabs (musical character barks via Suno), add Tone.js, add edge cache, 14 weeks. **User overrode the Hebrew cut** — Hebrew testers exist, brings localized RTL puzzle infrastructure back as a differentiator.

**Round 3 (this doc):** validate the locked v3 plan or find the LAST thing to cut.

---

# 2. THE v3 LOCKED PLAN

## Scope (final)

| | |
|---|---|
| Launch content | **Book 1 (Cinder/Hearth Halls) + Hub** only. Books 2-5 = post-launch roadmap. |
| Rooms | **6** |
| Riddle engines | **3** — Word Constraint, Cipher, Logic/Sequence |
| Locales | **EN + HE** (user override; Israeli testers) |
| Currencies | 1 (Memory Coins) |
| Consumables | 1 (Hint Token) |
| Permanent items | Melo's Lantern, Cael's Recipe Book, Cinder Charm |
| Cinematic moments | 2 (Vault entrance + Last Recipe redemption) |

## 6 rooms (Book 1: Hearth Halls)

1. **Threshold** — Word Constraint tutorial. Spell FIRE to open the door.
2. **Recipe Wall** — Logic + Word Constraint hybrid. Order recipe cards via rhyme + spell missing ingredients.
3. **Cipher Pantry** — Cipher (anagram unscramble of 4 jar labels).
4. **Smouldering Vault** — Logic/Sequence (lever order from rhyme; rewards Recipe Book). **Melo gets a real choice here:** keep all of Cael's recipes OR burn one for heat.
5. **Cael's Old Kitchen** — Story-only "just exist" room. Click 5 objects (apron, ladle, cookbook, hat, photo) to read memories. No puzzle. Earn a Word Fragment.
6. **Last Recipe (Redemption)** — Word + emotional choice. Cook 3 ingredients in Cael's signature order (revealed environmentally in room 5). Third correct word redeems Cinder. **Melo gets a second choice:** what to say to Cinder before he vanishes — affects Cinder Charm flavor text.

## Tech stack (final)

- **Pixi.js 8 + GSAP** — Hub + 2 cinematics ONLY
- **DOM + framer-motion** — all 6 puzzle rooms (avoids Pixi+DOM hybrid trap)
- **Lottie everywhere** — Melo + NPCs + cinematics (no Rive — saves $14/mo and pipeline complexity)
- **Howler 2.2 + Tone.js** — Howler for sprite SFX; Tone.js for dynamic music (lowpass on menu, layer-add near solution)
- **Zustand** (single store) + **XState** for the 3 riddle engine FSMs
- **Supabase JSONB** for content + **Vercel Edge Config** cache for hot reads
- **Tiny `/admin/word-vault` Next.js page** with Zod-validated forms — non-dev riddle authoring
- **next-intl** for EN + HE (existing infrastructure)
- **Suno** (user) for music + character barks (no AI voice)
- **fal-ai Flux 2 Pro** image-to-image with `celebration.webp` mascot anchor (brand consistency)
- **CassetteAI via fal-ai** for SFX (~30 clips)

## Story (locked)

- **Melo's arc:** "Why did I sleep through the corruption?" — internal doubt threaded across 6 rooms.
- **Two real player choices** (rooms 4 + 6) that affect Charm flavor text and Twin Voice setup.
- **Cael's signature dish ingredients** revealed environmentally — player must NOTICE, not be told.
- **Twin Voice tease** — 2 hints: diary line in room 4, glitched whisper in redemption cinematic.
- **Failure-as-lore:** 3 wrong-answer character voice lines per riddle room.
- **Hub visibly changes** post-redemption: fireplace warms, ash settles.

## Wall sentence (locked)

> **"Every room must change what the player understands — about the mechanic, the character, or themselves. If it changes none, it is the corruption — cut it."**

## 14-week timeline

| Phase | Weeks | What |
|---|---|---|
| A. Foundation | 1-2 | Module skeleton, types, single Zustand, XState shells, Pixi Hub |
| B. 3 riddle engines | 3-4 | Word Constraint, Cipher, Logic in DOM+framer-motion |
| C. Content pipeline | 5 | Supabase JSONB schema, Zod, /admin UI, Edge Config cache |
| D. Book 1 content (6 rooms × 2 locales) | 6-9 | Authoring + HE translations w/ native testers |
| E. Audio + Lottie polish | 10-11 | Suno music + barks, Tone.js dynamic, CassetteAI SFX, Lottie cinematics |
| F. Internal playtest (EN + HE) | 12-13 | 5 EN + 5 HE testers, refine solve rates |
| G. Public Book 1 demo | 14 | Launch lexiclash.app/word-vault, PostHog analytics |

## What's deferred to post-launch

- Books 2-5 (~6 weeks each, ordered by retention signal)
- Memory Theatre as separate UI (folded into inventory v1)
- Word Fragments + Letter Tokens currencies (introduced in Book 2)
- Charm equip system (passive auto-effects v1)
- Audio + Lateral + Pattern + Spatial+Memory riddle engines
- Voice narration (musical barks v1)
- Rive (re-evaluate if Lottie hits a wall)
- Memory engine as standalone (folded into in-room recall mechanics within Logic riddles)

---

# 3. ROUND-3 SPECIFIC QUESTIONS

1. **Will Hebrew + 6-room scope still ship in 14 weeks**, or do we need 16?
2. **Is 3 riddle engines enough for a 30-45 minute demo** to justify a story-driven puzzle pitch?
3. **Is folding the "Memory" mechanic into Logic via the redemption riddle (cook 3 ingredients in Cael's order)** a clean compromise, or did we lose memory's distinctive feel?
4. **Is the "Just exist" room (#5)** the right place for the story breath, or should it move?
5. **The 2 Melo choices (rooms 4 + 6) are flavor-text-only** — should they have mechanical consequences (e.g., room 4 choice locks/unlocks an item) or is flavor enough to make Melo feel "active"?
6. **Should we ship a 3-room "vertical slice"** at week 8 to validate the loop before committing to all 6 + audio + cinematics? Or just trust the plan?
7. **Hebrew testers are real** — does their feedback come BEFORE the public launch (week 12-13) or as part of week 14? Earlier = more friction time.
8. **The wall sentence** — sharp enough as a kill criterion, or still too abstract?
9. **Critical risk identification** — what is THE ONE THING most likely to break in week 8-10 that would push to 16+ weeks?
10. **GO / NO-GO / GO-WITH-REVISION** — which is your verdict?

---

# 4. THE COMPRESSION TEST

If you understood this plan, summarize Word Vault v3 in **one sentence**:
*A 14-week solo + AI-assisted indie demo of a story-driven puzzle game where a marshmallow-cube hero solves 6 word/cipher/logic rooms across two cinematic moments to redeem a corrupted cousin, shipping in English + Hebrew on web with Pixi+Lottie+DOM+Supabase.*

If your one-sentence summary differs significantly from above, point out where the plan is ambiguous.

---

# END

End your reply with: `GO`, `NO-GO`, or `GO-WITH-REVISION: <one specific change>`.
