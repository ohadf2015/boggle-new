# Phase 4: World Theming - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Each adventure world (Meadows, Springs, Caverns) has distinct visual identity through parallax backgrounds, particle effects, and board styling. This phase creates the theming infrastructure and applies it to Worlds 1-3. Audio design is out of scope (future phase).

</domain>

<decisions>
## Implementation Decisions

### Parallax Backgrounds
- Layer count: Claude's discretion (balance performance vs richness)
- Movement triggers: ALL THREE — device tilt (gyroscope), gesture-responsive, and ambient drift
- Combined triggers create an "always alive" feeling
- Animated elements: Mix approach — some worlds get animated GIFs (e.g., flying birds, floating leaves), others stay static
- User will create GIFs when needed for animated elements
- Reduced-motion: Layered but frozen (all layers visible, no parallax motion)

### Particle Systems
- Particle types: Mix of nature-themed and abstract per world
  - Some worlds literal (Springs = water droplets)
  - Others more abstract/magical
- Interactivity: Claude's discretion (based on performance/UX tradeoff)
- Density: Sparse (5-10 particles visible) — subtle atmosphere without distraction
- Layering: Occasional foreground — rare particles drift across board (like a single butterfly) for special moments

### Board Decorations
- Tile styling: BOTH texture overlay AND themed borders
  - Meadows: wood grain texture, vine borders
  - Springs: water ripple texture, crystal/water edges
  - Caverns: stone texture, crystal edges
- Board frame: Themed decorations per world
  - Meadows: vine corners
  - Springs: water splashes
  - Caverns: crystal clusters
- Letter styling: Subtle theming — world-specific accent color and light glow, but READABILITY IS PRIORITY
- Special tiles (gold, ice, bomb, rainbow): Adapt to world theme — same core design but world-specific appearance

### World Atmosphere
- Color palettes: Claude's discretion — define distinct palettes based on world names and mood
- Ambient lighting: Yes — warm sun glow (Meadows), cool water shimmer (Springs), crystal glow spots (Caverns)
- World transitions: Claude's discretion — pick appropriate transition style
- Audio: Visual-only for this phase — audio is future scope

### Claude's Discretion
- Exact layer count for parallax (performance vs richness tradeoff)
- Particle interactivity (touch-reactive or ambient-only)
- Specific color palette definitions per world
- Transition animation style between worlds
- Specific particle types per world (within nature/abstract mix)

</decisions>

<specifics>
## Specific Ideas

- "Always alive" parallax — combining gyroscope + gesture + ambient drift makes worlds feel living
- GIF-based animations for world elements (user can create these as needed)
- Sparse particles (5-10) — don't compete with gameplay
- Occasional foreground particle moments — like a single butterfly drifting across the board
- Special tiles adapt per world but keep core recognition intact
- Letters: themed but never at expense of readability

</specifics>

<deferred>
## Deferred Ideas

- Audio/sound design — future phase
- World-specific music/ambient tracks — future phase

</deferred>

---

*Phase: 04-world-theming*
*Context gathered: 2026-01-22*
