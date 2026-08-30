# LexiClash Education — Promo Video Design

**Date:** 2026-08-28
**Status:** design in progress (brainstorming), not yet approved
**Goal:** one 30s vertical film serving BOTH cold acquisition (A) and activation of lapsed teacher signups (B), split only by end card.

---

## 1. Grounding — what the data says

### Funnel (production DB, audited 2026-08-27, re-verified 2026-08-28)

- 44 access requests → all auto-approved → 35 hold `user_role='teacher'`
- **2 classrooms created, ever. 1 student has ever joined one.**
- Distinct active days after approval: 21 teachers **zero**, 8 **one**, **nobody two**
- Create-flow is 3 clicks / 1 required field vs Google Classroom's 6. A wizard shipped 26 Aug to shorten it further produced **zero** new classrooms.

**Conclusion: friction is not the blocker. Motivation and occasion are.**

### Roles of applicants

| role | n |
|---|---|
| teacher | 33 |
| tutor | 4 |
| researcher | 3 |
| other | 3 |
| parent | 1 |

### What teachers wrote in the `use_case` field

⚠️ **Contamination warning — do not quote the raw counts.** The form's own placeholder is
`"e.g. Friday vocab battles with my 7th-grade ESL class…"`. Three submissions are verbatim
*"Weekly vocabulary battles with my class"* plus one Spanish translation of the same sentence.
The 18/44 "vocabulary" keyword hits are partly our own placeholder echoed back.

Genuinely self-written submissions:

- (Hebrew) *"Every Friday we play with the students, practicing the vocabulary and grammar learned during the week"*
- *"friday vocabulary battle for class 6-9"*
- *"Live team games to review spelling"*
- *"For vocabulary practice with my 2nd to 6th graders"*
- *"for a sped classroom"*
- *"I am using this platform for my 7th Grade **Math** class as a fun way to get kids thinking"*
- *"Quickly identifying words"*
- *"I'd like to create unique tasks for my amazing students"*

**The real insight: teachers are not buying a word game. They are filling a recurring slot —
end of week, review what we just learned, as a live team game.** A Hebrew teacher and an English
teacher converged there independently. One is a *math* teacher.

A weekly occasion is also the only thing that can fix "nobody had two active days": the product
currently has no recurring reason to return.

---

## 2. Live copy bug found during this work (separate from the video)

Two strings contradict each other in production:

| Location | Copy | Correct? |
|---|---|---|
| `education.access.lede` | "Access is granted instantly — no review wait." | ✅ true — approval is auto + inline |
| `education.landing.faq.q1.a` | "we review by email and typically respond within 24 hours" | ❌ false |

A teacher applies, is instantly approved, then reads the FAQ and goes off to wait for an email
that never arrives. Candidate one-string explanation for a large share of the 21 zero-active-day
teachers. **Fix independently of this video.**

---

## 3. Competitive position (verified)

| Competitor | Documented limit (2026 reviews) | Our counter |
|---|---|---|
| Gimkit | free tier caps at **5 students**; then $14.99/mo | free plan, 10 students |
| Blooket | only **two** question types (MC + typing); noisy in big rooms | word construction + 6 modes |
| Kahoot | MC only; speed over depth; no audio answers; no guided correction; "trivia machine" | build the word, don't pick it |
| Wordwall | **3-activity** free cap, web-only | — |
| All | English-first | native multilingual incl. **Hebrew RTL + IME** |

Research backing the core mechanic claim: game-based spelling tools are most effective when the
game requires **active word construction** (typing/assembling letters) rather than passive
recognition. That is exactly what LexiClash is, and exactly what a multiple-choice quiz is not.

**Production constraint:** never name or show a competitor. Higgsfield rejects trademarks
(`ip_detected` terminal status) and ad platforms restrict competitor marks in creative.
Show *multiple choice itself* (A/B/C/D) — nobody owns that, and nothing is left to litigate.

---

## 4. Features to dramatise (all verified present in code)

| Feature | Code |
|---|---|
| Duels (1v1) | `app/[locale]/education/duels/`, `[duelId]`, `components/education/duels/*` |
| Live classroom leaderboard | `components/education/ClassroomLeaderboard.tsx` |
| TV / projector broadcast | `host/components/TvBroadcastView.tsx`, `tv-results/TvResultsLeaderboard.tsx` |
| 6+ game modes | `components/education/SixModeTour.tsx` |
| Achievements / XP | `AchievementUnlockModal.tsx`, `XpProgressBar` |
| Multilingual + RTL | 5 locales, Hebrew RTL throughout |
| Big rooms | `MAX_PLAYERS_PER_ROOM = 50`; big rooms retain better than small |

