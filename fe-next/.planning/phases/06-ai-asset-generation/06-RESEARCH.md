# Phase 6: AI Asset Generation - Research

**Researched:** 2026-01-23
**Domain:** AI image generation, asset pipeline integration, game art workflows
**Confidence:** MEDIUM

## Summary

Researched AI image generation workflows for creating production-ready visual assets (backgrounds, character sprites, special tiles) with style consistency. Investigated Midjourney capabilities, parallax background design patterns, and integration with existing asset pipeline (rembg + Sharp WebP optimization).

**Key findings:**
- Midjourney v8 (2026 standard) provides character consistency via --cref flag and style locking via --sref
- No official Midjourney API exists; manual Discord workflow + batch download required
- Parallax backgrounds use 3-4 layers with depth-based speed ratios (0.1-0.5)
- Special tiles use CSS effects (shimmer, glow, pulse) rather than baked-in animations
- Existing Lexi mascot GIFs in public/mascot/ can serve as character reference for new sprite generation

**Primary recommendation:** Use Midjourney Discord workflow with --cref for consistency, manual generation + download, then automate background removal (rembg) and optimization (Sharp WebP) via existing Phase 1 pipeline.

## Standard Stack

The established tools for AI asset generation and processing:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Midjourney | v8 (2026) | AI image generation | Industry standard for character consistency (--cref), style reference (--sref), highest quality output |
| Sharp | 0.34.5 (installed) | WebP optimization | High-performance image processing, quality 80 + effort 6 already validated in Phase 1 |
| rembg CLI | Latest | Background removal | birefnet-general model validated in Phase 1 (95%+ accuracy) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Discord | N/A | Midjourney interface | Required for all Midjourney generation (no official API) |
| Next.js Image | 16.0.7 | Asset serving | Optimized delivery, supports WebP format |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Midjourney | DALL-E 3 / Stable Diffusion | DALL-E has API but lower character consistency; SD requires local setup |
| Manual download | Unofficial Midjourney API | API violates TOS, risks account ban |
| rembg | Adobe Firefly API | Firefly has API but costs $$ per image; rembg is free + proven |

**Installation:**
```bash
# Already installed in Phase 1
npm install sharp@0.34.5
# rembg CLI already available (Python dependency)
```

## Architecture Patterns

### Recommended Project Structure
```
public/images/adventure/
├── backgrounds/           # Full-scene backgrounds (1024x1024)
│   ├── meadows.webp       # World 1 (Alphabet Meadows)
│   ├── springs.webp       # World 2 (Synonym Springs)
│   └── caverns.webp       # World 3 (Root Caverns)
├── parallax/              # Parallax layer assets (1024x512 or smaller)
│   ├── meadows-hills.webp
│   ├── meadows-grass.webp
│   ├── springs-waterfall.webp
│   ├── springs-mist.webp
│   ├── springs-rocks.webp
│   ├── caverns-crystals-far.webp
│   ├── caverns-stalactites.webp
│   └── caverns-crystals-near.webp
├── tiles/                 # Special tile graphics (128x128)
│   ├── gold-tile.webp
│   ├── ice-tile.webp
│   ├── bomb-tile.webp
│   └── rainbow-tile.webp
└── sprites/               # Lexi mascot sprite sheets
    ├── lexi-idle-1.webp
    ├── lexi-idle-2.webp
    ├── lexi-celebrate-1.webp
    ├── lexi-celebrate-2.webp
    ├── lexi-celebrate-3.webp
    ├── lexi-sad-1.webp
    ├── lexi-sad-2.webp
    └── lexi-hint-1.webp
```

