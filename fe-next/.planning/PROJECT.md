# LexiClash - Stabilization Milestone

## What This Is

LexiClash is a multiplayer word game (Boggle-style) with real-time gameplay, adventure mode, daily challenges, and AI-powered word validation. This milestone focuses on stabilizing existing features and bringing adventure mode to production quality — making the game feel polished and ready for real users.

## Core Value

**Adventure mode must feel immersive and connected to its themed worlds** — when playing "Crystal Caves," it should FEEL like Crystal Caves, not generic Boggle with a different label.

## Requirements

### Validated

<!-- Existing working features from codebase -->

- ✓ Multiplayer real-time gameplay — existing
- ✓ World map navigation in adventure mode — existing
- ✓ Basic adventure gameplay (grid, word finding, timer) — existing
- ✓ Daily challenge system — existing
- ✓ AI word validation pipeline — existing
- ✓ Multi-language support (EN, HE, SV, JA) — existing
- ✓ User authentication (Supabase) — existing
- ✓ Leaderboard system — existing

### Active

<!-- Current scope for this milestone -->

**Adventure Mode Polish:**
- [ ] In-game UI reflects world themes (not generic)
- [ ] Level entry animations and dramatic reveals
- [ ] World-specific atmospheres (particles, backgrounds)
- [ ] Special tiles working (gold, ice, bomb, rainbow)
- [ ] Level progression feels rewarding (stars, unlocks)
- [ ] Celebration effects on completion

**Wikipedia Words:**
- [ ] Fix word extraction from Wikipedia pages
- [ ] Words sync properly from admin dashboard to game

**Invalid Word System:**
- [ ] Track frequently rejected words
- [ ] Admin review queue for popular invalid submissions
- [ ] Ability to approve words from queue

**Daily Challenge Bugs:**
- [ ] Fix word hunt issues (discover specifics during work)
- [ ] General stabilization

**Content Creation (Remotion + AI Images):**
- [ ] World backgrounds for Worlds 1-3 (meadows, springs, caverns)
- [ ] Character assets (Lexi mascot, enemies, NPCs)
- [ ] UI elements (themed buttons, frames, decorations)
- [ ] Special tile graphics (gold, ice, bomb, rainbow)
- [ ] Level intro cutscenes (Remotion videos)
- [ ] World transition animations (Remotion videos)
- [ ] Tutorial/onboarding videos (Remotion videos)
- [ ] Background removal pipeline (Python script)

**General:**
- [ ] Fix loose ends and bugs discovered during work

### Out of Scope

- Boss battles (Crystal Dragon, etc.) — future milestone
- Chain/cascade auto-combo system — future milestone
- New worlds beyond World 3 — future milestone
- Mobile app — web-first for now
- New multiplayer modes — stabilize existing first

## Context

**Existing Plans:**
Adventure mode has detailed design specs in `.claude/agents/plans/`:
- `adventure-mode-design-spec.md` — full vision with UI mockups
- `adventure-mode-level-design-enhancement.md` — visual polish plan
- Sprint plans (1-5) — implementation breakdown

**Current State:**
- Adventure mode is partially implemented
- World map works, basic gameplay works
- In-game UI is generic — doesn't connect to world themes
- Wikipedia word extraction is broken
- No admin queue for invalid words
- Daily challenge has unspecified bugs

**Tech Stack:**
- Next.js 16 + React 19 + TypeScript
- Socket.IO for real-time
- Supabase + Redis for data
- Framer Motion for animations
- Neo-Brutalist design system (dark, bold, hard shadows)

## Constraints

- **Design System**: Neo-Brutalist with hard shadows (no blur), chunky borders, Fredoka/Rubik fonts
- **RTL Support**: Hebrew must work correctly (shadows flip, layout adjusts)
- **Translation-First**: All UI text via `t()` function, 4 languages
- **Performance**: Animations must support reduced-motion preference
- **File Size**: Max 500 lines per file, split larger

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on Worlds 1-3 only | Ship polished subset before expanding | — Pending |
| Skip boss battles for now | Core adventure loop more important | — Pending |
| Admin queue over auto-approve | Human review ensures quality | — Pending |

---
*Last updated: 2026-01-22 after initialization*
