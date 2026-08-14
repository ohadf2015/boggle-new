# Word Tower — "THE INSPECTION"

**Second film. New story, new antagonist, 3D Pixar treatment.**
Platform: Instagram Reels / TikTok / Shorts · **30s** · 10 shots × 3s · 9:16 1080×1920 · no dialogue (narrator only)
Status: **RENDERED** → `word-tower-inspection-film/word-tower-the-inspection-v1.mp4` (24.98s, 8 of 10 shots + real gameplay end card). See that folder's README for the shipped cut, the traps hit, and the posting kit.

---

## 1. Logline

> Lexi's 800-metre word tower is magnificent. It is also held up entirely by the word **CAT**.
> Today, someone has come to inspect it.

**Want:** approval. **Obstacle:** the tower is structurally a lie. **Turn:** he gets approved anyway.
**Button:** the inspector leaves — carrying the foundation.

---

## 2. Why this story beats the first one

| | Film 1 — "So… how did we get here?" | Film 2 — "The Inspection" |
|---|---|---|
| Antagonist | Dave — never on screen, a swinging ball | **The Inspector** — a face, on screen, with an agenda |
| Comedy engine | Lexi is unbothered | Lexi is **desperately bothered and hiding it** |
| Turn | none — he rebuilds, he wins | **real reversal** — the tower is a fraud, and it passes |
| Button | he threatens revenge | **the approval destroys him** |
| Craft unused | shape language, two-hander reactions | both, load-bearing |

Lexi playing *panic-concealed-as-composure* is a richer register than pure deadpan, and it needs a
second character to bounce off. The joke now lives in the **gap between two faces** — the thing a
one-character film structurally cannot do.

---

## 3. Shape language (the core visual idea)

Pixar's oldest character rule: **round reads warm and safe, angular reads sharp and threatening.**

- **Lexi** — soft rounded cube, squashy, warm cream and pink, everything curved. Unchanged.
- **THE INSPECTOR** — a tall, narrow, *hard-edged rectangular* character. Perfectly straight lines,
  crisp corners, no squash. Slate-grey and cold cyan. Rectangular glasses. A clipboard held like a
  weapon. A hard hat sitting *perfectly level* — a small, awful detail.
  He is never cruel and never raises his voice. He is simply **correct**, which is worse.

Two silhouettes that read instantly at thumbnail size, and the contrast *is* the premise.

---

## 4. Style — 3D Pixar, with a flag

Requested treatment: full 3D animated feature look. **This deliberately departs from
`CLAUDE.md`'s anti-references** ("soft gradients", flat neo-brutalism) — noted so it's a choice, not
an accident. Brand identity is retained via **palette and character**, not rendering style:
biome hexes stay exact (`biomeTheme.ts:69-154`), Lexi's design stays canon.

**Style block — append to every prompt:**

```
Pixar-quality 3D animated feature film still. Physically-based rendering, soft cinematic key light
with warm bounce, gentle rim light separating the character from the background, volumetric god
rays and floating dust motes, shallow depth of field with creamy bokeh, subsurface scattering on
the marshmallow character so he glows softly at the edges, glossy specular highlights on the
blocks, subtle ambient occlusion, high-detail micro-texture, crisp 4K render, cinematic colour
grade. Warm, tactile, charming. NOT flat vector, NOT 2D, NOT cel shaded, NO outlines.
```

**Character lock — restate in full every prompt:**

```
LEXI: a small chunky marshmallow-cube character rendered in 3D. Soft rounded cube body in matte
cream-white with pastel pink side faces, subsurface scattering giving him a soft translucent glow.
Large round glossy black eyes with bright catchlights, thin expressive dark eyebrows, soft pink
blush on the cheeks, tiny mouth. Two stubby rounded legs, small rounded arms. Nothing on his head
except the prop named for this shot. Warm, squashy, huggable.

THE INSPECTOR: a tall narrow HARD-EDGED RECTANGULAR character, all straight lines and crisp
corners, matte slate-grey with cold cyan trim. Small rectangular glasses. Immaculate. A hard hat
sitting perfectly level on his flat head. Carries a clipboard. Rigid, precise, never expressive.
He is exactly as tall as Lexi is wide. Cold, clinical, entirely reasonable.
```

