# Higgsfield for LexiClash — Quality Levers + Instagram Trailer

**Date:** 2026-06-13 · **Author:** Claude (goal session) · **Higgsfield plan:** ultra (3010 credits at start)

Two deliverables:
1. **Game-quality levers** — where Higgsfield's generation stack moves the needle on LexiClash, ranked by ROI.
2. **A witty Instagram trailer** — built, verified, and virality-scored. Files in `daily-content/instagram/2026-06-13/trailer/`.

---

## Part 1 — How Higgsfield improves game quality (ranked)

Higgsfield exposes: `generate_image` (nano_banana_pro / soul_2 / soul_id), `generate_video` (kling3_0 multi-shot + start/end interpolation, seedance), `generate_audio` (sonilo music / mirelo SFX / inworld TTS), `generate_3d`, `motion_control`, `upscale`, `remove_background`, and `virality_predictor` for UA creative testing.

**The one rule that governs everything (learned this session): anchor on REAL brand assets, never generate from scratch.** The live IG still (`post-image.jpg`) was AI-from-scratch → soft glows, generic white circle tiles = LexiClash's literal anti-reference. Every generation below must pass the mascot/cube/palette as a reference image (`media_import_url` the live `www.lexiclash.live/*` assets) so output looks like the shipping game.

| # | Lever | Tool | Why it pays | Effort |
|---|-------|------|-------------|--------|
| 1 | **Animated mascot reactions** | `generate_video` (image→video, sound off) | Mascot is static `.jpg` everywhere (results, FTUE, idle, coach). Verified this session: kling animates the real mascot WITHOUT character drift. Ship short webm/lottie-style loops for win/lose/combo/streak/panic → instant "alive" upgrade on every results & FTUE screen. | M |
| 2 | **Soul ID trained on the mascot** | `generate_image` soul_2 + soul_id | Train one reusable Soul (5–20 mascot images, ~10 min) → infinite on-brand mascot poses/emotions with ZERO art-drift. Kills the recurring "nano-banana drift" pain (see memory `homepage-cube-mascot-recolor`). Becomes the asset factory for emotions, modes, seasonal skins, avatars. | M (one-time) |
| 3 | **Per-style music beds** | `generate_audio` sonilo_music | The shipped player-style feature already swaps in-game tracks by genre (rock/hasidic/jazz/arcade/…). Generate a tight, loopable bed per style instead of licensing. One prompt each. | S |
| 4 | **Satisfying SFX pack** | `generate_audio` mirelo_text_to_audio | Word-submit pop, combo riser, blast cascade, coin arpeggio, streak whoosh. Reinforces the "casino-dopamine" coin work already in the app. Note recurring bug: SFX silently dropped unless `setGameActive(true)` — see memory `useGameActiveSound`. | S |
| 5 | **Multilingual mascot VO / onboarding narration** | `generate_audio` inworld_text_to_speech | 5-language TTS for FTUE coach lines / "You won!" stingers. Cheap, dodges hiring VO in Hebrew/Japanese/Swedish/Spanish. | S |
| 6 | **Mode cube motion + world ambiences** | `generate_video` (image→video on real `public/modes/cubes/*.png`) | The 16 cube arts are gorgeous but static. Spin/idle loops for the mode picker; looping ambient backdrops per Adventure world. | M |
| 7 | **Avatar generation packs** | `generate_image` soul_cast / soul_2 | Expand the avatar shop with on-brand seasonal/genre packs. | M |
| 8 | **UA creative engine** | `generate_video` + `virality_predictor` | This trailer pipeline, repeated weekly. Score variants BEFORE posting; keep only hooks that pass. Turns content from guesswork into tested creative. | S (per cut) |

**Quick wins to do next:** #1 (mascot win/lose loops) and #3/#4 (audio) are the highest fun-per-credit. #2 (Soul ID) is the strategic unlock that makes #1/#6/#7 cheap and drift-free forever.

---

## Part 2 — The Instagram trailer

