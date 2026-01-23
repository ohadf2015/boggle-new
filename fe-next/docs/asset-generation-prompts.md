# AI Asset Generation Prompts

**Purpose:** Reproducible AI image generation for LexiClash adventure mode assets.
**Last Updated:** 2026-01-23
**AI Tool:** Midjourney v8 (Discord workflow)

## Art Style Guidelines

**Core Aesthetic:**
- Stylized cartoon (Cuphead/Hollow Knight energy)
- Bold, chunky outlines (3-4px black borders)
- High saturation colors
- Playful, exaggerated proportions
- Neo-brutalist influence (sharp angles, geometric shapes)

**Color Approach:**
- Use natural language: "bright sunny yellow" NOT "#FFE135"
- Vivid, saturated palette (80-100% saturation)
- High contrast for readability
- Distinct per-world palettes (green, blue, purple)

**Critical Anti-Patterns:**
- ❌ NO hex codes in prompts (Midjourney interprets as text)
- ❌ NO technical jargon ("birefnet", "alpha channel", "WebP")
- ❌ AVOID photorealistic/semi-realistic styles
- ❌ AVOID soft lighting or subtle gradients (go bold!)

---

## World Background Prompts

Full-scene backgrounds for each world. Used as base layer in parallax system.

### World 1: Alphabet Meadows

**Theme:** Sunny, pastoral, inviting
**Color Palette:** Bright greens, sunny yellows, sky blues
**Key Elements:** Rolling hills, wildflowers, butterflies, grass

**Prompt Template:**
```
stylized cartoon meadow scene, rolling hills with wildflowers and tall grass, bright sunny sky with fluffy clouds, cheerful and inviting atmosphere, bold outlines, vibrant greens and yellows, playful style like Cuphead game art, geometric shapes, flat color areas with minimal shading --ar 1:1 --v 8
```

**Variations to Try:**
- "pastoral meadow with butterflies, clean cartoon style"
- "sunny field of flowers and grass, bold graphic design"
- "cheerful countryside scene, geometric shapes, bright colors"

**Settings:**
- Aspect ratio: `--ar 1:1` (square 1024x1024)
- Model: `--v 8`
- Style reference: Use approved World 1 style ID if established

### World 2: Synonym Springs

**Theme:** Serene, flowing, refreshing
**Color Palette:** Cool blues, aqua greens, white mist
**Key Elements:** Waterfalls, streams, rocks, droplets, mist

**Prompt Template:**
```
stylized cartoon waterfall scene, cascading streams and water pools, smooth rocks and mist, serene atmosphere, bold outlines, vibrant blues and aqua colors, playful water droplets, clean graphic style like Hollow Knight, geometric rock shapes --ar 1:1 --v 8
```

**Variations to Try:**
- "flowing water and waterfalls, bold cartoon style, refreshing feel"
- "blue springs with rocks and streams, geometric design"
- "serene water scene with mist, vibrant colors, chunky outlines"

**Settings:**
- Aspect ratio: `--ar 1:1`
- Model: `--v 8`
- Style reference: Use approved World 2 style ID

### World 3: Root Caverns

**Theme:** Mysterious, underground, glowing
**Color Palette:** Deep purples, magenta pinks, dark blues
**Key Elements:** Crystals, stalactites, stalagmites, underground glow

**Prompt Template:**
```
stylized cartoon underground cave scene, glowing purple crystals and rock formations, stalactites hanging from ceiling, mysterious atmosphere, bold outlines, deep purples and magentas, geometric crystal shapes, dramatic lighting from crystals, flat color style --ar 1:1 --v 8
```

**Variations to Try:**
- "mystical cave with glowing crystals, bold cartoon style"
- "underground cavern with purple glow, geometric rocks"
- "crystal cave scene, vibrant purples, chunky outlines"

**Settings:**
- Aspect ratio: `--ar 1:1`
- Model: `--v 8`
- Style reference: Use approved World 3 style ID

---

## Parallax Layer Prompts

Multi-layer depth elements. Must maintain visual cohesion with base background.