**Juice checklist (every shot):** volumetric light shafts · dust motes in the beams · depth of
field · rim light · particle debris · subtle camera shake on impacts · cloth sim on Lexi's hi-vis
vest · specular glints on block edges.

---

## 5. Shot table

| # | t | Beat | Camera | What happens | Prop | Sound |
|---|---|---|---|---|---|---|
| S1 | 0:00 | **hook · SLOW MOTION** | slow push, low angle | Lexi mid-snack on the lime ground. A long **sharp-edged shadow** slides across him. His snack tumbles from his hand in slow motion. He looks up, eyes huge. We never see what casts it. | snack | low ominous swell, snack hits dirt |
| S2 | 0:03 | **the reveal** | heroic low angle, cold rim light | THE INSPECTOR. Rectangular, immaculate, backlit, clipboard raised. Dust drifting through god rays. Treated exactly like a villain entrance. | clipboard | single cold sting, pen click |
| S3 | 0:06 | **the pride** | vast crane-up | The tower in full glory — 800m of word blocks climbing through cloud layers into gold light. Lexi gestures at it, beaming, hi-vis vest, tiny bow tie. | vest + bow tie | soaring wind, birds |
| S4 | 0:09 | **the tap** | extreme macro | The inspector's pen extends. **Taps** one block. Almost nothing. A single dust particle falls. | pen | one small dry *tik* |
| S5 | 0:12 | **the sway** | wide, violent shake | The **entire 800m tower** lurches. Lexi lunges out of frame and back, steadying it with **one finger**, grinning innocently, sweating hard. | — | deep groan, timber stress, silence |
| S6 | 0:15 | **the descent** | tracking down, split focus | The inspector descends, ticking boxes, utterly unbothered — while **behind him** a block pops out and Lexi frantically shoves it back. Classic split-attention gag. | clipboard | ticking pen, muffled chaos |
| S7 | 0:18 | **the foundation** | macro push-in, dramatic | He reaches the base. Reveal: the entire tower rests on **one tiny 3-letter block: `CAT`**. Dust. Held silence. | — | everything drops out |
| S8 | 0:21 | **the verdict** | two-shot, held | Long hold. Inspector's blank face. Lexi frozen mid-cringe. Then — **STAMP.** `APPROVED`. Lexi collapses in relief, boneless. | stamp | huge stamp THUD, relief exhale |
| S9 | 0:24 | **title** | slow rise | `WORD TOWER` forms in gold light on the tower face. Full glory shot. CTA. | — | triumphant swell |
| S10 | 0:27 | **BUTTON** | locked wide, dead still | The inspector walks away — and he is **carrying the CAT block**. Beat. Lexi's eyes go wide. One long **creak**. CUT TO BLACK. | stolen block | silence, then one creak |

---

## 6. The three gags

| # | Mechanism | Why it works |
|---|---|---|
| **S4→S5** | Cause/effect mismatch | The tiniest possible input produces the largest possible consequence. Pure cartoon physics, played straight. |
| **S6** | Split attention | The audience sees the disaster the authority figure doesn't. They're in on it — the most reliable comedy geometry there is. |
| **S10** | The rug-pull button | The story resolves happily, *then* the resolution is quietly revoked. Funnier than a threat because the audience does the maths themselves. |

Running gag: **Lexi is never honest and never caught.** He wins by concealment, and it costs him
everything in the final two seconds.

---

## 7. Narrator (trailer voice, 100% sincere — never winking)

Voice: `seed_audio` / Bram preset (`549ff70a-3ee7-4f04-a4d9-89a24fab7709`), `speech_rate -2`,
`pitch_rate -2`. Generate each line separately; place by measured duration.

