# Phase 7: Video Cutscenes - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Remotion-powered video cutscenes at key game moments: level intro flyby, world unlock transitions, and tutorial onboarding. Videos work across all 4 languages with iOS Safari compatibility (muted autoplay, playsinline). Skip behavior and playback triggers are implementation details.

</domain>

<decisions>
## Implementation Decisions

### Video content & tone
- Playful adventure tone — light, encouraging, Lexi guides through whimsical worlds, kid-friendly energy
- No dramatic cinematic feel — keep it fun and accessible

### Level intro cutscene
- Quick world flyby only (5-10s max)
- Fast visual sweep of current world theme
- No dialog, no objectives displayed — purely visual atmosphere setter
- Objectives shown in game UI before/after video, not in video

### World transition video
- Portal/gateway animation style
- Visual transition showing path from old world to new
- Example: meadow fades to springs, crystals appear as entering caverns
- Focus on the journey between worlds

### Tutorial video
- Minimal UI highlights approach
- Quick overlay showing: swipe letters → form words → score points
- UI callouts, not character-led demonstration
- Keep it brief and scannable

### Language handling
- Minimal text in videos — mostly visual with music
- Objectives and instructions handled by game UI, not video
- When text must appear (world names), render separate video per language (4 variants)
- No voiceover or narration — eliminates dubbing complexity

### RTL treatment
- Keep video direction/composition the same for all languages
- Only ensure Hebrew text renders right-to-left when text appears
- No mirrored compositions — Lexi always enters from same side

### Audio approach
- Sound effects + music (no voice)
- World ambient sounds layered with background music
- Birds/nature for Meadows, water sounds for Springs, crystal echoes for Caverns
- Music matches world theme

### Claude's Discretion
- Exact video durations within guidelines (5-10s intro, appropriate transition/tutorial length)
- Remotion composition structure and animation timing
- Skip button visual treatment and timing (2s delay mentioned in requirements)
- Video delivery method (Lambda vs bundled — noted as deferred from Phase 1)
- Specific Remotion components and animation libraries

</decisions>

<specifics>
## Specific Ideas

- Videos should feel like quick "establishing shots" — set the mood, don't tell a story
- Portal transitions should feel magical but fast — don't drag the unlock moment
- Tutorial should be skippable from first second (unlike intro cutscenes)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-video-cutscenes*
*Context gathered: 2026-01-23*