Rule: **every feature is a verb performed by the mascot, never a bullet.** Feature lists in video
are where attention dies.

---

## 5. Character & art direction

**Lexi** — white rounded-cube marshmallow, huge glossy eyes, pink blush ovals, stub limbs, thick
dark outline with white sticker border, navy background. Magenta knight helmet in hero pose,
round glasses + book in study pose. ~30 on-model images in `fe-next/public/mascot-*`, covering
`oops`, `panic`, `crying`, `mindblown`, `thinking`, `trophy`, `flexing`, `study`, `waving`.

**Consistency mechanism: reference images, NOT a Soul.** A Soul named `lexi` (`soul_2`) already
exists on the account with status **failed** — Soul ID is a face-faithful *human* identity model
and a marshmallow cube has no face for it to learn. Do not retrain it. Use Seedance 2.5's
repeatable `--image` references against the existing on-model set; that locks art style rather
than a face. See `~/.claude/skills/higgsfield-generate/references/seedance-2-5.md`.

**Rendering route — open decision:**

- (a) full 3D CG — highest sheen, worst brand match, highest drift risk from flat refs
- (b) 2.5D — flat sticker Lexi, cinematic staging/parallax/rim light
- (c) **recommended** — feature-animation *acting and staging*, our flat neo-brutalist rendering

Note the repo design system is explicit: hard shadows **no blur**, solid borders, dark-only.
Full CG fights it. Never put "Pixar" in a prompt — describe the look instead
(*3D animated feature, soft subsurface scattering, warm key light, shallow depth of field,
expressive oversized eyes*).

---

## 6. Production spec

- Model: `seedance_2_5`, native multi-shot (`--multi_shots true` + `--multi_prompt` array of
  **objects** with a `prompt` key — a string array is rejected at submit and `generate cost`
  will not catch it)
- Aspect 9:16, `--width 720 --height 1280`
- **Never pass `--mode`** (client allows `std|fast`, server demands `t2v|omni_reference|…`; no
  value satisfies both)
- `--prompt_language en` (default is `zh`)
- Validate every beat at **480p** (2.5cr/sec) before any 720p render (6.5cr/sec)
- 30s @ 720p = 195cr; 30s @ 1080p = 270cr. Budget: 2451cr available.

Workflow per `references/film-pipeline.md`: script → still keyframes (cheap image tier) →
per-beat video with references attached to **every** beat → local assembly with
`ffmpeg -f concat`. No `drawtext` on this machine — render caption PNGs with Pillow and
`overlay`.

---

## 6b. Performance direction — restraint is the house style

Default AI video overacts: every beat played at peak, eyes wide, arms out. Counter it per-shot.
Technique reference: `~/.claude/skills/higgsfield-generate/references/prompt-engineering.md`
§ "Performance direction".

**Intensity budget — 2 peaks in 12 beats. Everything else holds.**

| # | Beat | Level | Direction |
|---|---|---|---|
| 1 | Cold open freeze | **2** | Deadpan. The stillness IS the joke — nobody mugs. Teacher's only move is a slow blink. |
| 2 | Lexi's idea | **1** | One eyebrow. Nothing else on the body moves. |
| 3 | Taps the projector | **2** | Calm and deliberate, like she's done it a hundred times. No flourish. |
| 4 | Phones light up | **2** | Ambient. Faces mostly out of frame — let the screens do it. |
| 5 | **THE CALLOUT** | **4** | First peak. Even here: the *pointing kid* is big, the room's "OOOOH" is heard more than seen. |
| 6 | The duel | **3** | Hands move fast, faces stay still. Concentration, not frenzy. |
| 7 | **Quiet kid hits #1** | **5** | The only full-room reaction in the film. Earned because 1–6 held back. |
| 8 | Hebrew RTL double-take | **2** | Small. One beat, eyes only, then back. Comedy from restraint. |
| 9 | Mode wheel | **3** | Energy lives in the wheel and the cut, not in performances. |
| 10 | Bell — nobody moves | **1** | Total stillness. Peak by contrast. "one more" is said flatly, almost bored. |
| 11 | Monday coffee | **1** | Tired warmth. A small mouth-corner lift, nothing more. |
| 12 | End card | — | — |

