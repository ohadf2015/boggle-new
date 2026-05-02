# Word Vault — Graphics Pipeline Test 2026-05-02

Locks the visual law for Word Vault Book 1 + selects the rigging pipeline.

## Visual law (final 5 keepers)

All assets live in `01-final/`. Generated via `mcp-image` (Gemini Nano Banana Pro).

| File | Role | Emotional pole | Notes |
|---|---|---|---|
| `melo.jpg` | Hero / player avatar | Grieving courage | Lantern in left hand, ash smudges, restrained tears |
| `librarian.jpg` | Hub Vault-keeper NPC | Patient sorrow | Hooded scholar mantle, holds book labelled "VAULT" |
| `cinder.jpg` | Corrupted Cael (Book 1 antagonist) | Dangerous grief | Charred body, lava cracks, sad ember eyes — visual anchor for full set |
| `cael.jpg` | Pre-corruption memory of cousin Cael | Pure radiant warmth | Generated img2img off cinder.jpg → guarantees morph compatibility for redemption-cinematic transformation |
| `hearth-halls-bg.jpg` | Book 1 environment (room 1.1–1.6) | Kitchen-graveyard | Deep navy palette + contained ember pool, character-friendly composition |

### Visual law rules (apply to all future Word Vault assets)

1. THICK black ink outline (vinyl-sticker weight)
2. Heavy halftone dot shading on body
3. Cube-character family silhouette (Melo / Cinder / Cael / Librarian share proportions)
4. Eye treatment: open eyes with restrained-tear shimmer at corners (grief without melodrama)
5. Color logic: **dark navy + cobalt-grey + soot black 70%, contained ember orange 10%, warm cream 20%** — characters silhouette against dark BG
6. Cael is the visual exception — pure warm + golden aura — he's the *memory of warmth*, not a character in the corrupted world

## Animation pipeline decision

**Locked: Runway Gen-4 video clips for heroes + Rive MCP for UI** (2026-05-02 zero-GUI pivot)

### What changed and why

Earlier session locked **Path B = Live2D Cubism Free + pixi-live2d-display**. User reviewed and explicitly refused manual Cubism GUI work. Live2D Cubism Editor has no API/MCP/CLI — Claude cannot drive it. So the path was a non-starter under the "100% AI-automated" requirement.

**New plan**: skip rigging entirely. Use Runway Gen-4 image-to-video to generate looping character motion clips. State control via React clip-swap. Mesh-warp-quality smoothness because it's actual video. Same pipeline as cinematics. 100% Claude-driven via fal-ai MCP.

### Why not other paths

| Path | Why rejected |
|---|---|
| **Live2D Cubism Free + pixi-live2d-display** | Cubism Editor is desktop GUI with no API/MCP. User refused manual rigging work. |
| **Inochi2D Creator** (FOSS, MIT) | Same — desktop GUI, no API/MCP. Plus 20-40 hr custom Pixi runtime work. |
| **Pixa.com** | Outputs MP4 video only, no controllable rig. *But this is what we're now doing — just better via Runway Gen-4 directly.* |
| **Spine 2D / DragonBones** | GUI editors, no MCP. Plus skeletal paper-doll cuts kill the sticker aesthetic. |
| **Lottie / dotLottie** | Vector-only — kills halftone raster look. |
| **Rive for heroes** | Raster animation is positional only (translate/rotate/scale) — no mesh-warp on cube body squish-on-breath. Better for UI than character performance. |
| **Meshy (3D)** | 3D-rendered look loses sticker charm. |

### Why video-clips-for-heroes wins under zero-GUI constraint

- **Zero GUI work** — pure MCP automation via fal-ai
- **Mesh-warp-quality smoothness** because it's actual video frames
- **Same pipeline as cinematics** — already locked for Runway Gen-4
- **Multi-shot character consistency** — Runway Gen-4 References ensures same Melo across all 5 state clips from a single reference image
- **Budget tractable** — ~$40 for all 4 characters × 5 states = 20 clips
- **Future-proof** — when better tools appear (text-to-Live2D-rig if it ever ships), regenerate
- **Lip-sync explicitly dropped** — characters don't sync to phonemes; audio plays alongside generic talking-mouth video
- **Trades real-time mesh parameter control** for zero-rigging-effort. Per-state clip swap covers all needed game states.

