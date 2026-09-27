# Homepage Bottom Sections Redesign — "feel it, don't read it"

**Date:** 2026-06-20
**Goal:** The homepage bottom sections currently read as SEO/GEO content fillers (dry prose, duplicated FAQ, unused rich data). Rework them so players *understand what LexiClash is* and *feel connected to the game* — valuable, on-brand, personality-driven — without losing SEO/AdSense load-bearing content.

## Problem (diagnosed from code)

Two bottom surfaces both dump overlapping prose:

- `components/landing/LandingSEOSection.tsx` (client, Framer Motion) — renders: what-is (short), how-to-play (4 steps), "Built for Learning" (AIMS Neuroscience prose), FAQ (6 Qs).
- `components/seo/HomepageContentSection.tsx` (server, AdSense remediation) — renders: about prose, 10-item features list, FAQ (5 different Qs), editorial links.

Triple overlap that makes it feel like filler:
- **"What is LexiClash"** appears in *both* files.
- **"What you can play"** exists THREE times: page.tsx `features[]` (10 items), the unused `gameModes[]` (5 items, never rendered), and the prose description.
- **Two separate FAQ sets** stacked near each other.
- Rich, already-translated data is **unused**: `gameModes` (5, with electric tags), `whoCanPlayCards` (4), `communityStats` (3), `communityTitle/Content`.

The mascot — a core brand pillar with 20+ emotions — is **absent** from every bottom section. That is the single biggest missed "feel connected" lever.

## Constraints (hard)

1. **AdSense:** `HomepageContentSection` is the 2026-06-04 low-value-content remediation. A human reviewer must land and see readable, server-rendered prose + a native `<details>` FAQ (zero-JS). Keep it content-rich; do not gate behind interaction-only reveals.
2. **Static per-locale, NOT `t()`** for any *visible* SSR copy (crawlers resolve no client `t()`). All 5 langs (en/he/sv/ja/es) + Hebrew RTL. Reuse existing translated fields wherever possible; any new label needs all 5.
3. **Reveals visible-by-default.** Existing Framer variants are already neutralized to `opacity:1` (someone hit the blank-SSR bug). Do NOT reintroduce `opacity:0` hidden-until-`whileInView` states.
4. **Neo-brutalist identity locked** — Fredoka/Rubik, navy + lime/pink/cyan/purple, hard shadows, solid borders. Preserve; no new palette/fonts.
5. Max 300 lines/component → extract subcomponents.

## One-fact-one-place division

| Fact | Owner | Source data |
|------|-------|-------------|
| Identity hook ("what is") | LandingSEOSection §1 | `whatIsShort` + mascot |
| How to play | LandingSEOSection §2 | `steps[]` (existing timeline) |
| What you can play (modes) | LandingSEOSection §3 **Mode Showcase** | `gameModes[]` (was unused) |
| Who it's for | LandingSEOSection §4 **Who Plays** | `whoCanPlayCards[]` (was unused) |
| Community / belonging | LandingSEOSection §5 **Community band** | `communityStats[]` + `communityTitle/Content` (was unused) |
| Full About prose | HomepageContentSection | page.tsx `seoContent.description` |
| THE FAQ (single) | HomepageContentSection | page.tsx `seoContent.faq` |
| Editorial links | HomepageContentSection | links map |

Removed: LandingSEOSection FAQ (dup — survives in HomepageContentSection; JSON-LD unaffected), LandingSEOSection "Built for Learning" prose block (its classroom value is now carried by the Who-Plays "Classrooms" card; keep one compact stat if useful), HomepageContentSection features grid (redundant with Mode Showcase; About description prose already enumerates modes for AdSense).

## Craft: 5 distinct visual worlds (avoid identical-card-grid slop)

Brand register permits art-direction per section. Each beat is a *different* treatment:

1. **WHAT IS** — centered identity moment. Mascot (happy/excited pose) + oversized Fredoka headline + `whatIsShort`. No cards. The hook.
2. **HOW TO PLAY** — keep the connected horizontal timeline (4 colored step nodes). Light polish.
3. **MODE SHOWCASE** — solid color-*blocked* tiles, each mode drenched in its family color, tag chip, the multiplayer mode emphasized (asymmetric, not a uniform grid).
4. **WHO PLAYS** — conversational "Made for ___" band (icon + label + detail rows), NOT cards. Mascot accent.
5. **COMMUNITY** — full-bleed drenched color band: giant inline stats + "join thousands" belonging line + Play CTA + @lexi.clash. Mascot peeking.

Mascot appears in §1, §4, §5 (personality everywhere, on brand).

## Implementation

- Extract subcomponents into `components/landing/seo/`: `ModeShowcase.tsx`, `WhoPlays.tsx`, `CommunityBand.tsx`, plus keep `WhatIsHero` + `HowToPlayTimeline` inline or extracted. Keep `LandingSEOSection.tsx` < 300 lines as composer.
- `HomepageContentSection.tsx`: drop features grid, restyle About + FAQ + links to read as a deliberate "the full story" reference footer with mascot/personality. Keep server-rendered + native `<details>`.
- TDD: new subcomponents get render tests (assert mode titles, who-plays labels, community stats present); update `HomepageContentSection.test.tsx` for the dropped features grid; LandingView tests still green.
- Browser-verify before/after in en + he (RTL).

## Out of scope
- No backend/data changes. No new translation namespaces beyond reusing existing static maps (+ any tiny new label ×5 if required).
- Above-fold hero, blog section, ads — untouched.
