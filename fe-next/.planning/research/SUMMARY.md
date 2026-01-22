# Project Research Summary

**Project:** LexiClash Adventure Mode Enhancement
**Domain:** Word puzzle game with video cutscenes and AI-generated game art
**Researched:** 2026-01-22
**Confidence:** MEDIUM-HIGH

## Executive Summary

LexiClash Adventure Mode requires adding video cutscenes and AI-generated themed environments to existing Next.js 16 + React 19 word puzzle game. Research reveals three critical technical constraints: (1) Remotion video framework doesn't officially support React 19, requiring isolated React 18 context, (2) iOS Safari blocks video autoplay without `muted + playsinline`, and (3) AI image generation requires strict prompt version control to avoid style drift between worlds.

The recommended stack is Remotion 4.0 with Lambda rendering for videos, Flux 2 Dev API for backgrounds/tiles, Leonardo AI for character consistency (Lexi mascot), and rembg with BRIA RMBG-2.0 for background removal via Python microservice. This combination balances quality, cost (~$21-31/month), and integration complexity with existing Next.js infrastructure.

Key risk: Performance regressions on mobile from bundle size bloat (Remotion Player adds 200KB+), battery drain from particle effects, and video loading delays. Mitigation: pre-render videos at build time, use WebP assets <200KB, implement dynamic imports, and aggressive caching. All features must pass Lighthouse score threshold (90+) and work in Hebrew RTL mode.

## Key Findings

### Recommended Stack

**Critical Finding:** Remotion does NOT support React 19 as of Jan 2026, conflicting with Next.js 16's React 19.2 dependency. Solution: isolate Remotion in separate `remotion/` directory with React 18 context, render server-side, embed pre-rendered videos in Next.js using `@remotion/player`.

**Core technologies:**
- **Remotion 4.0.407** (video): Programmatic React-based video creation — isolated React 18 context required
- **Remotion Lambda** (rendering): Distributed AWS rendering at $0.01-0.05/minute — avoids Vercel function size limits
- **Flux 2 Dev API** (AI images): $0.013/image via Replicate, fine-tunable for neo-brutalist style — best quality/price ratio
- **Leonardo AI API** (character consistency): $9+/month, character reference feature for Lexi mascot — maintains visual consistency
- **rembg + BRIA RMBG-2.0** (background removal): Python microservice with GPU acceleration — state-of-the-art edge quality
- **Python FastAPI microservice** (deployment): Separate service on Railway/Fly.io (~$5-10/month) — handles background removal

**Integration Architecture:**
```
Next.js 16 (React 19)
├─ Adventure Mode UI
├─ @remotion/player (embed cutscenes)
└─ API routes → Flux 2 API, Python service

Remotion (React 18, isolated)
├─ Video compositions
└─ AWS Lambda rendering

Python Service (FastAPI)
└─ rembg background removal
```

**Deployment constraints:**
- Cannot deploy Remotion renderer to Vercel (headless browser exceeds function size limit)
- Videos must be pre-rendered during CI/CD or generated via Remotion Lambda
- Python service requires separate deployment (not on Vercel)

### Expected Features

**NOTE:** ARCHITECTURE.md was not found in research outputs. Feature recommendations based on FEATURES.md research only.

**Must have (table stakes):**
- **Game juice** (word selection trail, letter pop, score pop-ups, validation feedback) — players expect immediate responsive feedback
- **Clear progress indicators** (star thresholds, progress bars, time/moves counters) — without these players feel lost
- **Skippable animations** (tap to skip repeated intros, hold to skip victory) — respect player time on replays
- **Performance optimization** (sprite sheets, WebP <200KB, battery-friendly) — polish shouldn't drain battery
- **Visual hierarchy** (game board 70%+ screen, essential info only) — prevent clutter from obscuring gameplay

**Should have (competitive differentiators):**
- **Parallax backgrounds** (3-5 layers, world-specific animations) — creates "place" not just color swap
- **World-specific particles** (themed effects on word submission) — reinforces environment identity
- **Lexi guide moments** (level start, victory, struggle reactions) — emotional connection and personality
- **Dynamic board theming** (subtle tile decorations per world) — visual variety without obscuring letters
- **Video cutscenes** (15-30s world unlocks, skippable after 2s) — narrative payoff without disrupting flow

