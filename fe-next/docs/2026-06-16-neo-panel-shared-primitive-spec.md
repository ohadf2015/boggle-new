# NeoPanel — shared lightweight panel primitive

**Date:** 2026-06-16
**Goal:** Extract the most hand-rolled UI pattern in the app (the lightweight neo-brutalist box shell) into one shared `ui/` primitive, then replace inline copies across areas.

## Problem

`border-3 border-neo-black rounded-neo` (+ a bg tone + `shadow-hard*`) appears **240×** across **143 files**. It is the de-facto "panel/box" of the app, yet there is no shared component for it. Each site re-types the cluster, so shadow/radius/padding **drift** between areas (e.g. navy panels use `shadow-hard` 15×, `shadow-hard-lg` 7×, `shadow-hard-sm` 6×).

Existing primitives do NOT cover it:
- `ui/card.tsx` `Card`/`CardVariant` — **heavy**: `h-full`, `cq-container`, container-query padding, `border-4 bg-neo-gray`. Built for full-height mode cards, not lightweight boxes.
- `ui/badge.tsx` `Badge` — pill, CVA color variants only.

## Boundary (documented in component)

- **Card** = full-height mode/feature cards (container queries, `h-full`, `border-4`).
- **NeoPanel** = lightweight static-tone box shell (`border-3`, content-sized, padding via `className`).
- **Dynamic-color boxes** (`style={{ backgroundColor: tier.color }}`, lime/pink/etc. bgs) are a *different* abstraction — a `tone` enum can't express them. They stay inline (or use NeoPanel with no tone + custom bg in className). Excluding them is principled, not a half-migration.

## API

```tsx
<NeoPanel tone="navy|cream" shadow="sm|md|lg" radius="neo|neo-lg" className="…padding/layout…" />
```

- Base (always): `border-3 border-neo-black`
- `radius`: `neo` (default) → `rounded-neo`; `neo-lg` → `rounded-neo-lg`
- `tone`: `navy` → `bg-neo-navy`; `cream` → `bg-neo-cream`; omitted → no bg class (caller supplies)
- `shadow`: `sm` → `shadow-hard-sm`; `md` (default) → `shadow-hard`; `lg` → `shadow-hard-lg`; `none` → no shadow
- `className` passthrough carries padding/layout/text — **never** baked into variants (p-3→p-6 too varied).
- Forwards ref + all `div` props. CVA, mirrors `card.tsx` conventions. Uses `shadow-hard-*` utilities (auto-flip RTL).

## Plan

**Phase A — extraction (zero visual change).** NeoPanel emits the exact existing class set; every swap is class-set-equal → verifiable without screenshots. Sweep only exact `bg-neo-navy`/`bg-neo-cream` static panels; per-directory Sonnet subagents; skip+report any conditional/templated/dynamic-bg site.

**Phase B — improvement.** With sites unified, normalize the divergent `shadow-hard*` drift in the few outliers (deliberate, in one place).

## Verification
TDD primitive first. `npm run lint && npm run test && npm run build`. Spot-check class-set equality on a sample of migrated sites. RTL via `shadow-hard-*` (auto-flips).

## Outcome (2026-06-16) — SHIPPED (uncommitted)
- `components/ui/panel.tsx` + `panel.test.tsx` (TDD, 11/11). `tone` navy/cream, `shadow` sm/md/lg/none, `radius` neo/neo-lg, className passthrough, ref-forwarding, CVA.
- **19 files / 26 swaps** migrated (areas: adventure, game, results, daily, onboarding, challenge, streaks, battlepass, ranked, custom-puzzle, singleplayer, wordhunt, teacher route).
- **Principled exclusions:** framer-motion-wrapped panels (`m.div`/`AdaptiveMotion.div`) and dynamic-bg (`style`/tinted `bg-neo-navy-light`/`bg-neo-lime`) panels left inline — a `tone` enum can't express them. `border-4` panels excluded (NeoPanel is `border-3`).
- **Sweep was error-prone** (parallel Sonnet agents wrapped motion elements / used invalid `tone="lime"` / downgraded `shadow-hard-xl`→lg / dropped `rounded-neo-lg`). Caught ALL 8 regressions via a class-set + structural audit (not eyeballing); reverted/fixed. Gate: lint 0, tsc 0, 11/11, build clean.
- **Future work:** a motion-aware `asChild` variant could absorb the ~20 motion-wrapped panels (the asChild+motion combo is exactly what broke the sweep — needs care).
```
