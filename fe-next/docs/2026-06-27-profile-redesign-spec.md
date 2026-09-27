# Profile Section Redesign — Spec

**Date:** 2026-06-27
**Scope:** Whole profile section (`app/[locale]/profile/` + `components/profile/`, cosmetics, season cards, guest "YOUR HQ" state).
**Register:** product (design SERVES the task). Bar = earned familiarity + legible progress, energy in service of clarity.
**Identity (locked, must preserve):** Neo-Brutalist dark navy, Fredoka/Rubik, hard shadows, electric mode colors. Variants preserve the lane — do NOT reflex-reject fonts/palette.

## Method
Critique done on the live authed profile (prod, level-78 account, RTL Hebrew) across all 4 tabs + desktop + the guest gate. Screenshots in scratchpad.

## Findings (current state)

### Core problem — no altitude
Every section is one full-width frame: `border-neo-thick` + colored ribbon top-edge + floating icon chip. 8+ identical frames stack vertically. Nothing recedes; everything shouts equally → monotony, slow scan, long scroll. This is a **system** problem.

### Specific offenders
1. **ProfileHeader desktop = empty desert.** Avatar/name/tier crammed top-right; ~60% of the hero band is empty navy. (Mobile is acceptable.)
2. **Achievements tab = wall of muddy brown pills.** Brown is OFF-PALETTE (brand is electric). Two-column near-identical pills, locked greys interspersed, no rarity tiering / grouping / progress legibility. Weakest screen.
3. **StatCard decorative noise.** "04 / 02" index markers + tick-mark glyphs convey nothing → product slop (decoration that isn't state).
4. **Collection tab = kitchen sink.** Referral + season rank + trophy case + collectibles + cosmetics + **EmailPreferences** stacked with no grouping. Settings buried under "Collection" is wrong IA.
5. **Uniform spacing** between every section → no rhythm.

### Strengths to preserve
StatCards (color-coded, count-up), XP gradient progress bar, season rank/trophy cards, RTL correctness, reduced-motion compliance.

## Redesign — phased

### P0 · Altitude system (the core fix)
Establish 3 altitudes; apply across the surface:
- **Hero** (1): ProfileHeader — the single biggest statement.
- **Primary** (keep heavy frame): XP, Coins, Stats grid, Ranked, Season rank. Earned the ribbon+chip+thick border.
- **Secondary / utility** (go quiet): ProfileStyleCard, EmailPreferences, referral list rows, collectibles "coming soon" — thinner border (`border-neo`), no colored ribbon, no floating chip, muted surface. Recede.
- Vary vertical rhythm: larger gap before a new *group*, tight gap within a group.

### P0 · ProfileHeader hero (fix desktop desert)
Fill the band on desktop: larger avatar+LevelRing, name/tier/streak laid out to use the width, inline vital chips (level · streak · a couple key totals) pulled from existing profile data. Mobile keeps the current compact composition. No new data sources — reuse `useAuth` profile fields already rendered elsewhere.

### P1 · Achievements re-tier
Kill the brown. Map rarity → brand-electric (e.g. common=navy-light, rare=cyan, epic=purple, legendary=lime/yellow). Clear earned-vs-locked. Show progress (X / Y already exists — make it legible). Reduce pill monotony (sizing/weight by tier). Pure mapping function → unit-tested.

### P1 · Strip decorative noise
Remove StatCard index markers + tick-mark glyphs (or replace with something that conveys state, e.g. a tiny trend). Default: remove.

### P2 · Collection IA
Move EmailPreferences OUT of Collection into a clearer home (its own small "Settings/Notifications" block at the end, visually quiet). Group the rest under clear sub-headers (Season / Cosmetics / Invite).

### P2 · Guest "YOUR HQ" polish
Already decent. Light pass only — spacing + CTA hierarchy.

## Constraints (verify every change)
- All strings `t('...')` — no hardcoded text. New copy → 5 locales (en/he/sv/ja/es) via ux-writer, native not literal.
- RTL: test `?locale=he`, logical properties, shadows auto-flip.
- Electric fills take **black ink only** (white invisible on lime/cyan/yellow/orange). Body on navy ≥4.5:1.
- Files <300 lines (components) / <500 (pages). Extracted helpers get a test (TDD).
- Reduced-motion fallback on any new motion.

## Out of scope (this pass)
ReferralCard internal logic (392L share machinery), avatar builder, cosmetic purchase flow, tRPC/data changes. Visual-only on those.