**Concept — "NOT THAT KIND OF WORD GAME."** Subvert the word-games-are-calm/relaxing stereotype: a kawaii-looking game that behaves like a competitive party brawler. The brand's own contradiction is the hook.

**Format:** 9:16 vertical · 13.4s · 1080×1920 · h264 + AAC music bed · `out/lexiclash_trailer.mp4`

### Storyboard (hard cuts on the beat)
| t (s) | Beat | Source | Notes |
|------|------|--------|-------|
| 0.0–2.6 | **HOOK** mascot bursts feral | AI (kling3_0, real mascot anchor) | Scroll-stopper. Camera punch + battle-bounce. |
| 2.6–3.5 | Card: *NOT THAT KIND OF WORD GAME* | Brand CSS card | Witty thesis. |
| 3.5–6.5 | **DUEL** pink-knight vs cyan-knight clash | AI (kling3_0, real arena-cube anchor) | Real Arena DNA in motion. |
| 6.5–7.3 | Card: *REAL-TIME WORD BATTLES* | Brand CSS card | "everyone plays at once". |
| 7.3–9.8 | **MODE MONTAGE** blast/wordcraft/adventure/braingym/daily | Real `public/modes/cubes/*.png` | Punch-zoom hard cuts = variety. |
| 9.8–10.7 | Card: *16 MODES · 5 LANGUAGES* | Brand CSS card | The pitch numbers. |
| 10.7–13.4 | **END CARD** logo + PLAY FREE + lexiclash.live | Brand CSS + real waving mascot | CTA. |

### Pipeline (reproducible)
1. **Anchor:** `media_import_url` the live mascot + arena cube → media_ids.
2. **Key-frames:** `generate_image` nano_banana_pro 2k, 9:16, **text-free**, real-mascot reference (2 credits each).
3. **Motion:** `generate_video` kling3_0, `sound:"off"`, `mode:"std"`, 4s, image→video (6 credits each). AI motion ONLY on text-free mascot/explosion beats.
4. **Text:** ALL captions + end card rendered as HTML via the real shipped fonts (`public/fonts/fredoka-latin.woff2`, `rubik-latin.woff2`) + neo-brutalist tokens (hard shadows, lime/pink/cyan), screenshot at 1080×1920. **Never** let the video model render letters (it mangles them — fatal for a word game).
5. **Music:** one `sonilo_music` bed (16s), laid over silent clips in ffmpeg so cuts land on the beat.
6. **Stitch:** `build.sh` — pre-renders each beat to a normalized 1080×1920/30fps segment, concat, mux music with fade-out.
7. **Validate:** upload mp4 → `virality_predictor`.

### Files
```
daily-content/instagram/2026-06-13/trailer/
  out/lexiclash_trailer.mp4     <- THE DELIVERABLE
  build.sh                      <- regenerate the cut
  caption-en.txt                <- IG caption
  cards/*.html, cards/*.png     <- brand title/end cards (real fonts+CSS)
  clips/hook.mp4, clips/duel.mp4 <- AI motion beats
  frames/*.png                  <- key-frames
  audio/music.m4a               <- music bed
  fonts/                        <- (Rubik ok; Fredoka via repo woff2)
```

### Credits spent (approx)
- 4 key-frame images (2 hook + 2 duel-batch) · ~6
- 2 kling clips · ~12
- 1 music bed · ~few
- 1 virality analysis
Total well under 50 of 3010.

### Why this beats the current IG still
- Real mascot/arena/cubes/fonts → looks like the shipping game, not stock word-game AI.
- Hard pixel shadows, solid borders, electric color-coding, true navy — the neo-brutalist DNA the soft-glow still lost.
- Zero AI-rendered letters → no mush, critical for a WORD game.
- Hook-first structure + tested for virality.

### Next / variants
- A/B alternate hooks (e.g. "you vs your group chat") and re-score.
- Localized caption + end-card variants (he/es/sv/ja) — swap the card text, re-render (HTML is parameterized).
- Add a real-gameplay capture beat once a stable mobile single-player record exists (production landing was too sparse this session).