| t | Line |
|---|---|
| 0:01 | "Every great structure… must be inspected." |
| 0:06 | "Some structures… should not be." |
| 0:12 | *(silence — the sway plays alone)* |
| 0:18 | "One word held it all together." |
| 0:20 | "It was three letters long." |
| 0:24 | "Word Tower. Coming soon to LexiClash." |
| 0:27 | *(silence — the button plays unnarrated)* |

**Hard rule:** VO must clear 0:11–0:14 and 0:27–0:30. Those silences are the film. Assert it in the
assembly script — a line that overruns is a silent failure that eats a gag.

---

## 8. Audio bed

| t | Music | SFX |
|---|---|---|
| 0:00 | Low ominous swell, strings rising | Wind, snack hitting dirt |
| 0:03 | Single cold brass sting, then drop out | Pen click, footstep |
| 0:06 | Warm soaring theme — full sincerity | Wind at altitude, distant birds |
| 0:09 | **Everything stops** | One dry *tik* |
| 0:12 | Silence held | Deep structural groan, timber stress |
| 0:15 | Nervous plucked strings, comic but not jokey | Ticking pen, muffled scrambling |
| 0:18 | Total drop-out | Dust, one settling pebble |
| 0:21 | Held tension → release | **STAMP THUD**, exhale |
| 0:24 | Full triumphant payoff | Sparkle, wind |
| 0:27 | **Cut dead** | One long creak. Nothing else. |

Law of Two and a Half: never more than ~2 tracked sounds at once. Score S1–S3 **completely
straight** — the sincerity is the joke; comedic scoring kills it.

---

## 9. Production plan

1. **Two character anchors first** — one Lexi keyframe, one Inspector keyframe, both 4K.
   Every subsequent shot passes **both** as reference images. Models carry zero memory between
   calls; a two-hander needs two anchors or both characters drift.
2. Keyframes: `nano_banana_pro`, 9:16, 4K, ~4 credits each → **10 shots ≈ 40 credits**
3. Clips: `kling3_0`, 9:16, 720p, 5s, `generate_audio` on, trimmed to 3s → **10 × 10 = 100 credits**
4. Narrator: 6 lines × 0.1 → **~1 credit**
5. Assembly: ffmpeg crossfade chain; hard cut into S10 via **concat, not a short xfade**
6. **Estimated total ≈ 141 credits**

### Transition grammar
`S1→S2` fadewhite 0.4 (the shadow falls) · `S2→S3` fade 0.5 · `S3→S4` **hard cut** (snap to macro) ·
`S4→S5` fade 0.12 (near-cut, sells cause→effect) · `S5→S6` fade 0.4 · `S6→S7` fade 0.5 ·
`S7→S8` **hold, no transition** · `S8→S9` fadewhite 0.6 (the relief wash) · `S9→S10` **hard cut**

### Known traps (learned on film 1)
- **Never** end the chain on a sub-0.1s `xfade` — it silently drops the last shot. Use `concat`.
- **Verify by frame count**, never container duration. Assert it.
- Text in video mutates — composite all lettering in post, including `APPROVED` on the stamp.
  S9's title card must be an **overlay**, not asked of the video model.
- Trim before drift: render 5s, use the middle 3s.
- Two characters in one frame is the highest drift risk in the whole board — S2, S5, S7, S8 and S10
  all need close QA on the Inspector's proportions.

---

## 10. Open questions for the owner

1. **3D Pixar vs. brand.** This board is full 3D as requested, which contradicts the flat
   neo-brutalist anti-references in `CLAUDE.md`. Confirmed as a deliberate exception — flagging so
   the design system isn't quietly eroded by precedent.
2. **Still no real gameplay.** Neither film shows real UI. Recommend S3 or S9 becomes a real
   capture (`?word-tower=1`, flag-gated per `useWordTowerEnabled.ts:13`).
3. **The Inspector is a new character.** If he's reusable, he's worth a proper turnaround sheet
   before the first render.
4. Locale note: the board is dialogue-free, so only the narrator and title card need transcreation.

---

**Rendered 2026-08-08.** Shipped cut + build scripts: `word-tower-inspection-film/`.
Sibling: `word-tower-reels-storyboard.md` (film 1) · frames in `word-tower-frames/`
