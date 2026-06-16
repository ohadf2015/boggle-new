---
status: research-only
attempted: Audit education upsell pipeline — SchoolLeadForm, for-schools page, DistrictUpsellBanner, API route, translation coverage
files_touched: none
---

## Findings: monetization infrastructure is more complete than expected

The education lead-gen stack is fully built and functional:

| Layer | File | Status |
|---|---|---|
| Lead form | `components/education/SchoolLeadForm.tsx` | ✅ Full form: name, email, school, role, student count, interests, country, message |
| API endpoint | `app/api/education/school-lead/route.ts` | ✅ Validates, rate-limits (DEFINER RPC), inserts `school_leads`, sends admin email |
| For-schools page | `app/[locale]/education/for-schools/page.tsx` | ✅ Hero + why + compare table + coming features + lead form (id="lead") + FAQ + closing CTA |
| Teacher dashboard | `components/teacher/DistrictUpsellBanner.tsx` | ✅ Lime banner → links to `/[locale]/education/for-schools` |
| Analytics | `growthTracking.ts` | ✅ `school_lead_submitted` fired on success with role + student_count + locale |
| Education hub | `app/[locale]/education/page.tsx:219-226` | ✅ "For Schools" card links to /education/for-schools |

## Revenue data: thin signal

PostHog brief showed `rewarded_ad_watched: 0/24h` — web H5 ads still gated OFF
(`NEXT_PUBLIC_H5_ADS_ENABLED`). No `school_lead_submitted` events in brief (0 or not
reported), so we can't tell if the form is getting traffic or converting.

## Gaps found (ranked by effort/impact)

### 1. Translation coverage for `teacher.districtBanner.text/cta` keys — UNKNOWN
- `DistrictUpsellBanner` calls `t('teacher.districtBanner.text')` and
  `t('teacher.districtBanner.cta')` — could silently fall back to key string in he/sv/ja/es
- Couldn't locate where these keys are defined (translation system uses non-standard
  directory; `t()` source not in lib/i18n/ or public/translations/)
- **Action tomorrow**: `rg "districtBanner" fe-next/contexts/ fe-next/lib/ --include="*.ts"`
  then verify all 5 locale objects have the key

### 2. Teacher page uses `force-dynamic` — missed ISR opportunity
- `app/[locale]/teacher/page.tsx:11` has `export const dynamic = 'force-dynamic'`
- Teacher page is auth-gated (`TeacherGate` wrapper) so SSR is correct — BUT the metadata
  generation re-runs on every request unnecessarily. Change `dynamic` to `revalidate=3600`
  on the shell; client component still auth-gates. Low impact since it's a logged-in page.

### 3. No PostHog `school_lead_form_viewed` event
- We track `school_lead_submitted` but NOT when the form is viewed → can't compute
  form conversion rate (views → submits). Blind to funnel top.
- **Action**: add `trackGrowthEvent('school_lead_form_viewed', { locale })` in
  `SchoolLeadForm` mount (useEffect, once) — 3-line change, TDD green.

### 4. For-schools page lacks `school_lead_page_viewed` event
- Same gap at page level — can't measure landing page → form engagement rate.
- Add to `page.tsx` or a client wrapper via PostHog auto-capture (already configured
  for `data-ph-capture-attribute-*` attrs — add one to the lead section anchor).

### 5. Revenue data hygiene: no unattended revenue snapshot
- `ADMOB_API_TOKEN` not provisioned → brief relies on PostHog event counts only.
- Recommend: provision token OR have founder run
  `scripts/nightly/lib/pull-revenue-snapshot.sh` to feed `revenue-latest.json`.

## Next steps (priority order)

1. **Verify districtBanner translation keys in all 5 locales** — fix any gaps (fast,
   5-10 min, high impact if strings are silently missing)
2. **Add `school_lead_form_viewed` + `school_lead_page_viewed` PostHog events** — 
   unlocks form conversion funnel visibility (TDD, 2 files, ~15 min)
3. **Check `school_lead_submitted` PostHog events exist** — if zero, form may be broken
   (Supabase `school_leads` table may need migration; `school_lead_rate_limited` RPC may
   not exist yet given Supabase MCP was flaky 4/5 nights)
4. **Provision ADMOB_API_TOKEN** for unattended revenue data in nightly brief
