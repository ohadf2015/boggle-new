---
status: research-only
attempted: Audit education upsell + rewarded-ad surfaces; no safe code change fit within budget
files_touched: none
next_steps: |
  See ranked backlog below — all code-ready, start from #1 tomorrow.
---

## Research findings

### What already exists (more complete than prior briefs suggested)
- `SchoolLeadForm` (components/education/SchoolLeadForm.tsx) → POST `/api/education/school-lead` → Supabase `school_leads` table. Tracks `school_lead_form_viewed` + `school_lead_submitted`. Full validation, rate-limiting, success state.
- `DistrictUpsellBanner` on teacher dashboard (`app/[locale]/teacher/PageClient.tsx:84`).
- District CTA on teacher/upgrade (`app/[locale]/teacher/upgrade/PageClient.tsx:278`) → links to `/education/for-schools`.
- District CTA on education hub (`app/[locale]/education/PageClient.tsx:144`, tracks `landing_cta_clicked { cta: 'teacher_hub_district' }`).
- Rewarded ad tracking fully wired: `offered` / `watched` / `declined` in `useRewardedAd.ts`. 0/24h is a thin day, not a wiring gap.

### Gaps found
1. **No `school_lead_form_viewed` → `school_lead_submitted` funnel in PostHog** — the events exist but there's no instrumented funnel in the dashboard. Hard to know conversion rate. HUMAN: build a PostHog funnel `school_lead_form_viewed → school_lead_submitted`.
2. **`DistrictUpsellBanner` not checked for show-condition** — component exists but unclear if it has a gate (e.g., only shown to non-admin, or free-tier only). May be hidden for high-intent users. Check `components/teacher/DistrictUpsellBanner.tsx` show-condition.
3. **No `for-schools` page link from student-facing education hub** — the hub has a teacher CTA but the path to the school pricing inquiry is teacher-gated. A parent/admin browsing might never find it.
4. **`rewarded_ad_offered` volume unknown by surface** — `trackRewardedAdOffered` fires per surface but PostHog query needed to see which surface has high `offered` but low `watched` → that surface needs CTA copy improvement.

## Ranked backlog for tomorrow

### #1 (15min, high-leverage): wire `school_lead_submitted` + funnel PostHog note
- Check `DistrictUpsellBanner.tsx` show-condition. If it has a gating bug (e.g. only shows on specific plan tier that few users hit), fix it.
- Files: `components/teacher/DistrictUpsellBanner.tsx`

### #2 (20min, safe): add `iap_viewed { product: 'district_inquiry' }` event to SchoolLeadForm view
- Currently `school_lead_form_viewed` fires but not `iap_viewed` — the growth revenue funnel uses `iap_viewed` as its top-of-funnel event. Adding it allows the revenue dashboard to count district inquiries.
- Files: `components/education/SchoolLeadForm.tsx` (1-line change in `useEffect`)

### #3 (30min, medium): add for-schools CTA to education hub bottom section
- The education hub (`app/[locale]/education/PageClient.tsx`) has a "For teachers" row. Add a "For schools & districts" card below it, linking to `/education/for-schools`, with 5-locale `t()` strings.
- Guard: only show when `!isEducationUser` (don't show to students already in a school).

### Revenue data hygiene (HUMAN)
- Revenue snapshot is stale — founder should run `scripts/nightly/lib/pull-revenue-snapshot.sh` to refresh `docs/nightly/intel/revenue-latest.json`.
- PostHog funnel: `school_lead_form_viewed → school_lead_submitted` to measure conversion rate.
- Deactivate zombie flag `exp-mp-room-join-loading-v1` (0 call sites, active 4+ nights).
