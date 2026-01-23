# Phase 6: AI Asset Generation - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-ready pipeline generates all visual assets for Worlds 1-3 (Alphabet Meadows, Synonym Springs, Root Caverns) with consistent style. Includes AI-generated backgrounds, Lexi mascot sprite sheets, special tile graphics, and background removal pipeline. All assets optimized to WebP <200KB.

</domain>

<decisions>
## Implementation Decisions

### Art Style & Consistency
- Stylized cartoon aesthetic (bold outlines, saturated colors, playful proportions)
- Distinct color palettes per world (green meadows, blue springs, purple caves)
- Midjourney as primary AI generation tool
- Both style reference images AND detailed prompt templates for consistency
- Document exact prompt keywords, settings, and post-processing rules

### World Backgrounds
- Single version per world (no day/night variants)
- Claude proposes thematic elements based on world names:
  - Meadows: flowers, grass, butterflies
  - Springs: water, streams, droplets
  - Caverns: crystals, rocks, underground
- Parallax layers and foreground/gameplay integration at Claude's discretion

### Special Tile Graphics
- Static images with CSS/canvas effects (shimmer, pulse, glow)
- Subtle enhancement approach — same tile shape, distinctive border/glow
- Letters must stay readable on all special tiles
- Universal design across all worlds (no world-specific variations)
- Visual metaphors at Claude's discretion based on game UX practices

### Lexi Sprite States
- Core 4 states only: idle, celebrate, sad, hint
- 2-3 frames per animation (simple loops, subtle breathing/bounce)
- Maintain existing Lexi character design
- Use Midjourney --cref flag with existing Lexi image for consistency

### Claude's Discretion
- Parallax layer count (balance performance vs visual depth)
- Background integration with gameplay area
- Special tile visual metaphors (gold, ice, bomb, rainbow designs)
- World-specific thematic element details
- Post-processing workflow specifics

</decisions>

<specifics>
## Specific Ideas

- Art style reference: Cuphead/Hollow Knight energy (stylized cartoon, bold, playful)
- Midjourney workflow requires Discord — may need manual generation + download process
- Lexi already has established look — generate from existing assets, not from scratch
- Phase 4 already created particle systems (butterflies, droplets, crystals) — backgrounds should complement, not duplicate

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-ai-asset-generation*
*Context gathered: 2026-01-23*