### Pattern 1: Parallax Layer Design (3-4 Layers)
**What:** Multi-layer backgrounds with depth-based parallax scrolling
**When to use:** World backgrounds requiring visual depth and immersion
**Example:**
```typescript
// Source: World theme configuration (lib/adventure/themes/world1.ts)
const background: WorldBackground = {
  baseColor: 'bg-gradient-to-b from-neo-navy via-slate-900 to-emerald-950',
  layers: [
    {
      id: 'meadows-sky',
      source: 'bg-gradient-to-b from-neo-navy via-slate-900 to-emerald-950',
      depth: 0.1,  // Slowest movement (farthest)
      opacity: 1,
    },
    {
      id: 'meadows-hills',
      source: '/images/adventure/parallax/meadows-hills.webp',
      depth: 0.3,  // Mid-ground
      opacity: 0.9,
    },
    {
      id: 'meadows-grass',
      source: '/images/adventure/parallax/meadows-grass.webp',
      depth: 0.5,  // Fastest movement (nearest)
      opacity: 1,
    },
  ],
};
```

**Parallax depth ratios:**
- Layer 1 (Sky/Base): depth 0.1 (static or near-static)
- Layer 2 (Mid-ground): depth 0.2-0.35
- Layer 3 (Foreground): depth 0.4-0.55

**Best practices:**
- Use 3-4 layers maximum (performance constraint)
- Distant layers lose saturation/contrast (atmospheric perspective)
- Keep consistent art style across all layers
- Each layer should complement particles (butterflies, droplets, crystals) from Phase 4

### Pattern 2: Midjourney Consistency Workflow
**What:** Character and style consistency across multiple generations
**When to use:** Generating multiple poses/states of Lexi mascot or themed tile variations
**Example:**
```bash
# Step 1: Establish style reference from existing Lexi mascot
# Upload public/mascot/main-nobg.gif to Discord
# Generate style reference ID (example)

# Step 2: Generate new Lexi sprite with consistent character
/imagine stylized cartoon owl mascot celebrating with wings raised, playful expression, clean simple design --cref https://discord.com/channels/.../main-nobg.gif --cw 80 --sref STYLE_ID --ar 1:1 --v 8

# Flags:
# --cref: Character reference (existing Lexi image URL)
# --cw 80: Character weight (80 = high consistency, some variation allowed)
# --sref: Style reference (locked aesthetic)
# --ar 1:1: Aspect ratio (square for sprite sheets)
# --v 8: Midjourney v8 model (2026 standard)
```

**Workflow steps:**
1. Upload existing Lexi mascot as character reference
2. Lock style with --sref from approved reference image
3. Generate variations with --cref + --cw 60-80 (high consistency)
4. Download all variations from Discord
5. Run through asset pipeline (rembg + Sharp optimization)

### Pattern 3: Asset Pipeline Integration
**What:** Automate background removal and WebP optimization after manual generation
**When to use:** Processing AI-generated images for production use
**Example:**
```bash
# Asset pipeline (already implemented in Phase 1)
# Manual workflow for Phase 6:

# 1. Generate images in Midjourney Discord
# 2. Download to temp directory
# 3. Background removal (rembg CLI)
rembg i -m birefnet-general input.png output.png

# 4. WebP optimization (Sharp)
node scripts/optimize-webp.js output.png --quality 80 --effort 6 --output public/images/adventure/backgrounds/meadows.webp

# 5. Verify file size <200KB
ls -lh public/images/adventure/backgrounds/meadows.webp
```

### Anti-Patterns to Avoid
- **Don't generate different art styles per world** - maintain unified cartoon aesthetic across all 3 worlds (only color palette changes)
- **Don't bake effects into tile images** - use CSS shimmer/glow/pulse overlays for performance (ThemedTile already implements this)
- **Don't use unofficial Midjourney APIs** - violates TOS, risks account ban, manual workflow safer

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI image generation API | Custom integration with unofficial APIs | Manual Midjourney Discord workflow | No official API; unofficial ones violate TOS and risk account bans |
| Background removal | Custom ML model or edge detection | rembg with birefnet-general | Already validated 95%+ accuracy in Phase 1; production-ready |
| WebP optimization | Custom Sharp scripts per asset type | Phase 1 pipeline (quality 80, effort 6) | Already tested, meets <200KB target |
| Parallax scroll calculation | Custom physics/motion code | useParallax hook (already exists) | Phase 4 implemented gyroscope + gesture support |
| Sprite animation | CSS keyframes or canvas drawing | Existing GIF mascots + InteractiveMascot component | Already working system with 7 variants |

