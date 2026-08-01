# Pixar craft → LexiClash brand

## The Story Spine (Emma Coats, Pixar, 2011)

```
Once upon a time…
And every day…
Until one day…
And because of that…
And because of that…
Until finally…
And ever since that day…
```

Rule #19 states the engine underneath it:

> **A character wants an OBJECTIVE because of STAKES, but OBSTACLES get in the way.**

For a game-mode ad, the mapping is reliable:

| Spine beat | Game-mode equivalent |
|---|---|
| Once upon a time | The mascot, the empty starting state |
| And every day | The core loop — the signature verb, repeated |
| Until one day | The mode's antagonist mechanic (failure state, rival, timer, instability) |
| Because of that ×2 | Escalation — bigger stakes, bigger play |
| Until finally | The reward moment the engine actually pays out |
| Ever since that day | The retention hook (daily seed, streak, carry-over) |

If the mode has no antagonist mechanic, it has no story. Re-scope to a gameplay demo rather than
inventing a conflict the player will never meet.

## Teaser trailer act structure

- **Cold open** — attention with minimal context. No setup required, sparse percussive audio.
- **Introduction** (~15–25%) — establish world, pose the question.
- **Escalation** (~25–40%) — conflict enters, urgency rises, title card lands here.
- **Climax montage** (~40–90%) — rapid cuts, no dialogue, the best visuals, then the button.

Energy must modulate. Uniformly high energy reads as flat — the dips are what make the peaks
register as peaks.

## What makes silent Pixar shorts work

*Piper*, *Lava*, *For the Birds* run under six minutes with no dialogue and land emotionally through:

- **Facial expression and behavior** rather than words
- **Music as the emotional spine**, not decoration
- **Anticipation** — a visible wind-up before every significant action
- **Squash and stretch** for weight and impact
- **Appeal** — the character is pleasant to look at even while failing
- **The button** — a final unexpected sight gag with no buildup

A vertical ad is watched sound-off first. Silent-short craft is therefore not a stylistic choice
here; it is the correct engineering for the medium.

## Collision — and its fixed resolution

LexiClash's `CLAUDE.md` anti-references explicitly forbid:

> Generic mobile game UI, **soft gradients**, glassmorphism, corporate aesthetics

Literal Pixar rendering *is* soft gradients, subsurface scattering, and volumetric haze. A faithful
Pixar look would violate the brand it is meant to sell.

**Resolution — do not re-litigate per project:**

> Borrow Pixar's **story structure, staging, comic timing, and emotional pacing**.
> Render it in **Neo-Brutalist** language.
> The **kawaii marshmallow mascot is the bridge** — it satisfies Pixar "appeal" and brand
> "personality everywhere" simultaneously.

### Brand lock — append to every image and video prompt

```
Neo-brutalist 3D animation. Flat electric colors, hard-edged pixel shadows with zero blur,
solid 3px black outlines on every object. Chunky rounded geometry. Dark navy background.
Bold Fredoka-style display lettering. Toy-like, tactile, physical weight.
NOT photorealistic. NO soft gradients, NO volumetric haze, NO lens flare, NO glassmorphism,
NO depth-of-field blur.
```

### Forbidden prompt vocabulary

`cinematic lighting` · `volumetric` · `photorealistic` · `soft gradient` · `bokeh` ·
`ethereal glow` · `hyperrealistic` · `octane render`

### Brand palette (source of truth: `fe-next/components/wordTower/biomeTheme.ts`)

| Token | Hex |
|---|---|
| Lime (primary) | `#BFFF00` |
| Cyan (solo) | `#00FFFF` |
| Purple (brain) | `#8B5CF6` |
| Pink (multiplayer) | `#FF1493` |
| Gold | `#FFE135` |

Cite colors from source constants. Never invent a palette.

## Comedy — required, not decorative

A brand described as "quirky, electric, loud" cannot ship an earnest ad. Comedy is the brand
obligation. Three mechanisms, all silent, all Pixar-native:

**1. The cold-open disaster.** Open at the worst moment with zero setup, then rewind. The audience
spends the first three seconds asking *what happened*, which is exactly the retention question a
hook is supposed to plant. This satisfies "unexpected" and "strong hook" in one move.

**2. The competence gag.** The character does the right thing badly, or the wrong thing with total
conviction. In word games the reliable version is **scale mismatch**: a trivially short word yields
a comically undersized reward, played completely straight. Never wink at it — the humor lives in
the character's sincerity.

**3. The button.** After the emotional peak, one final unexpected beat, silent, with no buildup.
It should undercut the triumph slightly rather than reinforce it. A tiny threat after a huge
victory is funnier than another huge threat.

**Timing rules that make silent gags land:**

- Anticipation, action, **then a held reaction**. The reaction shot is the joke; the action is only
  the setup. Boards that cut away before the reaction have no gag.
- Hold a beat of stillness before the punchline. Comedy needs the pause; ads usually cut it.
- One gag per shot. Two compete and both die.
- The mascot's face carries it — board expression states explicitly, by asset variant name.

## Animation principles worth naming in prompts

Naming a principle in a prompt is more reliable than describing its result:

- **Anticipation** — "winds up before"
- **Squash and stretch** — "squashes on impact, springs back"
- **Overlapping action** — "settles a beat after the main motion stops"
- **Staging** — "silhouette reads clearly against the background"
- **Slow in / slow out** — "eases into and out of the move"