**Defer (v2+):**
- **Complex 3D environments** — 2D parallax achieves 90% immersion at 10% cost
- **Lengthy unskippable cutscenes** — violates accessibility guidelines, player frustration
- **Per-level custom mechanics** — cognitive load and tutorial fatigue
- **Social/competitive multiplayer in Adventure** — scope creep, separate mode already exists
- **Procedurally generated worlds** — hand-crafted 50 levels preferred over 1000 random

### Architecture Approach

**WARNING:** ARCHITECTURE.md missing from research outputs. Architecture insights inferred from STACK.md integration section.

**Major components:**
1. **Video Pipeline** — Remotion compositions (React 18) rendered via Lambda, embedded in Next.js as pre-rendered MP4/WebM files
2. **Asset Generation** — Scripts call Flux 2 API → Python service removes backgrounds → Sharp optimizes to WebP
3. **Theme System** — Multi-layer parallax backgrounds, world-specific particle systems, dynamic tile theming
4. **Lexi Mascot** — Sprite-based or Lottie animations triggered by gameplay events
5. **Performance Layer** — Sprite pooling, lazy loading, CDN caching, container queries for responsive scaling

**File organization:**
```
fe-next/
├── app/                    # Next.js 16 + React 19
├── remotion/               # Isolated React 18 context
│   ├── compositions/       # Video compositions
│   └── package.json        # Separate React 18 deps
├── python-services/
│   └── background-removal/ # FastAPI + rembg
├── scripts/
│   ├── generate-adventure-assets.ts
│   └── render-cutscenes.ts
└── public/
    ├── videos/             # Pre-rendered cutscenes
    └── images/             # Processed game assets
```

### Critical Pitfalls

1. **Remotion breaks Next.js production builds** — Webpack-in-Webpack conflict when using `@remotion/bundler` in API routes. **Avoid:** Pre-render videos during build, don't bundle renderer in Next.js routes.

2. **iOS Safari blocks all video playback** — Videos won't autoplay on iPhone without `muted playsinline` attributes. Low Power Mode disables autoplay entirely. **Avoid:** All cutscenes work muted (visual storytelling only), fallback to skip after 2s timeout.

3. **AI-generated assets lack consistency** — Style drift between images, "AI slop" aesthetic, wasted budget on unusable generations. **Avoid:** Lock down 3-5 "golden example" prompts, version control all prompts in git, use Leonardo AI character reference for Lexi.

4. **RTL support breaks in video content** — Hebrew subtitles render backwards, text overlays ignore `dir="rtl"`. **Avoid:** Generate separate video versions per language, test RTL from day one, use Unicode BIDI for subtitles.

5. **Bundle size bloat from Remotion Player** — 200KB+ bundle addition, FCP degrades 2-3 seconds. **Avoid:** Dynamic import Player component, pre-render videos to .mp4, use Player only in dev/preview tools.

6. **Background removal produces low-quality assets** — Rough edges, halos, disappearing details. **Avoid:** High-res AI generations (1024x1024 min), manual cleanup for hero assets, test on dark AND light backgrounds.

7. **Performance regressions from polish** — Particle effects tank FPS, large videos slow load, animations cause layout thrashing. **Avoid:** Performance budget 500KB/page, Lighthouse score must not drop >5 points, profile before/after.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes foundation before features, table stakes before differentiators, and addresses critical pitfalls early.

### Phase 1: Asset Pipeline & Performance Foundation
**Rationale:** Cannot build features without asset generation workflow and performance guardrails. Remotion React 19 incompatibility must be resolved before video work begins.

**Delivers:**
- Remotion 4.0 installed in isolated React 18 context
- Flux 2 API integration for image generation
- Python microservice deployed for background removal
- Asset optimization scripts (WebP compression, <200KB target)
- Performance budget enforcement (Lighthouse 90+, bundle <500KB)

**Addresses pitfalls:**
- Pitfall 1: Remotion production build issues (test early)
- Pitfall 3: AI asset consistency (establish golden prompts)
- Pitfall 5: Bundle size bloat (baseline measurement)
- Pitfall 7: Performance regressions (set budget before adding features)

**Research flag:** NEEDS RESEARCH — Remotion Lambda setup and cost optimization

### Phase 2: Core Game Juice (Table Stakes)
**Rationale:** Responsive feedback is baseline expectation. Without this, game feels unfinished. Must come before world theming to establish performance baseline.

**Delivers:**
- Word selection trail animation
- Letter pop/bounce on selection
- Word validation feedback (success glow, failure shake)
- Score pop-ups (+50 floats and fades)
- Progress bars and star threshold indicators
- Tile break animations (bomb, ice effects)