**Reference-image discipline:** anchor identity with the *neutral* mascot images
(`mascot-new-main`, `mascot-new-study`, `mascot-new-waving`, `mascot-new-thinking`). Do NOT attach
`panic` / `crying` / `mindblown` to every beat — an extreme reference set drags every shot toward
extremes. Bring `mindblown` in on beat 7 only, and `trophy` on 11.

**Per-shot boilerplate** appended to every non-peak `multi_prompt` entry:

> `understated acting, small natural movements, minimal facial change, reactions land late and
> quietly, no exaggerated expressions, hands stay low, natural blinks`

Without this on each entry, `multi_prompt` samples each shot independently and every one peaks.

## 6c. Board v1 review — five corrections (2026-08-28)

First 12-frame board was rejected. All five notes are direction changes, not render bugs:

1. **Not Pixar enough.** Rendering route (c) "flat sticker + feature-animation acting" is
   **overruled** — the ask is genuinely the 3D feature-animation look: dimensional form, soft
   subsurface scattering, warm key light, shallow depth of field. Note this fights the repo design
   system (hard shadows, no blur) — accepted deliberately for the film, which is a separate surface
   from the app. Still never write "Pixar" in a prompt (`ip_detected`); describe the qualities.
   The only genuinely 3D asset we own is `public/mascots/styles/3d/epic.gltf` (+ baseColor,
   normal, metallicRoughness maps) — a real model, not an image, so it can seed look-dev.
2. **Wrong Lexi, and no glasses.** `mascot-new-main` was the wrong pick. Candidate set assembled
   for selection; `lexiclash-mascot-transparent.png` is the glossier, more dimensional canonical
   version. Lexi must not wear teacher glasses.
3. **One teacher only.** Do not put a mascot-as-teacher and a human teacher in the same clip.
   Resolution: **the human teacher is the audience surrogate and stays; Lexi is never a teacher** —
   no glasses, no authority role. Lexi belongs to the game, appearing on/around the screen.
4. **The trend bit is unreadable.** Beat 01's "synchronized silly bit" is too vague to parse in
   2.5 seconds. It must be one specific, nameable, copyable action — the audience has to
   understand what the class is *doing* instantly, or the cold open fails.
5. **On-screen UI is invented.** The projector/phone screens do not resemble real LexiClash game
   screens. Fix: capture real UI (grid, live leaderboard, duel, classroom lobby) and use those
   captures as references, or composite real screens in post rather than letting the model
   hallucinate a game.

Board v1 cost 24cr and is superseded. Do not reuse those frames as production references.

## 6d. LOCKED — house style, mascot, platform (2026-08-28)

**Platform: Instagram Reels.** 9:16, 1080x1920. Not TikTok. IG rewards polish/saves over
trend-chasing, which removes the need to ride an unverified trend at all.

**House style — matched, do not re-derive.** The look is defined by the existing in-app
celebration videos at `fe-next/public/mascots/celebration-*.mp4` (720x720, 5–6s). Extract a frame
(`ffmpeg -i celebration-knight-2.mp4 -vf "select=eq(n\,20)" -frames:v 1 out.png`) and pass it as a
**second reference image** alongside the mascot.

The style is a **soft dimensional toon render** — NOT flat cel, NOT photoreal CG:
thick white sticker outline, smooth volumetric shading, soft highlights and rim light, gentle
emissive glow, shallow depth of field, deep navy atmospheric ground.

**Cream dimensional letter tiles with red/black letters are the established visual language.**
Build screens and titles out of tiles rather than inventing UI. Caveat: tile text garbles past
about two words — keep tile copy very short.

**Mascot: `fe-next/public/mascot/knight.webp`** — magenta knight helmet, **no glasses**, never a
teacher. Verified working as reference: `--image knight.png --image house.png` on `nano_banable_2`
at 2k, 9:16, 2cr. (Convert `.webp`/`.jpg` to PNG first — see media-inputs.md JPEG bug.)

**One adult only.** A single human teacher is the audience surrogate. Lexi is a character of the
game, never an authority figure.

## 6e. Series concept — Lexi as trainer

