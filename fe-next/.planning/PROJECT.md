# LexiClash

## What This Is

LexiClash is a multiplayer word game (Boggle-style) with real-time gameplay, immersive adventure mode, daily challenges, AI-powered word validation, and an education mode for teachers to create vocabulary lessons.

## Core Value

**Adventure mode must feel immersive and connected to its themed worlds** — when playing "Crystal Caves," it should FEEL like Crystal Caves, not generic Boggle with a different label.

## Current State

**Shipped:** v1.0 Stabilization (2026-01-25)

**Tech Stack:**
- Next.js 16 + React 19 + TypeScript
- Socket.IO for real-time
- Supabase + Redis for data
- Framer Motion for animations
- Remotion for video compositions
- Neo-Brutalist design system (dark, bold, hard shadows)

**Codebase:**
- 309,792 lines TypeScript
- 3,481 tests (99.6% pass rate)
- 71 optimized WebP assets
- 4 languages (EN, HE, SV, JA)

## Requirements

### Validated

<!-- Requirements shipped in v1.0 -->

**Adventure Polish:**
- ✓ World-specific parallax backgrounds for Worlds 1-3 — v1.0
- ✓ World-specific floating particles — v1.0
- ✓ Dynamic board theming — v1.0
- ✓ Word selection trail animation — v1.0
- ✓ Letter pop animation on valid word — v1.0
- ✓ Score pop-up animation with combo multipliers — v1.0
- ✓ Level entry tile cascade animation — v1.0
- ✓ Objective cards slide-in reveal — v1.0
- ✓ Level title burst animation — v1.0
- ✓ Lexi mascot celebration reactions — v1.0
- ✓ Lexi contextual feedback — v1.0
- ✓ Level complete star burst animation — v1.0

**Content Creation:**
- ✓ AI-generated backgrounds for all 3 worlds — v1.0
- ✓ Special tile graphics (CSS overlays) — v1.0
- ✓ Background removal pipeline — v1.0
- ✓ Video compositions (level intro, world transition, tutorial) — v1.0

**Infrastructure:**
- ✓ Remotion workspace with React 19 — v1.0
- ✓ AI image generation pipeline — v1.0
- ✓ Asset optimization (WebP, <200KB) — v1.0
- ✓ Video delivery strategy — v1.0

**Content Pipeline:**
- ✓ Wikipedia word extraction — v1.0
- ✓ Admin bulk approve UI — v1.0
- ✓ Invalid word tracking and approval — v1.0

**Education:**
- ✓ Teacher vocabulary builder — v1.0
- ✓ Student classroom join flow — v1.0
- ✓ Lesson assignment system — v1.0
- ✓ Student practice mode — v1.0

**Existing (pre-v1):**
- ✓ Multiplayer real-time gameplay — existing
- ✓ World map navigation in adventure mode — existing
- ✓ Daily challenge system — existing
- ✓ AI word validation pipeline — existing
- ✓ Multi-language support (EN, HE, SV, JA) — existing
- ✓ User authentication (Supabase) — existing
- ✓ Leaderboard system — existing

### Active

<!-- Next milestone scope - to be defined -->

No active requirements. Run `/gsd:new-milestone` to define next milestone.

### Out of Scope

- Boss battles (Crystal Dragon, etc.) — future milestone
- Chain/cascade auto-combo system — future milestone
- Worlds 4+ content — future milestone
- Mobile app — web-first for now
- 3D effects — not aligned with neo-brutalist style
- Unskippable cutscenes — players resent forced waits
- Per-level unique mechanics — save for future milestone
- Multiplayer adventure mode — focus on single-player polish first

## Context

**What was built in v1.0:**
- Adventure mode with full world theming (parallax, particles, board decorations)
- Core game juice (word trails, letter pops, score animations)
- Level entry experience (cascade, objectives, title burst)
- Lexi mascot reactions integrated throughout
- AI content pipeline (backgrounds, WebP optimization)
- Video composition infrastructure (Remotion)
- Wikipedia integration with auto-promotion
- Invalid word admin system
- Teacher vocabulary builder with classrooms and lessons
- Education landing page and student join flow

**Known Tech Debt:**
- Entry sequence timing 2.38s exceeds 2s target by 380ms
- Video MP4 files not rendered (render script ready)
- Medium/low bugs documented (BUG-004 through BUG-008)
- Stuck detection for Lexi deferred

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on Worlds 1-3 only | Ship polished subset before expanding | ✓ Good |
| Skip boss battles for now | Core adventure loop more important | ✓ Good |
| Admin queue over auto-approve | Human review ensures quality | ✓ Good |
| Remotion 4.0.381 with React 19 | Native support, no isolation needed | ✓ Good |
| birefnet-general for background removal | 95%+ accuracy vs U2Net 90% | ✓ Good |
| Score threshold 80 for auto-promotion | High-confidence words only | ✓ Good |
| CSS overlays for tile graphics | Simpler than image assets | ✓ Good |
| 3s cooldown between Lexi reactions | Prevents spam, respects player | ✓ Good |
| Combined parallax (gyro+gesture+ambient) | "Always alive" feel | ✓ Good |
| Education as separate section | Distinct flow from main game | ✓ Good |

## Constraints

- **Design System**: Neo-Brutalist with hard shadows (no blur), chunky borders, Fredoka/Rubik fonts
- **RTL Support**: Hebrew must work correctly (shadows flip, layout adjusts)
- **Translation-First**: All UI text via `t()` function, 4 languages
- **Performance**: Animations must support reduced-motion preference
- **File Size**: Max 500 lines per file, split larger

---
*Last updated: 2026-01-25 after v1.0 milestone*