**Addresses features:**
- FEATURES.md "Game Juice" section (table stakes)
- FEATURES.md "Clear Progress Visualization"
- FEATURES.md "Performance Optimization"

**Addresses pitfalls:**
- Pitfall 7: Performance regressions (profile juice before adding more)

**Research flag:** STANDARD PATTERNS — Framer Motion already in stack, well-documented

### Phase 3: World Theming Layer
**Rationale:** With performance foundation and core juice working, add world-specific visual identity. Dependencies: asset pipeline (Phase 1), animation system (Phase 2).

**Delivers:**
- 3-5 layer parallax background system
- World-specific particle systems (4 themes: Crystal Caves, Alphabet Meadows, Pirate Cove, Enchanted Forest)
- Dynamic board theming (subtle tile decorations)
- Audio integration (world-specific loops)
- RTL testing for all themed elements

**Addresses features:**
- FEATURES.md "Environmental Storytelling"
- FEATURES.md "World-Specific Particle Systems"
- FEATURES.md "Dynamic Board Theming"

**Addresses pitfalls:**
- Pitfall 4: RTL support (test Hebrew rendering for all themes)
- Pitfall 6: Background removal quality (validate asset pipeline)

**Research flag:** NEEDS RESEARCH — Particle pooling performance optimization techniques

### Phase 4: Lexi Personality & Reactions
**Rationale:** Builds on core juice (Phase 2) triggers. Requires character assets from pipeline (Phase 1). Adds emotional layer without narrative complexity.

**Delivers:**
- Lexi sprite-based animations (wave, clap, thinking, dance, sad)
- Contextual reactions (level start, long word found, player stuck, victory, failure)
- Leonardo AI character reference training for consistency
- Skip functionality (tap to speed up 2x)

**Addresses features:**
- FEATURES.md "Lexi the Cat as Animated Guide"
- FEATURES.md "Skippable Animations"

**Addresses pitfalls:**
- Pitfall 3: AI consistency (Leonardo character reference critical here)

**Research flag:** STANDARD PATTERNS — Sprite animation well-documented

### Phase 5: Video Cutscenes (Optional Enhancement)
**Rationale:** Highest production cost, lowest ROI (skippable by nature). Defer until core experience polished. Can be added post-launch.

**Delivers:**
- Remotion compositions (LevelIntro, WorldTransition, Tutorial)
- Remotion Lambda rendering pipeline
- iOS Safari autoplay compatibility
- Language-specific video versions (4 languages with RTL)
- Preloading and lazy loading strategy

**Addresses features:**
- FEATURES.md "Contextual Video Cutscenes"

**Addresses pitfalls:**
- Pitfall 1: Remotion production builds (critical path)
- Pitfall 2: iOS Safari autoplay (mobile-first testing)
- Pitfall 4: RTL video support (separate renders per language)

**Research flag:** NEEDS RESEARCH — Video compression settings for neo-brutalist flat colors, Remotion Lambda cost optimization

**DEFER DECISION:** Validate if parallax backgrounds (Phase 3) + Lexi (Phase 4) create sufficient "adventure feel" before committing to video production.

### Phase Ordering Rationale

**Why this order:**
1. **Foundation first:** Cannot add features without asset pipeline and performance guardrails
2. **Table stakes before differentiators:** Responsive feedback is expected, videos are nice-to-have
3. **Dependencies:** Juice → Theming → Lexi → Videos (each builds on previous)
4. **Risk mitigation:** Test Remotion compatibility early (Phase 1), validate mobile performance before adding more (Phase 2-3)
5. **RTL throughout:** Hebrew testing required in every phase, not deferred to end
6. **Incremental value:** Each phase delivers playable improvement, not "all or nothing"

**Grouping logic:**
- Phase 1: Infrastructure and tools (enables later work)
- Phases 2-4: Visual polish layers (additive enhancements)
- Phase 5: Optional narrative layer (can be post-launch)

**Pitfall avoidance:**
- Test production builds early (Remotion compatibility in Phase 1, not Phase 5)
- Mobile testing throughout (iOS Safari in Phase 1-2, not deferred)
- Performance budgets enforced from Phase 1 (prevent regressions)
- AI prompt locking in Phase 1 (prevent style drift across phases)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1:** Remotion Lambda setup, AWS configuration, cost optimization
- **Phase 3:** Particle pooling performance benchmarks for mobile devices
- **Phase 5:** Video compression settings (neo-brutalist flat colors need high bitrate), multi-language video workflows

