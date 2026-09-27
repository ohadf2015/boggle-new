---
status: shipped
files_touched:
  - fe-next/components/education/__tests__/SchoolLeadForm.test.tsx
  - fe-next/components/education/SchoolLeadForm.tsx
  - fe-next/utils/growthTracking.ts
  - fe-next/app/[locale]/education/for-schools/page.tsx
next_steps: |
  Monitor PostHog for growth:school_lead_submitted events after next real form submission.
  Human: create PostHog dashboard widget for school_lead_submitted count/7d so nightly brief can surface lead volume.
  Consider adding education_upsell_impression firing when for-schools page mounts (type exists, never emitted).
  AdMob: rewarded_ad_watched = 0/24h — investigate rewarded CTA copy/timing on results pages.
---

## What was done

School lead pipeline (form → API → Supabase + email) was fully wired but had zero PostHog
instrumentation. Without tracking, the nightly brief always shows 0 leads even if schools submit.

### Changes

1. **TDD** (`SchoolLeadForm.test.tsx`): Added `school_lead_submitted` test — asserts `trackGrowthEvent`
   fires with `role` + `locale` on successful submission.

2. **growthTracking.ts**: Added `'school_lead_submitted'` to `GrowthEvent` union type.

3. **SchoolLeadForm.tsx**: Import `trackGrowthEvent`; fires `school_lead_submitted` with
   `{ role, student_count, locale }` after `setSuccess(true)`.

4. **for-schools/page.tsx**: Added `export const revalidate = 3600` — page is fully static
   (pure content function, no runtime DB calls). ISR cuts cold-start latency, improves SEO LCP.
   Matches pattern applied to /multiplayer and 27 blog pages.

## Revenue guardrail ✓
- No coin economy changes
- No ad interruptions
- No new surfaces without flags
- No fake stats
- Education CTA is honest lead-capture only
