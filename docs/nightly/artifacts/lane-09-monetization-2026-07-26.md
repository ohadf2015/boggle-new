---
status: shipped
files_touched:
  - fe-next/components/education/DistrictUpsellStrip.tsx
  - fe-next/components/education/__tests__/DistrictUpsellStrip.test.tsx
  - fe-next/app/[locale]/education/access/PageClient.tsx
  - docs/nightly/impact-ledger.ndjson
---

## Impact check (07-19 district strip)

- **Impressions**: 28 in 7d (baseline 0) → **neutral** (renders OK)
- **Clicks**: 0 in 7d → root cause found: teacher CTA on access page was a **circular self-link**
  (`teacherHref = /${language}/education/access` — strip was ON that same page)
- District CTA also 0 — low admin-of-5-classrooms density on access page

## Shipped tonight

**`hideTeacherCta` prop on `DistrictUpsellStrip`** (TDD, 3 tests, GREEN)

- `DistrictUpsellStrip` accepts `hideTeacherCta?: boolean`
- When true: teacher CTA block hidden, `education_upsell_impression{teacher_individual}` not fired
- `access/PageClient.tsx` passes `hideTeacherCta` — breaks the circular self-link
- District CTA remains on access page (distinct destination: `/education/for-schools`)
- eslint clean on all 3 changed files

## Next steps (tomorrow)

1. **Measure click delta**: query `growth:landing_cta_clicked` with `cta='district_upsell'` after 7d — baseline was 0
2. **Education landing CTR**: the strip on `/education` (hub) still shows both CTAs with no prop — check click rate there separately
3. **CTA copy improvement**: teacher body "upgrade to Pro for unlimited classes" is confusing alongside "free basic plan" — consider clearer messaging
4. **Rewarded ad CTR**: `rewarded_ad_watched` avg 1.4/day — low; audit rewarded ad CTA surfaces for copy/timing improvement (separate lane action)
