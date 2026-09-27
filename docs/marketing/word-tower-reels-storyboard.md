# Word Tower — Instagram Reels Ad Storyboard

**Title:** "SO… HOW DID WE GET HERE?"
**Mode:** Word Tower (LexiClash) · **Platform:** Instagram Reels (also cuts for TikTok / Shorts)
**Runtime:** 24s · 8 shots × 3s · **Status:** board only — nothing rendered

---

## 1. Logline

> Lexi wants to build a word tower to the stars — but gravity, a swaying tower, and a rival with a
> wrecking ball keep taking it down.

**Want:** reach the galaxy. **Obstacle:** the higher it goes, the more it sways — and other players
can smash it. **Tone:** deadpan slapstick. No dialogue.

## 2. Spec block

| Field | Value |
|---|---|
| Canvas | 1080 × 1920, 9:16, 30 fps |
| Duration | 24s (inside the 15–30s performance band) |
| Shot length | 3s — bounded well under `kling3_0`'s 15s max to limit identity drift |
| Video model | `kling3_0` — 9:16, 3–15s, accepts **start _and_ end image**, 4K, audio on/off |
| Keyframe model | `soul_cast` (identity preservation) → fallback `recraft_v4_1` (native 9:16) |
| Dialogue | **None.** Music + SFX only. Removes lip-sync risk entirely. |
| Safe zone | All text between **14%** and **65%** of frame height, 6% side margins |
| AI : capture | 7 AI shots : 1 real-capture shot |

**Renderer wiring (verified via `models_explore`):**

- `kling3_0` takes both frames through a single **`medias`** parameter, with roles
  `start_image` and `end_image` — this is what makes the continuity chain in §4 possible.
- Higgsfield's named **camera presets are not used here.** They belong to a separate
  `higgsfield_preset` model (`generate_video`, param `preset_id`) that accepts **one** image only,
  so it cannot do end-frame chaining. Camera movement is therefore written as prose in each motion
  prompt instead. Preset names could not be enumerated this session (tool output was truncated);
  re-run `presets_show()` if a preset-driven variant is ever wanted.

**Brand lock — append verbatim to every prompt:**

```
Neo-brutalist 3D animation. Flat electric colors, hard-edged pixel shadows with zero blur,
solid 3px black outlines on every object. Chunky rounded geometry. Dark navy background.
Toy-like, tactile, physical weight.
NOT photorealistic. NO soft gradients, NO volumetric haze, NO lens flare, NO glassmorphism,
NO depth-of-field blur.
```

**Character lock — restate in full in every prompt (models have no cross-clip memory):**

```
Lexi: a small chunky marshmallow-cube character. Soft rounded cube body in matte cream-white,
large expressive black oval eyes, small rosy cheek blush, stubby arms and legs.
Wears a tiny lime-yellow construction hard hat. Solid 3px black outline. Flat toy shading.
```

Mascot mood references (real assets, `components/ui/mascotData.ts:12-31`):
`panic` · `bored` · `mindblown` · `rage` · `celebration` · `winner` · `oops`

**Color script — from `fe-next/components/wordTower/biomeTheme.ts:69-154`, not invented:**

| Biome | Altitude | Block hex |
|---|---|---|
| City | 0–50m | Lime `#BFFF00` |
| Sky | 50–150m | Cyan `#00FFFF` |
| Stratosphere | 150–300m | Purple `#8B5CF6` |
| Orbit | 300–500m | Cyan `#00FFFF` |
| Nebula | 500–800m | Hot pink `#FF1493` |
| Galaxy | 800m+ | Gold `#FFE135` |

## 3. Beat map — Pixar Story Spine against timecode

| Spine beat | Shot | t |
|---|---|---|
| *(cold open — disaster, no context)* | S1 | 0:00 |
| Once upon a time… | S2 | 0:03 |
| And every day… | S3 | 0:06 |
| And because of that… | S4 (capture) | 0:09 |
| And because of that… | S5 | 0:12 |
| Until one day… | S6 | 0:15 |
| Until finally… | S7 | 0:18 |
| *(button — the gag that undercuts it)* | S8 | 0:21 |

The cold open **is** S6's moment, shown first. The audience spends 15 seconds not knowing what they
saw, then catches up — that unanswered question is the retention engine.

## 4. Shot table