Replaces the unreadable "trend" cold open. A **military-training-montage genre** piece: Lexi in
its knight helmet drills the class like recruits. Readable with no trend dependency, works muted,
and directly dramatises skill improvement — the thing teachers asked for.

**IP guardrail:** never name the film that inspired it, or its studio, in any prompt
(`ip_detected` is a terminal status). Describe the genre: drill, recruits, formation, escalation.

Planned Reels series:

1. **RECRUITS** — Lexi trains them → *skills improve* (lead video, 30s)
2. **THE CALLOUT** — student-vs-student duel → *competition/duels feature*
3. **FRIDAY 2:47** — the teacher's weekly slot → *the actual sell, occasion-led*

RECRUITS beat sheet, with the same 2-peaks-in-N intensity discipline:

| Time | Beat | Level |
|---|---|---|
| 0–3 | Lexi lands helmet-first on the desk, plants a letter tile like a sword. Kids unimpressed. | 3 |
| 3–6 | The line-up. Six slouching recruits, one yawns. Lexi paces the desk like a drill captain. | 2 |
| 6–10 | First attempt: disaster. Tiles fumble and spell nonsense. Lexi faces into its hands. | 3 |
| 10–14 | The drill. Fast cuts — tiles snapping, hands dragging, timer, again, again. | 3 |
| 14–18 | Turn. The slouching kid locks a 6-letter word. Small nod from Lexi. | 2 |
| 18–23 | The boss word. A huge tile stack rises; the class builds it in formation. | 4 |
| 23–27 | It lands. Tiles slam home, light blows out, class erupts, Lexi thrown in the air. | 5 |
| 27–30 | Monday. Lexi asleep on the desk, helmet over its eyes. End card. | 1 |

## 6f. LOCKED — full 3D, no sticker outline (2026-08-28, supersedes 6d)

The house-style-match approach in 6d is **superseded**. Matching the in-app celebration videos
produced a 2D/3D mixup: flat sticker characters composited onto a dimensional room.

**Root cause: the white sticker outline.** Our mascot assets are sticker-style with a hard white
keyline. Passing one as a style reference drags that keyline onto every character, which is
exactly what makes a frame read as cutouts pasted on a background. The in-app celebration videos
have the same property, so referencing them reinforced it.

**Fix — prompt full 3D and explicitly negate the outline:**

> Pixar-quality 3D animated feature film still, full CGI. Everything in frame is fully
> three-dimensional and volumetric: soft global illumination, real subsurface scattering,
> physically based materials, shallow cinematic depth of field, warm key with cool bounce.
> **ABSOLUTELY NO white sticker outlines, NO flat 2D cutout characters, NO vector shapes,
> NO cel shading, NO comic outlines** — every character is a real 3D model in the same space.

Use `knight.png` as the ONLY reference (identity), and describe Lexi as a re-imagined 3D character:
glossy white subsurface-scattering body, real specular highlights in the eyes, contact shadows,
reflections — *a real 3D object with weight, not a sticker*. Do NOT pass the celebration-video
frame; that reference is what reintroduces the flat look.

**Casting — no generic students.** Every child must be individually designed with their own
silhouette, hair, clothing and attitude. Verified working cast:

- confident girl, box braids, round glasses pushed up on her head
- small skeptical boy, messy red hair, freckles, arms folded
- tall quiet kid, headphones round the neck
- cheerful girl in a hijab
- chubby boy with a gap-toothed grin

Keep this cast identical across every beat and every video in the series — it is the continuity
anchor that reference images alone will not provide.

**Verified 2026-08-28:** this prompt shape produced the approved THE LINE-UP frame
(`nano_banana_2`, 2k, 9:16, 2cr) — full 3D, zero outline, five distinct characters, restraint
intact (bored reads as bored).

**Still open: the tiles must look like LexiClash.** "A brick wall of letters" is not our game.
Real game UI must be captured from the running app and used as reference for any on-screen or
tile-based element. The `fe-next/tmp/playwriter-screenshot-*` captures are NOT our product
(verified: they are third-party ad-network pages) and `play-store-listing.png` is a blank dark
image. Both are unusable.

## 6g. FINAL LOCKS (2026-08-28) — supersedes casting in 6f