**Key insight:** Phase 1 asset pipeline (rembg + Sharp) and Phase 4 parallax/particle systems are production-ready. Don't rebuild — generate raw assets via Midjourney, then feed into existing pipeline.

## Common Pitfalls

### Pitfall 1: Character Inconsistency Across Sprite States
**What goes wrong:** Lexi looks different in idle vs. celebrate vs. sad states (different face structure, colors, proportions)
**Why it happens:** Each Midjourney generation without --cref creates a new "character"
**How to avoid:**
- Always use --cref flag pointing to approved Lexi mascot reference image
- Use --cw 70-80 for high character consistency (allows pose variation but locks appearance)
- Generate all 4 states (idle, celebrate, sad, hint) in same session with same --cref
**Warning signs:**
- Face shape changes between poses
- Color palette shifts (e.g., brown feathers → gray feathers)
- Style inconsistency (cartoon → semi-realistic)

### Pitfall 2: Parallax Layer Visual Disconnect
**What goes wrong:** Parallax layers look like separate images pasted together, not a cohesive scene
**Why it happens:** Each layer generated independently without shared lighting/color palette/perspective
**How to avoid:**
- Generate full background first, then extract layers from same base image using Photoshop/Figma
- OR use same --sref style reference for all layers in a world
- OR generate all layers in one prompt, then manually separate: "meadow scene with distant hills, mid-ground grass, and foreground flowers --sref STYLE_ID"
**Warning signs:**
- Lighting direction differs between layers (sun from left on hills, from right on grass)
- Color temperature mismatches (warm hills, cool grass)
- Perspective angles conflict (flat horizon + tilted foreground)

### Pitfall 3: Special Tile Graphics Obscure Letters
**What goes wrong:** Gold/ice/bomb/rainbow tile graphics make letters hard to read
**Why it happens:** Complex tile designs with busy patterns or high-contrast backgrounds
**How to avoid:**
- Keep tile designs MINIMAL (subtle border glow or texture, not full graphic)
- Use CSS overlays for effects (shimmer, pulse, glow) rather than baked-in animations
- Test readability: black letter on white background should still be 80%+ legible
**Warning signs:**
- User testing reports "can't read letters on special tiles"
- High contrast patterns (checkerboards, stripes) compete with letter visibility
- Tile graphic extends beyond tile border (occludes adjacent tiles)

### Pitfall 4: File Size Explosion (>200KB per asset)
**What goes wrong:** AI-generated images are 1-3MB PNGs, blow past 200KB mobile target
**Why it happens:** Midjourney outputs high-resolution (1024x1024+) PNGs by default
**How to avoid:**
- ALWAYS run through Sharp WebP optimization (quality 80, effort 6)
- If still >200KB, reduce quality to 70 or resize to 768x768
- Parallax layers can be 512px height (not full 1024x1024)
**Warning signs:**
- Initial PNG downloads are 1.5MB+
- WebP optimization at quality 80 still produces 250KB+ files
- Lighthouse performance score drops below 90

### Pitfall 5: Prompt Hallucination (Hex Codes, Technical Jargon)
**What goes wrong:** Midjourney interprets "#FF6B35" or "birefnet-general" as visual elements in the image
**Why it happens:** Prompts include technical specifications or code syntax
**How to avoid:**
- Use natural language: "bright orange glow" NOT "#FF6B35 glow"
- Avoid technical terms: "crystalline purple cave" NOT "purple cavern birefnet-general model"
- Save technical specs in external docs, keep prompts semantic
**Warning signs:**
- Generated images contain visible text or code-like symbols
- Color accuracy is off (requested "orange" but got magenta)
- Images contain random technical artifacts

## Code Examples

Verified patterns from existing codebase and official sources:

