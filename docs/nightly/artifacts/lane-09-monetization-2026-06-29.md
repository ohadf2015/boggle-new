---
status: shipped
attempted: Add heroCta1/heroCta2 content keys to for-schools page, replacing hardcoded EN strings, and add PostHog autocapture attributes to hero CTA buttons for funnel visibility
files_touched:
  - fe-next/app/[locale]/education/for-schools/content.ts
  - fe-next/app/[locale]/education/for-schools/page.tsx
next_steps: |
  Monitor PostHog for hero CTA clicks: data-ph-capture-attribute-cta=hero_free_game / hero_tell_us.
  Education funnel is COMPLETE — no structural gaps. Next revenue experiment: IAP demand probe
  (iap_viewed behind NEXT_PUBLIC_IAP_PROBE_ENABLED flag, settings page, no purchase path).
  Provision ADMOB_API_TOKEN or run pull-revenue-snapshot.sh for unattended revenue data.
---

## Audit findings

Education monetization funnel is **fully built and functional**:
- `SchoolLeadForm` → POST `/api/education/school-lead` → Supabase `school_leads` table + admin email
- `DistrictUpsellStrip` on education hub (tracks impressions + clicks)
- `DistrictUpsellBanner` on teacher dashboard (same tracking)
- `TrialUrgencyBanner` + `TeacherAccessCTA` wired on relevant surfaces

## Shipped tonight

**for-schools hero CTA telemetry + content-key fix** (`content.ts` + `page.tsx`):
- Added `heroCta1: string` and `heroCta2: string` to `ForSchoolsContent` interface
- Added EN values: `heroCta1: 'Play a class game free'`, `heroCta2: 'Tell us about your school'`
- Replaced two hardcoded strings in page.tsx hero with `{c.heroCta1}` / `{c.heroCta2}`
- Added `data-ph-capture-attribute-cta` to both hero buttons for PostHog autocapture

Hero CTAs were the only untracked conversion action on the highest-intent education page.

## Revenue infrastructure notes

- **Rewarded ads 0/24h** (7d avg 0.86): likely low-traffic day, not a code bug. Monitor.
- **IAP demand probe**: `iap_viewed` event exists in growthTracking.ts but no UI triggers it.
  Next: "Remove Ads / Support" button in settings behind flag, fires iap_viewed, no purchase path.
- **Revenue snapshot stale**: provision ADMOB_API_TOKEN or run pull-revenue-snapshot.sh.
