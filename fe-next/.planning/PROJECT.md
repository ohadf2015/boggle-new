# LexiClash

## What This Is

LexiClash is a multiplayer word game (Boggle-style) featuring real-time competitive gameplay, an immersive Adventure Mode with dynamic board mechanics, power-ups, meta-progression, and cinematic boss battles, daily challenges with AI-powered word validation, and an education mode for teachers to create vocabulary lessons.

## Core Value

**Adventure mode must feel immersive and connected to its themed worlds** — when playing "Crystal Caves," it should FEEL like Crystal Caves, not generic Boggle with a different label.

## Current State

**Shipped:** v2.0 Adventure Overhaul (2026-02-01)

**Tech Stack:**
- Next.js 16 + React 19 + TypeScript
- Socket.IO for real-time
- Supabase + Redis for data
- Framer Motion + GSAP for animations
- XState for boss state machines
- Zustand for high-frequency game state
- tsParticles for particle effects
- Remotion + Lottie + Skia for cinematics
- Neo-Brutalist design system (dark, bold, hard shadows)

**Codebase:**
- 135,606 lines TypeScript
- 4,900+ tests (1,400+ added in v2.0)
- 5 themed worlds with parallax layers
- 4 languages (EN, HE, SV, JA)

## Requirements

### Validated

<!-- Requirements shipped and verified -->

**v2.0 Adventure Overhaul:**
- ✓ XP system with leveling and progress bar — v2.0
- ✓ Gold currency for permanent stat upgrades — v2.0
- ✓ Candy Crush-style tile cascades — v2.0
- ✓ Special tiles (frozen, locked, multiplier) — v2.0
- ✓ Power-ups: Freeze Time, Hint, Score Multiplier — v2.0
- ✓ Power-up cooldowns with radial visualization — v2.0
- ✓ Invisible adaptive difficulty (3-tier) — v2.0
- ✓ Gradual hint escalation after failures — v2.0
- ✓ Boss 5-phase state machine — v2.0
- ✓ Boss telegraphed attacks (2s warning) — v2.0
- ✓ Boss unique abilities (24 across 10 bosses) — v2.0
- ✓ Boss cinematic intros (8s, skippable) — v2.0
- ✓ Skill tree with 3 paths (Power/Strategy/Utility) — v2.0
- ✓ Horizontal skill progression (strategies, not just stats) — v2.0
- ✓ Achievement system with 4 tiers — v2.0
- ✓ Layered particle effects with budget — v2.0
- ✓ Victory/defeat cinematics — v2.0
- ✓ AI Director with flow state detection — v2.0
- ✓ Invisible intensity adjustments (10% gradual) — v2.0
- ✓ World 4 Idiom Archipelago full theming — v2.0
- ✓ World 5 Compound Canyon full theming — v2.0
- ✓ Entry timing optimized (2.38s → 1.86s) — v2.0
- ✓ MP4 rendering pipeline — v2.0
- ✓ Lexi stuck detection (30s timeout) — v2.0

**v1.1 Adventure & Education:**
- ✓ Chain combo system with 1.5x multiplier — v1.1
- ✓ Combo tier feedback (Nice/Great/Amazing/Legendary) — v1.1
- ✓ Boss battle foundation (10 bosses with mechanics) — v1.1
- ✓ Education XP and leveling system — v1.1
- ✓ Achievement badges (18 types, 4 tiers) — v1.1
- ✓ Classroom leaderboards — v1.1
- ✓ Rich lesson delivery with TTS — v1.1
- ✓ Swipeable flashcard review — v1.1
- ✓ Student analytics dashboard — v1.1

**v1.2 Platform Integration:**
- ✓ CrazyGames SDK integration — v1.2
- ✓ Native iOS/Android apps (Capacitor) — v1.2

**v1.0 Stabilization:**
- ✓ World-specific parallax backgrounds for Worlds 1-3 — v1.0
- ✓ World-specific floating particles — v1.0
- ✓ Dynamic board theming — v1.0
- ✓ Word selection trail animation — v1.0
- ✓ Level entry tile cascade animation — v1.0
- ✓ Lexi mascot celebration reactions — v1.0
- ✓ AI-generated backgrounds for all 3 worlds — v1.0
- ✓ Video compositions (level intro, world transition) — v1.0
- ✓ Wikipedia word extraction and auto-promotion — v1.0
- ✓ Teacher vocabulary builder — v1.0
- ✓ Student classroom join flow — v1.0

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

*No active requirements — run `/gsd:new-milestone` to define v2.1 scope*

### Out of Scope

- 3D effects — not aligned with Neo-Brutalist design, performance concerns
- Lengthy unskippable cutscenes — accessibility violation (all cinematics skip after 2s)
- Procedurally generated levels — quality control, hand-crafted preferred
- Multiplayer adventure mode — focus on single-player polish first
- Free-to-play monetization — premium game, power-ups never required
- Per-level unique mechanics — save for future milestone

## Context

**What was built in v2.0:**
- Meta-progression with XP, gold, and permanent upgrades
- Dynamic board with Candy Crush-style cascades and special tiles
- Power-up system with Freeze Time, Hint, Score Multiplier
- Invisible adaptive difficulty with 3-tier system
- Boss battle overhaul with 5-phase state machine and 24 abilities
- Skill tree with 13 skills across 3 horizontal progression paths
- Achievement system with 17 badges and 4 tiers
- Visual polish with layered particles and cinematics
- AI Director using Csikszentmihalyi flow model
- Worlds 4-5 fully themed (Idiom Archipelago, Compound Canyon)
- Tech debt cleanup (entry timing, MP4 rendering, bug fixes)

**Known Tech Debt (from v2.0 audit):**
- Test maintenance: AdventureGame.scorePopup.test.tsx mocks removed component (8 tests need updating)
- AdventureHUD integration: Component exists but elements rendered inline
- useLayeredCelebration: Hook exists but unused (BossDefeatFireworks uses NewYearFireworks directly)
- User ID placeholder: 'temp-user-id' in AdventureGame needs auth integration

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| XState for boss state machine | Complex 5-phase logic needs formal state management | ✓ Good |
| Zustand for high-frequency state | Avoid React Context re-render cascade | ✓ Good |
| 10% gradual adjustments for DDA | Prevent rubber-banding perception | ✓ Good |
| Boss fights excluded from DDA | Learnable patterns more important | ✓ Good |
| Horizontal skill progression | Enable strategies, not inflate numbers | ✓ Good |
| Transform-first animations | GPU-accelerated, avoid layout thrashing | ✓ Good |
| Particle budget enforcement | Performance on mobile devices | ✓ Good |
| 2s skip delay for cinematics | Balance drama with accessibility | ✓ Good |
| Entry timing parallel animations | Reduced 2.38s to 1.86s (22% faster) | ✓ Good |
| Csikszentmihalyi flow model | Academic foundation for difficulty tuning | ✓ Good |

## Constraints

- **Design System**: Neo-Brutalist with hard shadows (no blur), chunky borders, Fredoka/Rubik fonts
- **RTL Support**: Hebrew must work correctly (shadows flip, layout adjusts)
- **Translation-First**: All UI text via `t()` function, 4 languages
- **Performance**: Animations must support reduced-motion preference
- **File Size**: Max 500 lines per file, split larger
- **Particle Budget**: 50-100 max particles, adaptive reduction on low-end devices

---
*Last updated: 2026-02-01 after v2.0 milestone*