### Pipeline diagram (100% Claude-driven via MCPs)

```
[1] Asset gen (mcp-image)              ✅ DONE — see 01-final/
       ↓
[2] BG removal (rembg -m isnet-anime)  ✅ DONE — see 02-bg-removed/
       ↓
[3] HERO CHARACTER VIDEO LOOPS         ⏭ NEXT — fal-ai Runway Gen-4 image-to-video
   For each character (Melo / Librarian / Cinder / Cael):
   - idle.webm     (3-5s loop, default state)
   - thinking.webm (triggered: hand to chin, eyes glance up)
   - happy.webm    (triggered: smile bigger, slight bounce)
   - sad.webm      (triggered: eyes downcast, slump)
   - confused.webm (triggered: head tilt, brief shake)
   = 5 clips × 4 chars = 20 total clips → 03-video-loops/
       ↓
[4] CINEMATICS                          ⏭ Same Runway Gen-4 pipeline
   - Vault entrance (Hub → Book 1 transition)
   - Cinder redemption (room 1.6 climax)
   → 05-cinematics/
       ↓
[5] UI ANIMATIONS                       ⏭ Rive Editor MCP (Mac Desktop)
   - Tile interaction state machine
   - Riddle solve burst
   - Inventory drawer open/close + item highlights
   - Cinder Charm pulse (fire-themed solve)
   - Achievement / cousin redemption unlock burst
   → 04-rive/
       ↓
[6] AMBIENT FX                          ⏭ Pixi v8 + GLSL shaders (Claude-written code)
   - Embers in Hearth Halls
   - Memory Coin glints
   - Cursor trails
       ↓
[7] MOUNT                               ⏭ React + HTML5 video + Rive runtime + Pixi (Claude-written)
   Hero state → swap which .webm is playing (cross-fade)
   UI events → trigger Rive state machine inputs
   Background → Pixi canvas underneath
```

**100% Claude-driven via MCPs.** No GUI work required from user beyond:
- Install Rive Desktop (Mac, free) for the Rive MCP to connect to
- Sign in to Rive (Personal free tier)

That's it. After install, all subsequent animation authoring runs through Claude.

### What's NOT in this pipeline

- Live2D Cubism (refused — manual GUI required)
- Lip-sync (out of scope 2026-05-02)
- Skeletal rigging (Spine, DragonBones — wrong aesthetic AND require GUI)

## Asset generation prompts (archive)

### Melo v2

```
Sticker-illustrated marshmallow-cube hero character in dark melancholic Inscryption-meets-Layton style. Cream-white cube body with subtle ash smudges on shoulders and hem, faintly weathered and stained. Heavy halftone dot shading throughout body. Big sad-determined eyes with slightly downturned brows, soft shimmer of unshed tears at eye corners (NOT actively crying — restrained, brave), warm cheek blush still present. Small slightly-pressed lips, jaw set with quiet courage. Holding a brass lantern in left hand, the lantern flame glowing warm amber casting a small contained pool of warm light against the deep navy darkness around character silhouette. Right hand at side, fingers slightly curled. Worn leather satchel strap across body, frayed at edges, leather slightly cracked. Arms in relaxed A-pose. THICK black ink outline like a vinyl sticker. Strong inner shadow tones beneath chin and along right body edge. Transparent background. Front-facing portrait, full body. Style: kawaii silhouette carrying real grief. Mood: small hero who has lost something he loved and is descending into the dark anyway.
```

### Librarian v2

