---
name: game-mode-trailer-storyboard
description: |
  Turns a LexiClash game mode into a shot-by-shot storyboard for a Pixar/Disney-trailer-style
  vertical ad, with ready-to-paste Higgsfield prompts, a real-capture list, and a continuity chain.
  This skill should be used when asked to storyboard, board, or plan an advert, trailer, teaser,
  promo, or Reel/TikTok/Shorts video for a game mode or feature — before any rendering happens.
  It produces a document, never renders. Hand the finished board to `cinematic-trailer-video`
  for Phase 1–6 production (keyframes, clips, ffmpeg assembly, QA).
---

# Game Mode Trailer Storyboard

Produces one deliverable: a storyboard document that a renderer can execute without further
creative decisions. Every shot carries its own model, aspect, duration, camera move, prompt text,
and continuity anchor.

## Boundaries

- **Never generate images, video, or audio while boarding.** Generation spends credits and is a
  separate, explicitly-triggered step. Output prompts; stop there.
- **Never invent a mechanic.** Read the mode's source before writing a single shot. A board that
  shows gameplay the engine does not produce is worse than no board.
- **Never board a shot the renderer cannot make.** Shot count is derived from clip-length limits,
  not chosen for taste. See step 3.

## Step 1 — Ground the mode in source

Read the actual implementation before boarding. Extract and write down:

| What | Why it matters to the board |
|---|---|
| Core input loop | Determines the "hands on screen" shot |
| The signature verb | The one action the ad must show — the mode's whole pitch |
| Failure / antagonist mechanic | This is the story's obstacle. Without it there is no arc. |
| Progression / biome / color states | This is the color script. Do not invent one. |
| Reward moment | The payoff beat |
| Mascot states available | `public/mascots/styles/<variant>.webp` — board only variants that exist |
| Release gate | If flag-gated, real screen capture may be admin-only. Flag it. |

Prefer dispatching an Explore agent for this; it is a multi-file read.

## Step 2 — Map the mode onto the Pixar Story Spine

Load `references/pixar-to-brand.md`.

Fit the mode to the seven-beat spine (Once upon a time / And every day / Until one day /
And because of that ×2 / Until finally / And ever since). The mode's antagonist mechanic supplies
"Until one day". If no obstacle can be found in the mode, the ad has no story and should be
re-scoped as a gameplay demo instead — say so rather than faking a conflict.

Rules that carry from Pixar shorts into a 20-second ad:

- **No dialogue.** Expression, music, and staging carry the emotion. Removes lip-sync risk entirely.
- **The character wants something and something is in the way.** State the want in one sentence at
  the top of the board. If it cannot be stated in one sentence, the board is not ready.
- **Anticipation before every major action.** A wind-up sells the impact more than the impact does.
- **End on a button** — a silent sight gag or unexpected beat after the emotional peak.

## Step 3 — Derive the shot count from renderer limits

Do not hardcode model capabilities; they change. Query them:

```
models_explore(action:"recommend", type:"video", input:"image", query:"<the look wanted>")
models_explore(action:"get", model_id:"<top result>")
presets_show()
```

Then compute:

```
shot_count = target_duration / clip_length
```

Bound `clip_length` at **3–5s** regardless of the model's maximum. AI character identity drifts
independently on every shot; longer clips drift more. Prefer more short shots over fewer long ones —
this also matches trailer cut cadence, so the constraint and the craft agree.

Prefer a model that accepts **both a start and an end image**. That is what makes step 5 possible.

## Step 4 — Resolve the aesthetic collision

Read `references/pixar-to-brand.md` § Collision.

A literal Pixar render (soft gradients, subsurface skin, volumetric haze) directly violates the
LexiClash anti-references in `CLAUDE.md`. The resolution is fixed and should not be re-litigated
per project:

> **Borrow Pixar's story structure, staging, timing, and emotional pacing.
> Render it in Neo-Brutalist language. The kawaii mascot is the bridge.**

Every prompt therefore carries the brand lock: hard shadows, no blur, solid black borders,
flat electric color, Fredoka display type. Never the words "cinematic lighting", "volumetric",
"photorealistic", or "soft gradient".

## Step 5 — Chain continuity

AI video models have **zero memory between clips**. Continuity is manufactured, not inherited.

- Generate a locked **keyframe still** per shot first, then image-to-video from it.
- Seed shot N+1's start image with shot N's **end frame** wherever the cut is continuous.
- Mark each row `CONTINUOUS` (seeded from previous) or `HARD CUT` (fresh keyframe). A hard cut is
  a legitimate choice — it just must be deliberate, and it resets the continuity chain.
- Re-state the full character description in every prompt. Never write "the same character as before".

## Step 6 — Split AI shots from real-capture shots

An all-AI ad with zero real product reads as bait and converts badly. Mark every row as:

- **AI** — generated
- **CAPTURE** — real screen recording, with the exact route, state and device to record

If the mode is flag-gated, capture shots cannot be sourced by an agent. Emit them as an explicit
**capture list** addressed to the user, naming the flag or URL override needed.

## Step 7 — Write the board

Load `references/reels-delivery.md` for platform specs and safe zones.

Required document sections:

1. **Logline** — one sentence: who wants what, and what is in the way
2. **Spec block** — canvas, fps, duration, shot count, models, brand lock, safe zones
3. **Beat map** — the seven spine beats against timecode
4. **Shot table** — one row per shot, columns:
   `# · t · beat · AI/CAPTURE · duration · camera move (preset) · what happens · on-screen text · continuity`
5. **Per-shot prompt blocks** — the keyframe prompt and the motion prompt, verbatim, ready to paste,
   each stating model + aspect + duration
6. **Capture list** — routes and states the user must record
7. **Audio bed** — music arc and the two or three SFX that matter (see `sound-design-film` for depth)
8. **On-screen text plan** — every string, with its safe-zone position
9. **QA checklist** — the board's own acceptance criteria

## Step 8 — QA the board before declaring it done

- [ ] Hook lands in under 3 seconds, readable **sound-off**, with motion in frame 1
- [ ] Every mechanic shown exists in source — cite `file:line` for each
- [ ] All text inside the center safe zone
- [ ] Product (real UI) appears at least once
- [ ] Shot durations sum to target; none exceeds 5s
- [ ] Continuity column is complete — no shot silently assumes memory
- [ ] Prompts contain the brand lock and no forbidden aesthetic words
- [ ] Colors cited from source constants, not invented
- [ ] A button beat exists after the peak
- [ ] CTA placed at peak engagement, not after it
- [ ] Zero generation performed

## Handoff

The finished board is the input to `cinematic-trailer-video` (character canon → keyframes → clips →
connectors → ffmpeg assembly → QA → distribution). Use `cinematography` for shot-language wording,
`filmmaker` for animation-principle notes, `sound-design-film` for the audio bed, and
`higgsfield-generate` when the user explicitly asks to render.

Write the board to `docs/marketing/<mode>-<platform>-storyboard.md`. A storyboard that exists only
in chat is not a deliverable.

**Worked example — read this for the output shape before writing a new board:**
`docs/marketing/word-tower-reels-storyboard.md` (Word Tower, 24s Reels, 8 shots). It shows the
shot-table columns, the keyframe/motion prompt pairing, the continuity notation, the capture list,
and — usefully — an inline note recording a mechanic the first draft got wrong and how review
caught it.