| # | t | Beat | Src | Camera | What happens | On-screen text | Continuity |
|---|---|---|---|---|---|---|---|
| S1 | 0:00 | Cold open | AI | Crash zoom → freeze | Colossal word-tower in pink nebula. A wrecking ball smashes through it. Blocks burst into loose letters. Lexi tumbles mid-air, **panic**. Freeze on his face. | `so… how did we get here?` | HARD CUT (chain start) |
| S2 | 0:03 | Once upon a time | AI | Fast vertical descent | Rewind whoosh — letters suck back, tower rebuilds, camera plummets down through gold→pink→cyan→purple→lime and lands on empty lime ground. Lexi lands, dusts off hat. | `12 hours earlier` | HARD CUT |
| S3 | 0:06 | Every day | AI | Locked medium → push-in | Lexi taps the 7-letter wheel. Spells **C-A-T**. The crane swings in carrying a pathetically stubby 3-tile girder. It lands. Height meter ticks up by almost nothing. Lexi stares, **bored**. Held beat. | `+2.0m` (tiny) | CONTINUOUS ← S2 end |
| S4 | 0:09 | Because of that | **CAPTURE** | Screen record | Real UI: same wheel, a **7-letter** word traced. Crane swings a full-length girder — visibly huge next to S3's stub. Drop, **PERFECT** band. Height meter *jumps*. | *(native HUD)* | HARD CUT |
| S5 | 0:12 | Because of that | AI | Vertical crane-up, speed ramp | Tower rockets upward. Camera rides it through all six biomes, blocks changing lime→cyan→purple→cyan→pink→gold. Lexi clings to the top, **mindblown**. | `every word = one floor` | HARD CUT |
| S6 | 0:15 | Until one day | AI | Whip pan → impact shake | Now in the nebula — we recognise S1. A rival's wrecking ball swings in. Lexi turns, sees it, face drops to **rage**. Ball connects. Floors shear off. | `…then Dave wrecked it` | HARD CUT |
| S7 | 0:18 | Until finally | AI | Low-angle hero push-up | Lexi rebuilds in a fury, blocks slamming in. Tower punches into the gold galaxy. He plants a tiny flag, **celebration**. Stars everywhere. | `WORD TOWER` + CTA | CONTINUOUS ← S6 end |
| S8 | 0:21 | Button | AI | Locked wide, dead still | Silence. A ridiculously tiny wrecking ball drifts in and goes *tink* against the base. One block wobbles. Lexi's eye twitches, **oops**. Cut to black. | Logo + `LexiClash` | CONTINUOUS ← S7 end |

**Three gags, one per mechanism:** S1 cold-open disaster · S3 competence gag (scale mismatch, played
straight) · S8 button (tiny threat after huge victory).

## 5. Per-shot prompts

Every block below is paste-ready. Prepend the **character lock**, append the **brand lock**.
Generate the keyframe first, then image-to-video from it.

---

### S1 — Cold open · 0:00–0:03 · AI

**Keyframe** — `soul_cast`, 9:16
```
Extreme wide shot, deep space. A colossal tower built from stacked rectangular word-blocks
glowing hot pink #FF1493, receding into a magenta nebula full of hard-edged stars.
A heavy black wrecking ball is mid-impact through the tower's middle, blocks bursting apart
into loose 3D letters flying outward. Lexi tumbles through the air among the letters,
arms flailing, mouth wide open in panic, hard hat flying off.
Dramatic low angle looking up. Dark navy background.
```

**Motion** — `kling3_0`, 9:16, 3s, start = keyframe
```
Fast crash zoom pushing in toward Lexi's panicked face as debris and letters fly past camera
in slow motion. Lexi's body squashes and stretches as he tumbles. The motion decelerates hard
and locks into a complete freeze on his face in the final 0.5 seconds. Camera shake on impact.
```

> **Hook check:** frame 1 is already mid-explosion. Reads sound-off. No setup required.

---

### S2 — Once upon a time · 0:03–0:06 · AI

**Keyframe** — `soul_cast`, 9:16
```
Wide shot, ground level. Lexi stands alone on flat lime-green #BFFF00 ground under a bright
sky-blue gradient-free background. Empty construction site. A tall yellow tower crane with a
horizontal jib arm stands behind him, hook hanging empty. Lexi is straightening his tiny
lime-yellow hard hat, looking up and off-screen. Small, hopeful, determined.
```

**Motion** — `kling3_0`, 9:16, 3s, end = keyframe
```
Camera plummets vertically downward at high speed past a rebuilding tower, blocks snapping back
into place beneath it, colors flashing gold to pink to cyan to purple to lime as it descends.
The fall decelerates smoothly and settles into a locked wide shot of Lexi on the ground.
Reverse-motion feel, like time rewinding. Slow out on the landing.
```

---

### S3 — Every day (competence gag) · 0:06–0:09 · AI

**Keyframe** — `soul_cast`, 9:16, seed with S2's end frame
```
Medium shot. A huge yellow tower crane looms overhead, its cable dangling a pathetically short
girder made of only three lime-green #BFFF00 letter tiles reading "CAT" in bold chunky lettering.
The girder is absurdly small compared to the enormous crane holding it.
Lexi stands below on the lime ground looking flatly up at it, deadpan, unimpressed,
arms hanging at his sides. To one side floats a ring of seven letter tiles.
```

