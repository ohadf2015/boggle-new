---
status: shipped
files_touched:
  - fe-next/app/[locale]/education/PageClient.tsx
  - fe-next/app/[locale]/education/__tests__/EducationLanding.authShortcut.test.tsx
---

## Impact check: school_lead_submitted copy change (2026-07-04)
- growth:school_lead_form_viewed = 1 view / 7 days; growth:school_lead_submitted = 0
- Verdict: neutral (copy change shipped, but traffic is the bottleneck, not conversion)
- Appended verdict to impact-ledger.ndjson

## Shipped: for-schools CTA on teacher education hub

Problem: almost nobody finds the for-schools lead-capture page (1 view / 7 days). CTAs existed
on the teacher dashboard (DistrictUpsellBanner) and non-auth education hub (DistrictUpsellStrip)
but authenticated teachers visiting /education saw ZERO for-schools mention — the highest-intent
audience for school plan advocacy had no discovery path there.

Change: Added a district plan CTA card (reuses existing education.landing.districtCta.* i18n keys,
0 new translation strings) to the hasTeacherAccess view in PageClient.tsx. Links to
/[locale]/education/for-schools; fires growth:landing_cta_clicked { cta: teacher_hub_district }.

TDD: Added 2 tests (teacher sees link; non-auth does not). ESLint clean.

Metric: growth:landing_cta_clicked where cta=teacher_hub_district (baseline 0, check 7 days).

## Revenue-data hygiene
Brief thin — snapshot stale. Founder: run scripts/nightly/lib/pull-revenue-snapshot.sh to refresh.

## Next steps
- Monitor teacher_hub_district click rate
- rewarded_ad_watched = 18 / 7 days (2.57/day avg); today 0 is normal variance at this volume
- If clicks materialize but no form submits: investigate for-schools page UX or pricing clarity
