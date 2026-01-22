# Phase 1: Infrastructure Foundation - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish asset generation and optimization pipeline that enables all visual polish work. This includes:
- Remotion 4.0 workspace with React 18 isolation
- AI image generation via Image MCP
- Python background removal pipeline
- Asset optimization to WebP <200KB
- Video delivery strategy

This phase creates the infrastructure — actual asset generation and videos are Phase 6-7.

</domain>

<decisions>
## Implementation Decisions

### AI Image Generation
- Use **Image MCP** for all image generation (already configured)
- Generate all asset types: world backgrounds, character sprites (Lexi), UI elements, special tiles
- Output format: **WebP < 200KB** for mobile performance
- All generated images optimized before integration

### Style Consistency
- **Claude's Discretion**: Choose best approach for style consistency
- Options to explore: golden prompts, style references, or combination
- Must align with Neo-Brutalist design system (dark, bold, hard shadows)

### Remotion Setup
- **Claude's Discretion**: Monorepo structure and build integration
- Must isolate React 18 (incompatible with project's React 19)
- Research suggested sibling workspace alongside Next.js

### Background Removal
- **Claude's Discretion**: rembg vs other tools, local vs microservice
- Must produce clean edges suitable for game assets
- Process generated images before they enter asset pipeline

### Video Delivery
- **Claude's Discretion**: Lambda vs bundled vs CDN strategy
- Must work on iOS Safari (muted autoplay + playsinline)
- Consider cost vs performance tradeoffs

</decisions>

<specifics>
## Specific Ideas

- Image MCP is already set up and preferred for consistency with existing workflow
- Neo-Brutalist style: dark backgrounds, bold colors, hard shadows (no blur)
- Research flagged iOS Safari as critical validation target for videos
- Mobile performance is priority (<200KB per asset, Lighthouse 90+)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-infrastructure-foundation*
*Context gathered: 2026-01-22*