### Consuming Background Assets (WorldBackground Component)
```typescript
// Source: components/adventure/themed/WorldBackground.tsx
const WorldBackground = memo<WorldBackgroundProps>(({ className, children }) => {
  const { theme } = useAdventureTheme();
  const { background } = theme;
  const { x: parallaxX, y: parallaxY } = useParallax({
    intensity: 0.8,
    enableGyroscope: true,
  });

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Base color layer */}
      <div className={cn('absolute inset-0', background.baseColor)} />

      {/* Parallax layers */}
      {background.layers.map((layer, index) => {
        const transformX = parallaxX * layer.depth;
        const transformY = parallaxY * layer.depth;

        return (
          <motion.div
            key={layer.id}
            className={layer.className}
            style={{
              opacity: layer.opacity,
              zIndex: index,
              transform: `translate(${transformX}px, ${transformY}px)`,
              backgroundImage: layer.source.startsWith('bg-')
                ? undefined
                : `url(${layer.source})`,
            }}
          />
        );
      })}

      {/* Content layer */}
      <div className="relative z-50">{children}</div>
    </div>
  );
});
```

### Consuming Special Tile Assets (ThemedTile Component)
```typescript
// Source: components/adventure/themed/ThemedTile.tsx
// Special tiles use CSS overlays, NOT image backgrounds

// Gold tile - sparkle overlay
{config.overlayType === 'sparkle' && (
  <motion.div
    className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo"
    animate={{
      background: [
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
        'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)',
      ],
    }}
    transition={{ duration: 2, repeat: Infinity }}
  />
)}

// Ice tile - frost overlay
{config.overlayType === 'frost' && (
  <div className={cn(
    'absolute inset-0 rounded-neo pointer-events-none',
    'bg-gradient-to-br from-white/40 via-cyan-100/30 to-blue-200/40',
    'backdrop-blur-[1px]'
  )} />
)}

// Bomb tile - pulsing glow
{config.overlayType === 'flames' && (
  <motion.div
    className="absolute inset-0 pointer-events-none rounded-neo"
    animate={{
      boxShadow: [
        '0 0 5px rgba(255, 100, 50, 0.4)',
        '0 0 15px rgba(255, 100, 50, 0.7)',
      ],
    }}
    transition={{ duration: 1, repeat: Infinity }}
  />
)}
```