```
Sticker-illustrated marshmallow-cube elder Vault-keeper character in dark melancholic Inscryption-meets-Layton style. Pure-white cube body, edges yellowed and faintly stained as if handled for centuries. Heavy halftone dot shading throughout body. Narrow knowing eyes behind round wire-rimmed reading glasses, soft crow's feet wrinkles at corners, faint restrained sadness held behind professional calm. Soft confident knowing smile. Wearing dark hooded scholar's mantle/cowl draped low over the forehead, mantle edges frayed and patched. Tiny silver clasp at collar. Holding a single closed leather-bound ancient tome at hip-level in left hand, hand fully visible and separated from body silhouette. Right hand at side raised slightly in welcoming gesture, fingers fully visible. NO graduation cap, NO mortarboard, NO tassel. Arms in clear A-pose with full separation from body. THICK black ink outline like a vinyl sticker. Strong inner shadow tones beneath chin and along right body edge. Transparent background. Front-facing portrait, full body. Style: kawaii silhouette carrying centuries of quiet sorrow. Mood: patient archivist of grief who has seen many descend and few return.
```

### Cinder v1 (visual anchor)

```
Sticker-illustrated marshmallow-cube character corrupted into shadow form. Charred-black cube body with glowing orange-red lava cracks running across surface like cooling magma. Smoldering ember eyes glowing red-orange, no pupils. Wide hungry mouth slightly open showing inner ember glow. Wisps of smoke and floating ash particles drifting up around body. Heat-distortion shimmer along silhouette edges. Arms outstretched, fingers slightly clawed, ravenous. Thick black ink outline. Halftone dot shading. Transparent background. Front-facing portrait, full body. Mood: dangerous and grieving — readable as cute-monstrous but with hidden sorrow, NOT pure horror. Should still feel like a kawaii character that has been hurt.
```

### Cael v4 (img2img off Cinder anchor)

Anchor input: `cinder.jpg`. `maintainCharacterConsistency: true`.

```
Take this exact cube character body and silhouette, but transform it from corrupted form to PRE-CORRUPTION form. KEEP: identical cube body proportions, identical head shape, identical small leg stubs visible at bottom, identical silhouette weight, same thick black ink outline weight, same halftone dot shading style, same overall character size and pose framing. CHANGE: charred-black surface to clean cream-white marshmallow body, lava cracks completely removed, red-orange ember eyes to warm chestnut-brown eyes that are open and friendly (not sad, not crying), hungry mouth to gentle small content closed-mouth smile, smoke wisps and ash particles to floating warm-golden light particles like cooking aroma, heat distortion to soft warm glow aura around silhouette. ADD: simple white chef's apron with red embroidered border tied at waist, small wooden spoon tucked in apron pocket, modest white chef's toque (not too tall) tilted slightly, tiny flour smudge on cheek, holding small copper pot in both hands at chest level offering it forward proudly. Soft cheek blush. THICK black ink outline like a vinyl sticker, matching original outline weight. Transparent background. Front-facing portrait, full body. Style: kawaii cube cousin BEFORE corruption, the warmth that Cinder used to be. Mood: gentle generous cousin who fed everyone, content and content with himself.
```

### Hearth Halls v2

```
Burned-down kitchen chamber interior in deep moody Inscryption-eerie tones. Color palette ratio: 70% deep midnight navy + cobalt-grey + soot black, 20% warm cream highlights, only 10% contained ember orange. DARKER overall than typical fantasy concept art — deep midnight navy walls and ceiling, walls of cool cobalt-grey stone with heavy soot streaks. Ember glow STRICTLY CONTAINED to a small back-center hot zone (only ~20% of frame) — glowing ember pile in a massive stone hearth at back-center casts only a tightly contained warm red-orange pool of light, fading to deep navy at frame edges. Stone counters and floor rendered in cool cobalt-grey, NOT orange-tinted. Charred wooden ceiling beams half-collapsed, broken copper pots scattered on cracked stone floor (cool-toned). 5-7 sparse glowing amber ash particles drifting upward through middle of frame. Atmospheric perspective: foreground architecture crisp and high-contrast, back of room hazy with faint ember haze. Bottom third of frame mostly empty negative space where characters will stand on top. THICK black ink outlines on architectural shapes. Heavy halftone dot texture on shadows and stone surfaces. Cinematic side-scrolling 2D adventure game background, no characters. Mood: a once-loved kitchen now grieving its cook. A kitchen-graveyard. Eerie quiet weight.
```

