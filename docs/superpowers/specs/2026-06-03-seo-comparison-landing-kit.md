# SEO Comparison Landing Kit — Design Spec

**Date:** 2026-06-03
**Skill:** `/impeccable:impeccable` — improve landing-page design
**Status:** approved-by-autonomy, implementing

## Problem

27 bespoke marketing pages + **29 hand-rolled `lexiclash-vs-*` comparison pages** each
reinvent the same hero / comparison-table / feature-grid / FAQ / CTA skeleton. They drift
in two ways:

1. **Inconsistency** — same button kind is yellow on one page, lime on another; border
   widths vary (`border-3` vs `border-4`); FAQ/card treatments differ.
2. **Off-brand** — the vs-pages use translucent `/40` borders and **gray-bordered generic
   tables** (`border-neo-gray-400`). The documented neo-brutalist system is the opposite:
   **solid black borders, hard offset shadows, chunky arcade feel** (Jackbox-like). The
   pages look like generic dark-mode AI output, not the brand.

## Leverage decision

The 29 `vs-*` pages share **one** uniform pattern. A single prop-driven
`<ComparisonLanding>` server component improves all 29 from one build. That beats
hand-polishing individual bespoke pages.

## Scope (honest)

- **In:** Build `ComparisonLanding` kit. Migrate **3 flagship** vs-pages
  (wordle, scrabble, puzzly-words) as proof + visual verification. Remaining 26 vs-pages
  migrate mechanically in a follow-up pass (same component, per-page data).
- **Out:** i18n. Component takes content as **string props**; pages pass their existing
  hardcoded English today. A `t()` swap is a separate translation project — conflating
  them would mean editing 5 translation files instead of designing.
- **Out:** the 27 non-comparison bespoke pages (different skeleton; later).

## Constraints

- **SEO-safe.** `<h1>`, body copy, and JSON-LD stay **verbatim per page**. The component
  owns presentation only; `generateMetadata()` + JSON-LD `<script>` remain in each page file.
- **Server component, zero JS.** Keep HTML `<details>` accordions. No framer-motion.
  Motion via CSS only, reduced-motion safe.
- **No CTA recolor crusade.** Reserve-yellow is a game-UI rule; marketing CTAs are
  conversion-critical. vs-pages already use lime CTAs consistently — keep lime. Standardize
  *structure* (borders → `border-neo`/`border-neo-thick`, hard shadows, spacing), not color.
- Max 500 lines/file. TDD.

## Design direction — "Head-to-head scoreboard"

The comparison table is the page's reason to exist. Elevate it from a forgettable gray
table into a chunky neo-brutalist **scoreboard**:

- Solid `border-neo-thick` (black) frame + `shadow-hard-xl` offset.
- LexiClash column visually **winning**: cyan header, subtle highlighted column, ✓ glyphs;
  competitor column muted with ✗/em-dash.
- Sticky-feeling bold header row; zebra rows via tinted navy, not gray hairlines.
- Section headings: `font-neo-display` uppercase + solid accent underline bar (no gradient).
- Feature cards: solid black border + hard shadow + accent label chip (kill `/40` borders).
- FAQ: chunky accordion, `shadow-hard-lg` on open, chevron rotate.
- CTA band: full-bleed lime block, hard border + offset shadow.
- Hover lifts only (already CSS); no entrance animation (CLS/SEO).

## Prop API (typed)

`ComparisonLanding` receives: `locale`, `h1`, `intro[]`, `quickCtas[]` (href/label/variant),
`competitorName`, `comparisonRows: [feature, lexiclash, competitor][]`, `featuresTitle`,
`features[] {title, desc}`, `featuresStyle: 'positive'|'pain'`, optional `gameplaySection`,
`faqs[] {q,a}`, `moreComparisons[]`, `finalCta {title, body[], href, label}`,
`showBackLink?`. No metadata in props — stays in page.

## Tests (brand-correctness, not just render)

- renders h1, all comparison rows, all FAQ items, CTA with correct href
- table frame uses `border-neo-thick` (NOT `border-neo-gray`)
- no translucent `/40` borders in feature cards
- LexiClash column marked as the winning column
- `featuresStyle='pain'` swaps to muted/strikethrough treatment

## Verification

Render the 3 migrated pages locally, screenshot, Read screenshots to confirm the design is
elevated (not just unified). Unit tests alone are insufficient evidence for a design task.