### Lexi Sprite Consumption (InteractiveMascot Component)
```typescript
// Source: components/ui/InteractiveMascot.tsx
// Uses existing GIF sprites in public/mascot/

export type MascotVariant =
  | 'happy'       // main-nobg.gif
  | 'celebration' // celebration-nobg.gif
  | 'thinking'    // study-nobg.gif
  | 'oops';       // oops-nobg.gif

// Mapping for LexiReaction component
const LEXI_STATE_TO_VARIANT: Record<string, MascotVariant> = {
  idle: 'happy',
  celebrate: 'celebration',
  sad: 'thinking',  // Pensive look
  hint: 'happy',    // Helpful/encouraging
};

// NOTE: If generating NEW Lexi sprites for adventure mode,
// they should match existing GIF aesthetic (stylized cartoon owl)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Midjourney v6 (2024) | Midjourney v8 Omni-Reference (2026) | January 2026 | Character consistency dramatically improved; --cref now maintains facial features, body type, AND clothing across generations |
| Manual PNG optimization | Sharp WebP quality 80 + effort 6 | Phase 1 (2025) | File sizes reduced 60-70%; all assets <200KB target |
| U2Net background removal (90% accuracy) | birefnet-general model (95%+ accuracy) | Phase 1 (2025) | Cleaner sprite edges, less alpha matting artifacts |
| Fixed viewport parallax | Container query units (cqw, cqi) | Phase 4 (2025) | Responsive backgrounds scale with parent container, not viewport |

**Deprecated/outdated:**
- **Midjourney v6 --cref**: v8 Omni-Reference supersedes with better consistency (upgrade prompts to --v 8)
- **Midjourney Discord bot in DMs**: Now requires server channel (policy change 2025)
- **PNG sprites**: All new sprites should be WebP (60-70% smaller, same visual quality)

## Open Questions

Things that couldn't be fully resolved:

1. **Midjourney Discord workflow automation**
   - What we know: No official API; unofficial APIs violate TOS
   - What's unclear: Can we use Discord webhooks to monitor generation completion and auto-download?
   - Recommendation: Manual workflow for Phase 6 (21 assets total); revisit automation if official API launches

2. **Special tile background vs. overlay approach**
   - What we know: ThemedTile already uses CSS overlays (sparkle, frost, flames); no image backgrounds
   - What's unclear: Do we need tile graphics at all, or just CSS? CONTEXT.md says "static images with CSS/canvas effects"
   - Recommendation: Generate subtle tile border/texture graphics (128x128) as WebP, overlay CSS effects on top

3. **Lexi sprite frame count for smooth animation**
   - What we know: CONTEXT.md specifies "2-3 frames per animation"
   - What's unclear: Are 2 frames enough for smooth loop, or will it feel choppy?
   - Recommendation: Generate 3 frames per state (idle, celebrate, sad, hint) = 12 total sprites; can reduce to 2 if file size/performance constraints

4. **Parallax layer resolution vs. file size tradeoff**
   - What we know: 1024x1024 full backgrounds + 3 parallax layers = 4 images per world = ~800KB raw PNG
   - What's unclear: Can we reduce parallax layer resolution to 512px height without visual quality loss?
   - Recommendation: Test 1024x512 for parallax layers (horizontal scenes); compress to <150KB each with WebP

## Sources

### Primary (HIGH confidence)
- [Midjourney v8 Character Reference Documentation](https://aiwisepicks.com/tools/midjourney/) - Character consistency features verified (--cref, --cw flags)
- [Sharp WebP Optimization (npm package)](https://www.npmjs.com/package/sharp) - Already installed v0.34.5, quality 80 + effort 6 validated in Phase 1
- Existing codebase:
  - `components/adventure/themed/WorldBackground.tsx` - Parallax layer consumption
  - `components/adventure/themed/ThemedTile.tsx` - CSS overlay approach for special tiles
  - `lib/adventure/themes/world1.ts` - Background configuration structure (3-layer parallax)
  - `components/ui/InteractiveMascot.tsx` - Lexi mascot variant system (7 GIF states)

### Secondary (MEDIUM confidence)
- [Parallax Scrolling Best Practices (GameMaker.io)](https://gamemaker.io/en/blog/creating-depth-and-immersion-parallax) - 3-4 layer architecture, depth ratios 0.1-0.5
- [CSS Glow Effects Collection (FreeFrontend)](https://freefrontend.com/css-glow-effects/) - Shimmer, pulse, glow techniques for special tiles
- [AI Background Removal Comparison (LetsEnhance)](https://letsenhance.io/blog/all/ai-background-removals/) - birefnet-general vs. U2Net accuracy comparison
- [Midjourney Consistency Evolution (VentureBeat)](https://venturebeat.com/ai/midjourney-debuts-feature-for-generating-consistent-characters-across-multiple-gen-ai-images) - --cref feature introduction (March 2024)

### Tertiary (LOW confidence)
- [Unofficial Midjourney API Comparison](https://www.myarchitectai.com/blog/midjourney-apis) - Third-party APIs listed (not recommended due to TOS violations)
- [Game Tile Design Inspiration (itch.io)](https://itch.io/game-assets/tag-ice) - Ice/rainbow tile visual examples (no LexiClash-specific guidance)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Midjourney v8 features verified via official sources; no official API confirmed
- Architecture: HIGH - Existing codebase shows 3-layer parallax pattern + CSS overlay approach
- Pitfalls: MEDIUM - Character consistency and file size issues well-documented; layer cohesion based on game design best practices (not LexiClash-specific testing)

**Research date:** 2026-01-23
**Valid until:** 30 days (stable tools; Midjourney API status may change)