**Motion** — `kling3_0`, 9:16, 3s, start = keyframe
```
The crane cable lowers the stubby three-tile girder the last few inches onto the ground.
It lands with a small bounce and settles. Lexi's head turns slowly to look at it, then tilts.
He holds completely still for a long beat, blinking once.
Locked-off camera, very slight push in. No other movement.
```

> **Mechanically accurate:** the girder beam length scales with word length
> (`WordTowerCrane.tsx:134`), so a 3-letter word really does swing a stubby beam. The *floor* it
> makes is normal-sized — the joke is the **crane effort vs. the word**, plus the height payout:
> 3 letters = 2.0m + **0** bonus, versus 7 letters = 2.0m + **5m** (`wordTowerConstants.ts:33-46`).
> S4 is the visual answer to this shot — setup and payoff rhyme mechanically, not just tonally.
>
> The held stillness **is** the joke. Do not cut before the blink.

---

### S4 — Real gameplay · 0:09–0:12 · **CAPTURE, not AI**

See § 6. No prompt — this is a screen recording.

---

### S5 — Escalation · 0:12–0:15 · AI

**Keyframe** — `soul_cast`, 9:16
```
Extreme low angle looking straight up a towering stack of word-blocks that changes color as it
rises: lime #BFFF00 at the base, then cyan #00FFFF, purple #8B5CF6, cyan again, hot pink #FF1493,
gold #FFE135 at the top. Each block has a word printed on it in bold chunky lettering.
Lexi clings to the very top block, eyes enormous and sparkling, mouth open in amazement,
hard hat askew. Sky darkens from bright blue at the bottom to deep navy starfield at the top.
```

**Motion** — `kling3_0`, 9:16, 3s, start = keyframe
```
Camera rides rapidly upward alongside the tower as new blocks slam into place beneath it,
each one changing color as the altitude increases. Speed ramps faster through the middle then
eases out at the top. The tower sways gently side to side. Lexi holds on, hair and hat
overlapping the motion, settling a beat after the tower stops.
```

---

### S6 — Until one day · 0:15–0:18 · AI

**Keyframe** — `soul_cast`, 9:16
```
Medium-wide shot high in a magenta nebula. Lexi stands on top of his hot pink #FF1493 word-tower.
Entering from the right edge of frame is a heavy black wrecking ball on a thick chain, mid-swing.
Lexi has turned toward it, face contorted in furious outrage, tiny fists clenched,
hard hat tipped back. Hard-edged stars in a dark navy background.
```

**Motion** — `kling3_0`, 9:16, 3s, start = keyframe
```
Whip pan right following the wrecking ball as it swings in, then hard impact into the tower.
Violent camera shake on contact. Blocks shear away and tumble out of frame.
Lexi's body squashes on the shockwave and springs back. His expression stays locked in rage
throughout. Debris overlaps and settles after the main motion stops.
```

> **Product claim is true, timing is compressed.** Raids are real player-vs-player — a leaderboard
> rival enqueues a wreck, damage is server-computed from height lead + their aim accuracy, and the
> defender gets a named notification (`api/word-tower/wreck/route.ts:19,115,149`). But it is
> **async**: nobody watches it land live. Past-tense text (`…then Dave wrecked it`) keeps the claim
> honest while the visual stays compressed. Do not add copy implying real-time PvP.

---

### S7 — Until finally · 0:18–0:21 · AI

**Keyframe** — `soul_cast`, 9:16, seed with S6's end frame
```
Heroic low angle. A rebuilt tower of gold #FFE135 word-blocks punches up through a dense golden
galaxy of hard-edged stars. Lexi stands triumphantly on the summit, both arms thrown up,
eyes squeezed shut in joy, wide open smile, planting a tiny lime-green flag into the top block.
Deep navy background, gold light. Bold chunky lettering on every block.
```

**Motion** — `kling3_0`, 9:16, 3s, start = keyframe
```
Camera pushes upward and slightly around the tower in a slow heroic rise as the last blocks
slam into place. Lexi drives the flag down and throws his arms up, body squashing then
stretching tall. Stars streak past. The move eases out and holds on the summit.
```

---

### S8 — Button · 0:21–0:24 · AI

**Keyframe** — `soul_cast`, 9:16, seed with S7's end frame
```
Wide shot of the full gold #FFE135 tower against a starfield, Lexi small at the top with his
flag. At the very bottom of frame, an absurdly tiny black wrecking ball — no bigger than a
marble — hangs on a thin chain beside the tower's base block. Dark navy background.
```

**Motion** — `kling3_0`, 9:16, 3s, start = keyframe
```
Completely locked-off camera, no movement. The tiny wrecking ball swings once and taps the base
block. One block wobbles slightly. A long beat of total stillness. Then Lexi's eye twitches and
his smile drops. Hard cut to black on the final frame. No camera motion at any point.
```

