# Admin Dashboard Navigation Redesign — Spec

**Date:** 2026-06-06
**Goal:** Reduce mobile bottom-tab overload, kill redundant tabs/panels, combine sections that belong together, make navigation easier, and improve screen handling — systemically, not screen-by-screen.

## Problem

Current admin nav has two **independently hardcoded** arrays that have drifted:

- `AdminBottomNav.tsx` (mobile): **8 tabs** — `home`, `overview`, `analytics`, `moderation`, `content`, `players`, `teacherAccess`, `system`.
- `AdminSidebar.tsx` (desktop): **9 items** — adds `puzzleReview`, `curators`; drops `home`.

Pain points:

1. **`home` tab is a trap** — exits the admin zone entirely (`/${lang}`), redundant with `overview`. Two tabs both `path: ''`.
2. **Flat IA** — every leaf route is a top-level tab. 8 tabs truncate at `max-w-[56px]` on mobile.
3. **Desktop/mobile drift** — `puzzleReview` + `curators` reachable only on desktop.
4. **Content is tap-twice** — `/content` is a launcher page of 6 tiles, not a destination.
5. **Duplicate panels** — `SystemHealth`, `GamesDiagnostic`, `EmailTestPanel` render on BOTH Overview and System.
6. **No shared screen scaffold** — page title/subtitle is inline JSX per screen, inconsistent.

## Solution

### A. Single nav source of truth — `lib/admin/adminNav.ts` (pure, no React)

One config consumed by both sidebar + bottom nav. Eliminates drift. Pure → unit-testable.

Five primary buckets, each owning **non-adjacent** routes (the active-highlight trap — buckets own routes that don't share a path prefix):

| Bucket | Icon | Default path | Owned route prefixes |
|---|---|---|---|
| **Overview** | LayoutDashboard | `` (exact) | `` |
| **Content** | BookOpen | `/content` | `/content`, `/dictionary`, `/invalid-words`, `/milog-words`, `/words`, `/wikipedia-words`, `/word-bank`, `/connections-review`, `/curators` |
| **Moderation** | ShieldAlert (badge) | `/moderation` | `/moderation` |
| **People** | Users | `/players` | `/players`, `/guests`, `/teacher-access` |
| **More** | Menu | — (opens sheet) | — |

**More** sheet (overflow): Analytics, System (+ Web Vitals), Exit to site. Analytics is demoted because Overview already carries the KPI summary (one-tap-deeper is acceptable).

Active detection (`getActiveAdminTab(cleanPath)`): Overview = exact match on `''`/`'/'`; others = boundary-safe prefix match (`cleanPath === p || cleanPath.startsWith(p + '/')`). Longest/most-specific prefix wins. This is the #1 test target.

Config shape (icons mapped in the component, not the pure module):

```ts
interface AdminNavBucket {
  key: string;
  labelKey: string;
  iconKey: string;        // mapped to lucide component in the React layer
  defaultPath: string;
  ownedPrefixes: string[];
  badge?: 'moderation';
  isOverflow?: boolean;   // lives in More sheet, not a tab
}
```

### B. Mobile bottom nav — 5 tabs + More sheet

`AdminBottomNav` renders the 4 primary buckets + a **More** button opening a bottom sheet (Analytics / System / Web Vitals / Exit to site). No `home` trap. Tabs land on their **primary screen** (Content → `/content`, People → `/players`), never a dead launcher.

### C. Desktop sidebar — same buckets, two-level

`AdminSidebar` consumes the same config: 5 buckets; the active bucket expands to show its leaf children inline (Content → dictionary/invalid-words/…/curators; People → players/guests/teachers). No more flat 9-item list; no drift.

### D. Sub-nav generalized

`AdminSubNav` gains `PEOPLE_ITEMS` and an expanded `CONTENT_ITEMS` (adds puzzle-review + curators) so the mobile horizontal sub-nav covers the combined buckets.

### E. De-duplicate Overview ↔ System

- **System** keeps: `SystemHealth`, `GamesDiagnostic`, `EmailTestPanel`, Web Vitals (the ops home).
- **Overview** removes `GamesDiagnostic` + `EmailTestPanel`; keeps a **glanceable** `SystemHealth` summary that links to System (don't strip Overview bare). Keeps KPIs + activity + SEO panel.

### F. Shared screen scaffold — `AdminPageHeader`

Extract the inline title/subtitle into one `AdminPageHeader` component (title, optional subtitle, optional actions slot). Apply across Overview + System (+ representative screens). One change improves every screen uniformly — the systemic read of "improve all screens."

### G. i18n (hard gate)

New keys in all 5 locales (en/he/sv/ja/es): `admin.sidebar.people`, `admin.sidebar.more`, `admin.nav.guests`, `admin.nav.exitToSite` (or reuse `nav.home`), `admin.nav.puzzleReview` if missing for sub-nav. Added up front to avoid build + nightly translation-gate breakage.

## Scope boundary (explicit "done")

NOT rebuilding 16 screens. Done =
(a) nav IA consolidated to 5 buckets via single config,
(b) home-trap removed + duplicate panels removed,
(c) shared `AdminPageHeader` scaffold applied to ≥2 representative screens,
(d) mobile 5-tab + More sheet, desktop two-level sidebar,
(e) lint + tests + build green, i18n complete in 5 langs.

## TDD targets

1. `adminNav.ts` pure module: 5 primaries, correct overflow membership, no home-trap, active detection across **every owned route** (curators→Content, guests→People, etc.), boundary-safe prefix (no `/words` matching `/word-bank`).
2. `AdminBottomNav`: renders 5 slots, More opens sheet, active highlight, badge.
3. `AdminSidebar`: renders buckets, active bucket expands children.

## Risks

- Active-highlight regression on combined buckets → covered by per-route tests (#1).
- Translation gate → keys added up front in 5 langs.
- Overview losing all signal → keep health summary + link.