**Lexi identity reference is now `/tmp/lexiref/lexi3d.png`** — an 800x640 crop of the approved
v3 BOSS WORD frame, NOT the sticker asset. Using a 3D render of the character as the reference is
what keeps the look consistent; referencing `knight.webp` reintroduces the white keyline.
Preserve this crop — it is the canonical 3D Lexi. Describe it explicitly in every prompt too
(glossy magenta helmet with plume, dark angled brows, pink oval blush, stub limbs, subsurface
white body) so identity survives even if the reference is dropped.

**Casting corrected: an ordinary class.** The 6f cast (box braids + glasses-up, hijab, headphones,
gap-toothed) over-indexed on visible diversity. Replace with a normal classroom, still individually
recognisable and still the SAME children in every shot:

- red-haired boy with freckles (he is the one who turns in beat 5 — the arc carrier)
- girl with a brown ponytail
- boy with short dark hair
- girl with glasses
- taller quiet boy
- small cheerful girl

Character comes from the recurrence and the acting, not from demographic variety.

**Real game UI block, reused verbatim in every screen shot:**

> 6x6 grid of cream rounded letter tiles with black letters on a white rounded panel, a bright
> magenta live leaderboard with ranked player avatars and scores, a glowing cyan countdown ring,
> a lime green score box, deep navy background, word paths tracing in glowing lime green.

Captured from the running app at `http://localhost:3055/en/quick-play` → Classic. Note port 3001
was already occupied by another session, so a free port was used. Raw capture and crops live in
`/tmp/gameui/` (`classic.png`, `grid.png`, `leaderboard.png`).

Generation script: `/tmp/gen_v4.sh`. Beat 6 (THE BOSS WORD) is already approved and reused.

## 6h. Video generation — Seedance 2.5 native multi-shot

Script: `/tmp/make_video.py` (arg = resolution, default `480p`). Re-runnable.

**Native multi-shot, not chained scenes.** One `seedance_2_5` job with `--multi_shots true` and
8 `multi_prompt` entries. One sampling pass means identity, grade and lighting hold across cuts by
construction. Frame-chaining (`--start-image`) was NOT used.

**Minimal reference, deliberately.** Only `/tmp/lexiref/lexi3d.png` (the approved 3D Lexi crop).
Storyboard frames are NOT passed — as style references they would bias toward still-image
composition, and as start-frames they would cap the render at 2k-still quality. The storyboard's
job was approval; the film composes itself.

**Consistency levers** (each necessary, none sufficient alone):
- `GLOBAL STYLE` block in the top-level prompt
- the SAME `STYLE` / `LEXI` / `CAST` wording repeated verbatim in EVERY shot entry — `multi_prompt`
  samples each shot from its own text, so a global-only instruction does not propagate
- the restraint boilerplate (`CALM`) appended to every non-peak shot for the same reason
- `--genre comedy`, `--prompt_language en` (default is `zh`)
- `AUDIO:` section last in the top-level prompt; `generate_audio` defaults true

**Cost, verified:** 30s at 480p = **75cr**, at 720p = **195cr**, at 1080p = 270cr.
Validate at 480p first — motion, comedy timing and cross-shot consistency all resolve at low res.

**Comedy pass.** Restraint alone read as flat. Added specific physical gags that come from Lexi
being tiny, deadly serious and outmatched by his own props, while the kids stay deadpan:
oversized tile-sword he staggers under; climbing a book stack to reach eye level; a tile bonking
his helmet with no reaction; tiny push-ups during the montage; a secret fist-pump that snaps back
to stern. Final beat gains a small button — a hand setting another tile beside the sleeping Lexi.

## 6i. First render — result and diagnosis (2026-08-28)

**Job:** `seedance_2_5`, 6 shots, 30s, 480p, 720x1280, `--genre comedy`, reference =
`/tmp/lexiref/lexi3d.png` only. **75cr.** Output: `/tmp/recruits_480p.mp4` (30.0s, 480x854, audio
present, 4 detected cuts).

**Worked:** character consistency is excellent — identical Lexi across all six shots (helmet,
plume, blush, brows, materials). Native multi-shot did its job. Pixar-grade render, no sticker
outline, real classroom, native audio.

**Failed: the script did not survive.** The model kept the character and dropped the story.

| Written | Rendered |
|---|---|
| Oversized letter-tile "sword" he staggers under | A real metal sword with hilt and leather strap |
| LexiClash grid on tablets and projector | **No game UI in any frame** |
| Climbing a book stack to reach eye level | Absent |
| Training montage → boss word → payoff | Lexi shouting through a megaphone |
| — | Invented chalkboard: "QUIET LISTEN LEARN / SILLY" |

