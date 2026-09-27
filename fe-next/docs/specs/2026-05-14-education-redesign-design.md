# Education Module Redesign — Design Spec

**Date:** 2026-05-14
**Status:** Approved (user delegated: "do it all")

## Goal

Make the education pages look good, read native in all 5 languages, and compete with Quizlet / Kahoot / Wordwall / Blooket on SEO, GEO, and CTR. Ensure the teacher-access onboarding flow works well end-to-end.

## Scope

**In scope — 5 pages:**
- `/education` (main)
- `/education/vocabulary-games-classroom`
- `/education/esl-word-games`
- `/education/games-for-teachers`
- `/education/spelling-bee-practice` (en-only, light touch)

Plus the onboarding flow: `/education/access`, `/admin/teacher-access`, `TeacherGate`, post-approval experience.

**Out of scope:** internals of interactive teacher routes (`/teacher/*`, `/education/duels`, `/education/classroom-game`) — gate wrapping unchanged, only the entry experience is touched.

## Problem

- Landing-page `.tsx` bodies render hardcoded English JSX (features grids, comparison tables, CTAs, section headers) — bypassing the fully-translated `content.ts` files. ~50+ strings on `vocabulary-games-classroom` alone; 10 on main `/education`.
- `games-for-teachers/content.ts` JA has a leading-space copy-paste defect.
- Translations are AI-generated, native review pending — not native-feel.
- Education pages hardcode `og-image-en.webp` regardless of locale.
- Onboarding flow functions but: admin queue UI has zero translation keys defined; form errors flash without aria-live; no in-app "you're approved" moment (email only); no admin action toasts; drawer/table a11y gaps.

## Architecture decision: Approach B

Expand the existing per-page `content.ts` locale objects to cover **100% of visible strings**, then point JSX at them. `content.ts` is the established pattern, already wired for 5 locales, and is the natural home for page-scoped SEO/marketing copy. Main `/education` gets a small `RESOURCE_CARDS` locale object for its 10 card strings. Rejected: full `t()` migration (disruptive, SEO copy doesn't belong in global message bundles).

## Phases

### Phase 1 — Translation completeness
Audit `esl-word-games` + `spelling-bee-practice` page bodies for exact hardcoded-string inventory. Move every visible hardcoded string into per-page `content.ts`. Add `RESOURCE_CARDS` locale object to `/education`. Fix the JA leading-space bug. TDD: tests assert no hardcoded English renders under non-en locale.

### Phase 2 — Native-feel translations
Run all 5 locales of every education `content.ts` + new `RESOURCE_CARDS` + new onboarding keys through the `ux-writer` skill. Native marketing voice, not literal translation.

### Phase 3 — Per-language hero images
Generate 5 images `/public/images/education-hero-{locale}.jpg` in the `invite-hero` style (energetic neo-brutalist, kawaii Lexi mascot, classroom/word-game theme), each visually localized. Wire as hero banner on all education pages **and** as the per-locale OG image (replaces hardcoded `og-image-en.webp`).

### Phase 4 — Visual polish + animate-ai
Consistent hero banner treatment (gradient overlay + bold headline, `InviteCard` style) across all pages. Card hover states, scroll-reveal sections, animated comparison rows via the `animate-ai` skill. Reduced-motion respected.

### Phase 5 — SEO / GEO / CTR
JSON-LD (`LearningResource` + `FAQPage`) on every landing page. Factual answer-blocks AI engines can cite. Update `llms.txt`. Benchmark + rewrite per-locale meta titles/descriptions against competitors. Clean H1/H2 hierarchy.

### Phase 6 — Onboarding flow
- Add `admin.teacherAccess.*` keys across 5 locales.
- Persistent inline form errors + `aria-live`.
- Explicit "what happens next" on the post-submit success state (not only after refresh).
- "You're approved 🎉" in-app banner on `/education` + `/teacher` first visit after promotion, including allowlist auto-promote on first login.
- Decline state shows admin's reason + concrete reapply hint.
- Admin approve/decline success + error toasts.
- a11y: drawer ESC + focus trap; keyboard-navigable table rows.

## Testing

TDD per project rules. Each phase: tests first. Final gate: `npm run lint && npm run test && npm run build` green; education pages verified rendering in all 5 locales.

## Out of scope / deferred

- Per-page (vs per-language) imagery — using per-language shared hero per the user's ask.
- Native human review of AI translations — flagged, not blocking.