**Design Principles:**
- All layers share same lighting direction
- Distant layers: desaturated, lower contrast, soft edges
- Foreground layers: vibrant, high contrast, sharp edges
- Transparent backgrounds for layer compositing
- Horizontal scenes (wider than tall)

### Meadows Layers (2 total)

**Layer 1: Distant Hills**
```
stylized cartoon rolling hills silhouette, distant mountains in background, soft muted greens and blues, minimal detail, atmospheric perspective, bold simple shapes, flat color style --ar 2:1 --v 8
```
- Depth: 0.3 (mid-ground)
- Opacity: 0.9
- Target size: <150KB

**Layer 2: Foreground Grass**
```
stylized cartoon tall grass and wildflowers, foreground vegetation, bright vibrant greens and yellows, bold outlines, playful flower shapes, geometric leaf design, clean flat colors --ar 2:1 --v 8
```
- Depth: 0.5 (foreground)
- Opacity: 1.0
- Target size: <150KB

### Springs Layers (3 total)

**Layer 1: Distant Waterfall**
```
stylized cartoon waterfall in distance, cascading water, soft blues and whites, minimal detail, atmospheric depth, simple geometric water shapes --ar 2:1 --v 8
```
- Depth: 0.2
- Opacity: 0.8

**Layer 2: Mist Effects**
```
stylized cartoon mist and water vapor, floating fog patches, soft translucent whites and light blues, dreamy atmosphere, simple cloud shapes --ar 2:1 --v 8
```
- Depth: 0.35
- Opacity: 0.6

**Layer 3: Foreground Rocks**
```
stylized cartoon smooth river rocks, foreground stone formations, vibrant grays and blues with water reflections, bold outlines, geometric rock shapes, clean flat colors --ar 2:1 --v 8
```
- Depth: 0.5
- Opacity: 1.0

### Caverns Layers (3 total)

**Layer 1: Distant Crystals**
```
stylized cartoon crystal formations in distance, small glowing gems, soft purple and magenta glow, minimal detail, atmospheric depth, simple geometric crystal shapes --ar 2:1 --v 8
```
- Depth: 0.2
- Opacity: 0.8

**Layer 2: Stalactites**
```
stylized cartoon stalactites hanging from ceiling, underground rock formations, deep purples and dark grays, bold outlines, geometric cone shapes, dramatic lighting --ar 2:1 --v 8
```
- Depth: 0.35
- Opacity: 0.9

**Layer 3: Foreground Crystals**
```
stylized cartoon large glowing crystals in foreground, vibrant purple and pink gems, bold outlines, sharp geometric crystal shapes, strong color saturation, dramatic glow effect --ar 2:1 --v 8
```
- Depth: 0.5
- Opacity: 1.0

---

## Lexi Sprite Prompts

Character sprites for Lexi mascot. MUST maintain character consistency across all states.

**Character Consistency Setup:**
1. Upload existing Lexi mascot from `public/mascot/main-nobg.gif` to Discord
2. Get character reference URL
3. Use `--cref [URL] --cw 80` on ALL sprite generations

**Base Character Description:**
"stylized cartoon owl mascot, round friendly face, large expressive eyes, small beak, cute feather tufts, simple clean design, playful proportions, bold outlines, vibrant colors"

### Idle State (2 frames)

**Frame 1: Neutral**
```
[base character] standing relaxed, neutral expression, wings at sides, calm posture, centered composition --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Frame 2: Subtle Breath**
```
[base character] subtle breathing animation, slightly taller posture, wings barely raised, same calm expression --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Animation:** Slow loop (1-2s per cycle)

### Celebrate State (2 frames)

**Frame 1: Anticipation**
```
[base character] excited expression, wings starting to raise, happy eyes, energetic pose, about to celebrate --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Frame 2: Peak Celebration**
```
[base character] joyful celebration, wings fully raised above head, big happy eyes, triumphant pose, confetti-ready energy --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Animation:** Fast bounce (0.5s per cycle)

### Sad State (2 frames)

**Frame 1: Drooped**
```
[base character] sad disappointed expression, wings drooped down, concerned eyes, slumped posture, empathetic feel --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Frame 2: Slight Sway**
```
[base character] same sad expression, wings slightly angled, gentle sway to side, maintaining empathetic concern --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Animation:** Slow sway (1.5s per cycle)