A charming mascot sketch; **not an ad** — the product never appears, which is fatal for the job.

**Diagnosis:** ~200 words per shot across 6 shots in one 30s job = ~5s of screen time each. At
that density Seedance compresses rather than executes, falling back to generic classroom priors.
Full write-up now in `~/.claude/skills/higgsfield-generate/references/seedance-2-5.md`
§ "Dense multi-shot prompts get COMPRESSED, not executed".

The 480p gate worked exactly as designed: 75cr to learn this instead of 195cr. Prompt adherence is
resolution-independent.

**Next approach:** 2 shots per job at 10s, chained with `--start-image`; product beats get an
approved storyboard frame as `--start-image` rather than a text description of the UI.

## 6j. v1 cut review — no stakes, no explanation (2026-08-28)

`/tmp/RECRUITS_final.mp4` (30.2s, 3 segments, 75cr) reviewed. Verdict: **not shippable.**

| Segment | Verdict |
|---|---|
| 1 · line-up | acceptable, not strong |
| 2 · drill | **the best thing in the film** — because it is the only beat with real tension: two hands racing on one board |
| 3 · classroom payoff | unclear and weak — a wide room of arms going up reads as nothing in particular |

**Two structural failures, not craft failures:**

1. **No stakes.** Nobody wins, nobody loses, nothing is at risk. A montage of children being
   pleased is empty. The one moment that worked was a *contest*.
2. **No explanation.** The film never says what LexiClash is or who it is for. A cold viewer
   finishes it knowing nothing. There must be an explicit end card that names the product and
   the offer.

**Corrections for v2:**

- Build the whole film on **head-to-head duel tension**, the thing segment 2 proved works —
  two named kids, one board, a visible score gap, a clock running out.
- **Kill the wide-classroom celebration.** Crowd reactions do not read at 9:16 on a phone. Keep
  the camera on faces, hands and the board.
- **Add a real end card** — product name, one line on what it is, the offer for teachers.
- Give it a **catch**: an underdog who is losing and wins on the last word. Reversal is the
  cheapest stakes-generator available and it survives being watched muted.

## 6k. SHIPPED — "THE LAST WORD" v2 (2026-08-28)

**Deliverable:** `docs/ad-assets/LASTWORD_final.mp4` — 29.2s, 720x1280, AAC.
Build scripts alongside it: `gen_duel.sh`, `endcard.py`, `lexi-3d-reference.png`.

Structure (4 beats, duel + reversal + explanation):

| Time | Beat |
|---|---|
| 0–8 | Challenge — two kids face off, Lexi slams a 0:30 timer |
| 8–16 | The gap — she's at 359, he's stuck at 120, clock ticking |
| 16–24 | The last word — 0:02, one long path, score flips 380–340 |
| 24–29 | End card — product name, one-line explanation, FREE FOR TEACHERS |

### Three failures worth not repeating

**1. Character reference was conditional (my bug).** `gen_duel.sh` attached
`--image lexi3d.png` only inside the `if [ -n "$img" ]` branch, so three of four segments ran with
no identity reference and Seedance rendered a **generic silver knight**. Fixed by attaching the
reference in BOTH branches. Conditional argument-building is where this class of bug lives, and
the output looks plausible enough that only a specific colour check catches it.

**2. A reference is a bias, not a constraint.** Even the referenced job drifted toward metal,
because "knight helmet = silver" is an overwhelming prior. A distinctive detail that fights a
strong prior needs the reference AND an explicit negation:
`BRIGHT MAGENTA PINK … NEVER silver, NEVER grey, NEVER gold, NEVER metal-coloured`.

**3. `ffmpeg -f concat` stretched 29s of source into 40s.** The concat *demuxer* trusts each
file's timestamps and silently stretches the timeline when they disagree. The concat **filter**
re-times explicitly and produced the correct duration — and let the output be full 720x1280
instead of the 480x854 the demuxer path was yielding:

```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
  "[0:v]scale=720:1280,setsar=1,fps=24[v0];[1:v]scale=720:1280,setsar=1,fps=24[v1];\
   [v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" out.mp4
```

Rule: if a joined video's duration is not the sum of its parts, switch demuxer → filter.

