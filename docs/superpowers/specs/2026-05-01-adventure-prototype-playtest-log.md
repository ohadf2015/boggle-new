# Adventure Prototype — Wall-Sentence Playtest Log

**Date:** _______
**Tester:** _______
**Build:** commit _______
**Device/browser:** _______

## The wall sentence

> "If spelling a word to deal damage does not feel viscerally more magical than pressing an 'Attack' button within the first playable prototype, burn the rest of the design and start over."

## Test protocol

1. Run `npm run dev` from `fe-next/` (port 3001 per project memory).
2. Open `http://localhost:3001/en/adventure-prototype` on desktop Chrome.
3. Play **5 fights from start.**
4. Mix tap-input and keyboard-input across the fights.
5. After each fight, fill in the rubric.

## Rubric (1 = cold, 5 = visceral)

### Fight 1
| Dimension | Score | Notes |
|---|---|---|
| Did spelling feel like casting? | __ | |
| Was the projectile-launch satisfying? | __ | |
| Did the impact feel weighty? | __ | |
| Was audio convincing? | __ | (audio off if SFX not added — note that) |
| Did "Cast" feel different from generic "Attack"? | __ | |
| Did invalid words feel like a real failure? | __ | |
| Did 4+ letter words feel rewarding vs 3? | __ | |
| Did 3+ fights stay magical? (assess at end) | __ | |

### Fight 2
(repeat rubric)

### Fight 3
(repeat rubric)

### Fight 4
(repeat rubric)

### Fight 5
(repeat rubric)

## Average across all fights

| Dimension | Avg |
|---|---|
| Did spelling feel like casting? | __ |
| Was the projectile-launch satisfying? | __ |
| Did the impact feel weighty? | __ |
| Was audio convincing? | __ |
| Did "Cast" feel different from generic "Attack"? | __ |
| Did invalid words feel like a real failure? | __ |
| Did 4+ letter words feel rewarding vs 3? | __ |
| Did 3+ fights stay magical? | __ |

**Overall average:** ____

## Pass criterion

**Pass:** Overall average ≥ 3.5, AND every "Cast vs Attack" answer ≥ 4.

**Fail:** Anything else.

## Decision

- [ ] **PASS** → write Plan 2 (Combat Depth: active skills, status effects, Bingo, Lexicon, runes integration, multiple enemy types)
- [ ] **FAIL** → STOP. Identify the broken assumption below.

## On fail — diagnosis

Possible failure modes (circle the closest match, expand below):

1. **Word→damage feels like a UI puzzle, not a spell.**
   Fix candidates: rework cast verb (swipe to cast? letters fly themselves on submit? hold-to-charge?). Revise spec §3 seam fix.

2. **Tile pool feels random and unfair.**
   Fix candidates: rune-modified pool earlier (before Plan 2's full rune set), telegraph next-tile draws, larger pool (16 → 20 tiles).

3. **Pacing kills magic.**
   Fix candidates: parallel tile refresh during enemy turn, faster animation curves, shorter enemy telegraph.

4. **Audio is the gap.**
   Fix candidates: better SFX, layered hit sound (low thump + high crack), music underscore.

5. **The visual is too placeholder to judge.**
   Fix: replace lime/red blocks with actual hero/enemy sprite (one fal-gen each), retest.

6. **Other:** _______

**If the failure mode is 1 or 2:** spec needs revision, then write Plan 1.5 with the fix.
**If 3 or 4 or 5:** still in Plan 1 territory — patch and re-playtest, no spec revision needed.

## Next-action checklist

After playtest:

- [ ] Update memory file `adventure-rebuild-spec-2026-05-01.md` with outcome + commit SHA.
- [ ] If pass: kick off Plan 2 (combat depth) via writing-plans skill.
- [ ] If fail: revise spec section per diagnosis, then re-write Plan 1 from the failure point.