## Cost ledger

| Step | Cost |
|---|---|
| First-pass gen (5 chars) | ~$0.25 |
| Cael regen v2/v3 + Hearth v2 + Librarian v2 + Melo v2 | ~$0.25 |
| Cael v4 img2img | ~$0.05 |
| **Total Phase 1 spend** | **~$0.55** |

LoRA training skipped — Nano Banana Pro's structured-prompt enhancer delivers cohesion without it.

## Next steps

1. **Approve all 5 keepers** (you've done this — Cael v4 is locked)
2. **Background removal** — run `rembg` on all 4 character files (Hearth BG keeps its background)
3. **Install Live2D Cubism 5 Free Editor** + `pixi-live2d-display` npm package
4. **Rig pilot character first**: Melo (~1-2 hr in Cubism Editor)
5. **Mount in `/test/word-vault-graphics-pipeline` route** (Pixi v8 + rigged Melo + Hearth BG + ember shader)
6. **Real mobile FPS check** on Galaxy S10-class device
7. **If pilot succeeds** → rig the other 3 characters
8. **If pilot fails** → fall back to Inochi2D Creator (Path A) and reassess

## Decisions logged

- 2026-05-02: visual law locked across 5 keepers
- 2026-05-02 (early): rigging path = B (Live2D Cubism Free + pixi-live2d-display) — SUPERSEDED later same day
- 2026-05-02 (later): **rigging path FULLY DROPPED** in favor of Runway Gen-4 video clips for heroes. Driver: user explicitly refused manual Cubism GUI work, and Cubism has no API/MCP/CLI. Replacement gives mesh-warp-quality smoothness via actual video, 100% Claude-automatable via fal-ai MCP.
- 2026-05-02: Midjourney offered but not adopted; sticking with Nano Banana Pro for image gen
- 2026-05-02: doc Section 9's "Lottie state-controlled mascot" ⚠ overridden — heroes use HTML5 `<video>` clip-swap, Lottie fully dropped (replaced by Rive for UI accents)
- 2026-05-02: doc Section 14's "DOM puzzles, Pixi only Hub + cinematics" ⚠ softened — small `<video>` overlay allowed in DOM puzzle rooms for character reactions
- 2026-05-02: evaluated [GBSOSS/nano-live2d](https://github.com/GBSOSS/nano-live2d) — does NOT solve rigging (it's a Gemini-driven texture-swap demo on a pre-rigged Live2D avatar, custom runtime, no license). **Bookmarked for Book 2+ polish**: the texture-swap *technique* could automate outfit progression on already-rigged Melo (ash-stained, ice-burn, Cael's apron variants) without re-rigging — defer to post-vertical-slice phase.
- 2026-05-02: **Rive re-instated** (overrides round-2 drop). Replaces Lottie for UI accents — tile interactions, riddle-solve bursts, inventory drawer, charm pulses, achievement unlocks. Free under Rive Personal solo-dev plan. **Rive Editor MCP enables 100% Claude-driven UI animation authoring** on Mac Desktop.
- 2026-05-02: **Lottie / dotLottie fully dropped.** Heroes → Runway Gen-4 video clips, UI accents → Rive. Original round-2 concern about "Rive vs Lottie inconsistency" dissolved by removing Lottie entirely.
- 2026-05-02: **Live2D Cubism + pixi-live2d-display fully dropped.** Driver: zero-GUI requirement (user refused manual Cubism work). Replaced by Runway Gen-4 image-to-video clips per character state. Tradeoff: lose mesh-warp parameter control, gain 100% Claude automation + same pipeline as cinematics + zero rigging effort.
- 2026-05-02: **Lip-sync OUT OF SCOPE.** Characters don't sync mouths to phonemes; audio plays alongside generic talking-mouth video clips. Defer to post-vertical-slice if later needed.