**Phases with standard patterns (skip research-phase):**
- **Phase 2:** Game juice animations (Framer Motion patterns well-documented)
- **Phase 4:** Sprite animations (standard web techniques)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified from official Remotion docs, Replicate API docs, rembg GitHub |
| Features | MEDIUM-HIGH | Research based on industry patterns, LexiClash-specific application needs validation |
| Architecture | **LOW** | **ARCHITECTURE.md missing from research outputs** — inferred from STACK.md only |
| Pitfalls | HIGH | Verified from official WebKit policies, Remotion docs, community issues |

**Overall confidence:** MEDIUM-HIGH

**Architecture gap critical:** Missing dedicated architecture research limits confidence in component boundaries, data flow patterns, and system design. Recommend creating ARCHITECTURE.md or validating inferred architecture during Phase 1 planning.

### Gaps to Address

**Critical gaps needing validation during implementation:**

1. **Remotion React 19 workaround validation** — Isolated React 18 context is theoretical solution, needs production build testing. RISK: May discover incompatibilities during Phase 1 that require rearchitecture.

2. **Mobile performance budget specifics** — Research suggests <200KB assets and 90+ Lighthouse score, but LexiClash-specific thresholds need profiling on target devices (low-end Android, older iPhones). Test in Phase 1.

3. **AI prompt consistency across 4 worlds** — Research recommends "golden prompts" but doesn't specify how to maintain style coherence across Crystal Caves, Meadows, Pirate Cove, Enchanted Forest. Needs experimentation in Phase 1.

4. **Particle system performance on low-end devices** — Research suggests sprite pooling and max 50 particles, but actual limits need benchmarking. Profile in Phase 3 before committing to particle complexity.

5. **RTL video production workflow** — Research identifies RTL as pitfall but doesn't detail production process for 4-language video variants. Needs workflow definition in Phase 5 planning (or earlier if video scope confirmed).

6. **BRIA RMBG commercial licensing** — Background removal model requires commercial license for production use. Cost and acquisition timeline unknown. RISK: Fallback to U2Net model (fully open source) may degrade quality. Clarify in Phase 1.

7. **Component architecture and data flow** — ARCHITECTURE.md missing limits understanding of how video/asset systems integrate with existing LexiClash game loop, state management, and multiplayer backend. Validate assumptions during Phase 1.

**Performance validation gaps:**
- Battery drain from continuous parallax animations (test Phase 3)
- Memory leaks from Remotion Player if used in production (test Phase 5)
- Skip rate analytics (if >80% skip videos in Phase 5, deprioritize)

**Style consistency validation:**
- Do parallax backgrounds alone create "world feel" or is audio required? (A/B test Phase 3)
- How often should Lexi appear without becoming annoying? (playtest Phase 4)
- Does dynamic board theming reduce letter readability? (accessibility testing Phase 3)

## Sources

### Primary (HIGH confidence)
- **Remotion Official Docs** — React 19 incompatibility, Next.js integration pitfalls, Lambda rendering
- **WebKit Blog** — iOS Safari video autoplay policies (verified Jan 2026 status)
- **Replicate API Docs** — Flux 2 pricing, game assets model, commercial licensing
- **rembg GitHub** — BRIA RMBG-2.0 model specs, Python installation, GPU acceleration

### Secondary (MEDIUM confidence)
- **WaveSpeedAI 2026 Guide** — AI image generator comparison, Flux 2 recommendations
- **Game Developer Magazine** — Puzzle game progression design patterns
- **Gamasutra** — Game polish best practices, diminishing returns analysis
- **Community Sources** — Remotion Next.js bundling issues (GitHub discussions), video compression artifacts (ResetEra forums)

### Tertiary (LOW confidence, needs validation)
- **Leonardo AI pricing** — Prices increased Q4 2025, current API tier costs unclear
- **Remotion Company License** — Pricing not disclosed publicly, needs quote
- **BRIA RMBG commercial license** — Cost and acquisition process undefined

### Research Completeness
**Files synthesized:** 3 of 4
- ✅ STACK.md (24KB, HIGH confidence)
- ✅ FEATURES.md (28KB, MEDIUM-HIGH confidence)
- ✅ PITFALLS.md (22KB, HIGH confidence)
- ❌ **ARCHITECTURE.md (MISSING)** — limits confidence in system design

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes (with architecture validation caveat)*
