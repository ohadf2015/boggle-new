# Product

## Register

brand

> The logged-out homepage (`app/[locale]/page.tsx` → `LandingView`) is a marketing/landing surface: a visitor's first impression IS the product. The rest of the app (game screens, admin, dashboards) is `product` register — override per task. This file's default is `brand` because impeccable work here targets the landing.

## Users
Mixed casual + competitive word-game players, ages 15-40. Arrive on phones (primary) and TV/party screens (secondary). 5 languages incl. Hebrew (RTL). On the landing they are deciding, in seconds, whether this looks fun enough to tap "Play". Many are first-time visitors with zero context on the modes.

## Product Purpose
LexiClash is a quirky competitive word game (Boggle-lineage) with many modes: daily challenge, multiplayer arena/blast, solo adventure, connections, brain training, word wheel, word tower, practice. The homepage's job: convey party energy + competitive edge instantly, and route the visitor into a mode with one confident tap. Success = first-tap-to-play, not comprehension of the full catalog.

## Brand Personality
Quirky, electric, loud — party energy + competitive edge + surprising charm. Three words: **playful, electric, bold**. Should feel like a neon arcade cabinet, not a productivity SaaS. Personality everywhere (mascot, micro-copy, motion), but competitive clarity wins when they conflict.

## Anti-references
- Generic mobile-game UI (endless identical gradient cards).
- Soft gradients, glassmorphism, corporate/SaaS aesthetics.
- The "big long card" grid: same-sized icon+heading+text tiles repeated down the page (current `LandingChallengeCards`/`ModeCard`) — reads as a template, overwhelming, undifferentiated.
- Editorial-magazine restraint (display-serif + drop caps). Wrong register entirely.

## Design Principles
- **Energy with intention** — loud, but every loud thing earns its place; no chaos for chaos's sake.
- **Phone AND TV** — legible and tappable on a 6" phone, readable across a living room.
- **Personality everywhere** — mascot, motion, copy carry charm; the UI is never neutral.
- **Competitive clarity** — when personality and legibility conflict, legibility wins.
- **Coherent chaos** — electric color-coded modes (lime/pink/cyan/purple/orange) stay a system, not noise.
- **One confident tap** — the homepage routes, it does not catalog. Hierarchy over completeness.

## Accessibility & Inclusion
WCAG AA contrast (neo accent colors pair with BLACK text only — white is invisible on lime/cyan/yellow). Full RTL (Hebrew) parity, hard shadows auto-flip. Every animation needs a `prefers-reduced-motion` fallback. Keyboard + touch targets ≥44px. Colorblind-safe: never encode meaning in color alone (modes carry icon + label, not just hue).