**4. The end card failed server-side twice** as a generated clip. Built locally instead —
generated still + `zoompan` push-in + Pillow-rendered text overlay. A static card never needed
motion synthesis, and copy must never be model-generated (Seedance garbles UI text — an earlier
score rendered as `96,32P`).

Spend this round: ~180cr (incl. ~60cr wasted on the drifted set). ~2072cr remaining.

## 6l. v2 review — AI slop, weak ending, no VO (2026-08-28)

Idea and look approved. Three defects:

1. **AI slop in every on-screen UI** — nonsense words on the grid, a fake timer, misspelled labels.
2. **The ending has no point.** It stops rather than concludes.
3. **No narration.** Needs a VO promoting LexiClash Education with a punchline.

### Fix 1 — never let the model render UI. Composite the real app.

Root cause: Seedance is drawing the game screen, and it cannot spell. Attempts to fix this by
prompting harder are wasted — it renders what it knows, not what you specify (already documented
in `seedance-2-5.md`). The screens must be **our actual app, composited in post**:

- capture real UI from the running app (`/tmp/gameui/classic.png` — the Classic screen, 1280x633)
- keyframe it onto the tablet/projector with `ffmpeg overlay`, or generate shots that frame the
  screen out and cut to a clean screen recording
- letters, timer and score are then correct **by construction**

The same rule already applies to copy (`endcard.py`). Extend it: **any text a viewer can read must
be composited, never generated.**

### Fix 2 + 3 — narration carries the point

Verified working TTS: **`text2speech_v2`**, `--model elevenlabs`, `--voice_type preset`,
`--voice_id <uuid from 'higgsfield voices list'>`. **2cr.**

Gotchas: `inworld_text_to_speech` failed with a plain voice name; `--format` is rejected on
elevenlabs (`fields are only supported for model 'minimax'`); voice ids are UUIDs, not names.

Script (7.2s as rendered, voice = Faye `d198dc0b-c4e5-5198-aa1d-ecf5ca0927c4`):

> "Kids won't practice vocabulary. But they will not lose to each other.
> LexiClash for Classrooms — free for teachers."

The punchline is the middle line: competition is the mechanism, and it reframes the whole film as
an argument rather than a montage.

## 6m. End card must be ANIMATED, not a still (2026-08-29)

v3's ending is a generated still + `zoompan` push-in. Verdict: **too passive.** It reads as a
slide, not an ending, and it wastes the mascot at the exact moment the viewer is deciding whether
to act.

**Rule: the end card is a performance beat.** Lexi must DO something that promotes LexiClash
Education, not stand there holding a tile.

Two candidates generated (8s each, 20cr, 480p):

- **A · tile builder** — tiles rain down, Lexi catches/juggles/stacks them into a wall, punches the
  last one in, arms up. The action *is* the product: building words.
- **B · the challenge** — runs in, skids, **points directly at the viewer**, hoists a tile like a
  trophy, bounces waiting. Direct address is the strongest CTA gesture available.

Both keep the upper half of frame clean so `endcard.py` copy overlays without collision. The
locally-composited text layer stays — only the plate changes from still to motion.

Still true: **copy is never model-generated.** Pillow → `ffmpeg overlay`, always.

## 7. Open decisions

1. Concept: "Friday, 2:47 PM" (occasion-led) vs "Lucky Guess" (mechanic-led)
2. Length: 30s (features fit) vs 15s (comedy tighter, features cut)
3. Rendering route (a) / (b) / (c)
4. Whether to ride a named TikTok trend — **unverified**, see §8

---

## 8. Trend research — honest status

Searched for a current (Aug 2026) TikTok trend involving students disrupting the start of class.
**Could not verify one.** TikTok discover pages return navigation only, not trend content.
Real trends that did surface, all classroom-adjacent but none "start of class disruption":
Sit Down Challenge, "Shake Hands With Someone Who", #RockYourBodyChallenge, Welcome Back 2026.

August 2026 US audience skews to authentic storytelling, nostalgia, transformations, humour,
and highly relatable everyday moments.

**Recommendation: do not chase an unverified trend.** Riding a trend we cannot confirm is live
risks landing stale, and a fabricated trend reference is worse than none. Instead make the video
*format* copyable — an ownable classroom bit other classes can reproduce (see the "spell-off
callout" beat), which is how trends start rather than how they are borrowed.