---

## Part 3 — FINAL deliverable: Cinematic Pixar-style trailer (v2)

User direction superseded the flat-2D cut: wanted a **cinematic 3D Pixar-style movie trailer that flows**, then added the witty hook: **show how old word games were (boring/sleepy) vs ours (energetic friend duel)**.

**File:** `daily-content/instagram/2026-06-13/trailer/cine/out/lexiclash_trailer_v2.mp4` · 9:16 · ~19.8s · 1080×1920 · h264+AAC · VO + orchestral score · −16.5 dB mean (IG-loud).

### Script (witty, contrast-driven)
> *(deep deadpan VO)* "Word games used to be… a nap. With extra steps." → **SMASH / color-burst** → "Not. Anymore." → "LexiClash. Real-time word battles. You versus your friends. Same board. No mercy." → *(logo)* "LexiClash. Play free. No download."

On-screen text mirrors it (muted-IG safe): *word games used to be… / a nap with extra steps 😴 / so we fixed that. / you vs your friends / REAL-TIME WORD BATTLES / same board. no mercy.*

### Structure (the hook = the contrast)
| beat | shot | treatment |
|------|------|-----------|
| 0–4.6s | **BORING** mascot yawning at a dusty old word board | desaturated (hue s=0.28), slowed 0.82×, quiet score |
| 4.4–6.3s | **SWITCH** eyes snap, lime/pink lightning shatters the dull floor | music DROP lands here |
| 6.3–13s | hero reveal → cyan **rival** → letter-blocks **slam** → arena **leap** | full vibrant color, fast cuts |
| 13–15.6s | fireworks **triumph** | crowd, release |
| 15.6–19.8s | **logo + CTA** | LEXICLASH · PLAY FREE · lexiclash.live |

### Cinematic pipeline (what's reusable)
- **Pixar 3D look** = nano_banana_pro key-frames prompted "cinematic 3D Pixar film still", **anchored on the real mascot** (+ a proven hero frame as a shared *style* reference so all shots match).
- **Motion** = kling3_0 **pro**, `sound:"off"`, image→video, per-shot camera moves (push/crane/whip/crack). Decline the "3D RENDER" preset (`declined_preset_id`) to generate literally.
- **VO** = inworld_text_to_speech, voice **"Hades (en)"** (deep trailer-narrator), generated as 4 short segments placed by timestamp.
- **Score** = sonilo_music with an explicit **drop at 4.5s** so the cut lands on the switch.
- **Text** = chroma-key overlays (magenta bg + black `-webkit-text-stroke` → `colorkey`) in real Fredoka → transparent PNGs over the footage, no AI letters.
- **Edit** = `cine/build_cine2.py`: per-shot normalize+desat+overlay-burn → xfade chain → VO bed (adelay) + music ducked via `sidechaincompress` → `loudnorm I=-14`.

### Files (cinematic)
```
cine/out/lexiclash_trailer_v2.mp4   <- FINAL (witty contrast, VO)
cine/out/lexiclash_cinematic.mp4    <- 18.5s no-VO cinematic cut
cine/build_cine2.py / build_cine.py <- rebuild scripts
cine/clips/*.mp4   (8 pro shots: boring, switch, hero, rival, slam, leap, triumph)
cine/frames/*.png  (key-frames)  · cine/overlays/*.png (witty text)
cine/vo/*.wav (narration) · cine/audio/cine_music2.m4a (score) · cine/cards/cine_end.* (logo CTA)
caption-en.txt
```

### Credits
Whole session (2D cut + full cinematic + VO + 2 scores + 8 pro clips + ~10 key-frames + 2 virality runs): **~109 credits of 3010** (ultra plan). Pro video ≈ 9 cr/clip is the main cost; everything else is single-digit.

### Why it works
Real mascot anchoring → believable *our*-character 3D · style-locked shots → reads as one film · contrast structure → the hook the flat cut's virality score flagged (hook 29 / sustain 96) · VO + on-screen text → witty script that works muted or loud.