> Locked camera and silence are load-bearing. Any camera move kills the gag.

---

## 6. Capture list — for the user, not an agent

**Word Tower is flag-gated.** `useWordTowerEnabled.ts:13` — PostHog flag `word-tower`; admins
bypass, others need `?word-tower=1`. An agent cannot source these; record them manually.

| Need | How |
|---|---|
| **S4 hero clip** | Open Word Tower with `?word-tower=1`. Record portrait, 1080×1920, 60fps. Trace a **6+ letter** word on the wheel → Hold → let the crane swing → Drop timed for a **PERFECT** band. Capture the height meter jumping. ~4s of usable footage. |
| Biome b-roll *(optional)* | Any run above 150m — real purple/pink block colors, useful if AI biome colors drift. |
| Wreck minigame *(optional)* | The tap-to-aim wrecking-ball swing, as a possible S6 insert. |

Record clean — no debug overlays, no dev toolbar, device frame off.

## 7. Audio bed

No dialogue anywhere.

| t | Music | SFX |
|---|---|---|
| 0:00–0:03 | Hard downbeat, then abrupt cut to silence on the freeze | Crash, debris, glass-less rubble |
| 0:03–0:06 | Rewind riser | Tape-rewind whoosh, landing thud |
| 0:06–0:09 | Music drops out almost entirely | Tiny *tink*. Then **silence** under the held beat |
| 0:09–0:12 | Playful pluck theme enters | Native UI: tile taps, crane creak, block *thunk* |
| 0:12–0:15 | Build — rising arpeggio, tempo climbing | Whoosh per block, wind rising |
| 0:15–0:18 | Record-scratch stop → menace | Chain creak, **impact boom**, tumbling blocks |
| 0:18–0:21 | Full triumphant payoff, brass | Blocks slamming, flag plant, sparkle |
| 0:21–0:24 | Cut to **silence** | One tiny *tink*. Nothing else. |

Per `sound-design-film` (Law of Two and a Half): never more than ~2 tracked sounds at once. The two
silences (0:07, 0:22) are the comedy — protect them in the mix.

## 8. On-screen text plan

All inside the safe band (14%–65% of height). Heavy display face, solid black outline.

| t | Text | Position | Hold |
|---|---|---|---|
| 0:01 | `so… how did we get here?` | center, 45% | 2.0s |
| 0:03 | `12 hours earlier` | center, 50%, small | 1.5s |
| 0:12 | `every word = one floor` | center, 30% | 2.0s |
| 0:15 | `…then Dave wrecked it` | center, 35% | 2.0s |
| 0:18 | `WORD TOWER` (large) + `build it in LexiClash` | center, 30% / 42% | 3.0s |
| 0:22 | LexiClash logo | center, 45% | 2.0s |

**Composite text in post (ffmpeg), do not bake into the plate.** AI lettering is the single most
common failure mode, and a Hebrew RTL cut needs the plate clean.

**CTA at 0:18** — on the payoff, not after it. End-card-only CTAs underperform.

## 9. QA checklist

- [x] Hook lands <3s, motion in frame 1, readable sound-off
- [x] Every mechanic exists in source — wheel (`useWordTower.ts:70-90`), crane drop
      (`WordTowerCrane.tsx:156-200`), **girder length scales with word length**
      (`WordTowerCrane.tsx:134`), height payout 3→0m / 7→+5m (`wordTowerConstants.ts:33-46`),
      sway (`towerSway.ts`), **async** PvP wreck (`api/word-tower/wreck/route.ts:19,115,149`),
      biome colors (`biomeTheme.ts:69-154`)
      <br>*Corrected after review: S3 originally boarded an undersized **block**, which the engine
      never produces — a 3-letter word makes a normal floor worth 2.0m. Re-boarded as the **girder**
      gag, which is real.*
- [x] All text within center safe zone
- [x] Real product UI appears (S4)
- [x] 8 × 3s = 24s; no shot over 5s
- [x] Continuity column complete; hard cuts deliberate
- [x] Brand lock in every prompt; no forbidden aesthetic words
- [x] Colors cited from source constants
- [x] Button beat present (S8)
- [x] CTA at peak engagement (S7)
- [x] **Zero generation performed**

## 10. Localization note

5 locales, Hebrew RTL. Keep plates text-free so each locale composites its own. `…then Dave showed
up` is idiomatic English — needs a **transcreated** equivalent per locale, not a literal
translation. Route through `fe-next:ux-writer`.

## 11. Next step

Hand this board to **`cinematic-trailer-video`** for Phase 1–6: character canon → keyframes →
clips → connectors → ffmpeg assembly → QA → distribution.

Rendering spends credits and has not been started.