### Hint State (2 frames)

**Frame 1: Helpful Gesture**
```
[base character] helpful encouraging expression, one wing raised pointing upward, friendly eyes, supportive pose, teacher-like energy --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Frame 2: Emphasis**
```
[base character] same helpful expression, wing pointing with slight bounce, eager to help, engaged supportive posture --cref [LEXI_URL] --cw 80 --ar 1:1 --v 8
```

**Animation:** Gentle bob (0.8s per cycle)

---

## Post-Processing Pipeline

All AI-generated assets run through automated pipeline:

### Background Removal (Sprites Only)
```bash
rembg i -m birefnet-general input.png output.png
```
- Model: `birefnet-general` (95%+ accuracy)
- Alpha matting: 240/10 thresholds
- Clean edges, minimal artifacts

### WebP Optimization (All Assets)
```bash
# Via asset-pipeline.ts
npx tsx scripts/asset-pipeline.ts --manifest=scripts/adventure-assets.json
```

**Settings:**
- Quality: 80 (validated in Phase 1)
- Effort: 6 (balanced speed/compression)
- Target sizes:
  - Backgrounds: <200KB
  - Parallax: <150KB
  - Sprites: <100KB

**If size exceeds target:**
1. Reduce quality to 70
2. If still over: Resize dimensions (backgrounds to 768x768, parallax to 512px height)
3. If still over: Re-compress at quality 60 (last resort)

---

## Generation Workflow

**Step-by-step process:**

1. **Establish Style Reference**
   - Generate 1-2 test images per world
   - Get user approval on art style
   - Save approved image URLs as `--sref` references

2. **Batch Generate Assets**
   - Use style references for consistency
   - Generate all layers for one world at a time
   - Download from Discord (right-click → Save Image)
   - Save as PNG in `raw/adventure/` directory

3. **Run Pipeline**
   ```bash
   npx tsx scripts/asset-pipeline.ts --manifest=scripts/adventure-assets.json
   ```

4. **Verify Output**
   ```bash
   ls -lh public/images/adventure/*/*.webp
   ```
   - Check all 19 assets generated
   - Verify file sizes within targets
   - Visual QA: Load in browser, check clarity

5. **Integration Testing**
   - Load in WorldBackground component
   - Test parallax motion (gyroscope + gestures)
   - Verify Lexi sprite animations
   - Check mobile performance (Lighthouse)

---

## Troubleshooting

### Issue: Character Inconsistency
**Symptom:** Lexi looks different across sprite states
**Fix:**
- Verify `--cref` URL is correct
- Increase `--cw` to 90 for stricter consistency
- Regenerate all sprites in same session

### Issue: Layer Visual Disconnect
**Symptom:** Parallax layers don't look cohesive
**Fix:**
- Use same `--sref` for all layers in a world
- Match lighting direction in prompts
- Reduce color variation between layers

### Issue: File Size Over Target
**Symptom:** WebP still >200KB after optimization
**Fix:**
- Reduce quality: `--quality=70`
- Resize: backgrounds to 768x768
- Simplify prompt: Less detail → better compression

### Issue: Letters Hard to Read
**Symptom:** Tile graphics obscure letter visibility
**Fix:**
- This shouldn't happen — tiles use CSS overlays
- If regenerating tiles: Keep minimal, test readability

---

## Examples That Worked

**Successful prompts from testing:**

✅ "sunny meadow scene, bold cartoon style, vibrant greens"
✅ "cascading waterfall, clean graphic design, cool blues"
✅ "glowing crystal cave, geometric shapes, deep purples"
✅ "friendly owl mascot celebrating, wings raised, joyful"

**Failed prompts to avoid:**

❌ "meadow background #7FD645 color, birefnet-general model" (technical jargon)
❌ "realistic waterfall with photographic lighting" (wrong style)
❌ "complex detailed cave with hundreds of tiny crystals" (too busy, poor compression)

---

**Total Assets:** 19 (3 backgrounds + 8 parallax + 8 sprites)
**Estimated Generation Time:** 2-3 hours (Discord workflow + downloads)
**Pipeline Processing Time:** ~5 minutes (automated)
