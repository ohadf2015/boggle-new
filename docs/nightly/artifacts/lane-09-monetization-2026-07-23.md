---
status: shipped
files_touched:
  - fe-next/app/[locale]/word-games-for-the-classroom/page.tsx
attempted: Add TeacherAccessCTA (district upsell + for-schools link) to word-games-for-the-classroom page — highest organic teacher traffic page with zero prior upsell path
---

## What shipped

Added `<TeacherAccessCTA />` import + usage to `word-games-for-the-classroom/page.tsx`.

This component:
- Fires `education_upsell_impression` (cta: 'teacher_individual') on mount → first PostHog signal from this page
- Shows individual teacher trial CTA → `/education/access`
- Shows district/school CTA → `/education/for-schools` with `landing_cta_clicked` tracking (cta: 'district_upsell')

## Why this page

Audit found the full education upsell funnel is already built end-to-end:
- `/education/for-schools` page + `SchoolLeadForm` + `/api/education/school-lead` API + Supabase insert + email notify all exist
- Teacher dashboard has `DistrictUpsellBanner`
- `education/games-for-teachers`, `esl-word-games`, `spelling-bee-practice`, `vocabulary-games-classroom` all already have district strip/CTA

**Gap**: `word-games-for-the-classroom` — an SEO landing page targeting the "word game for classroom" keyword — had zero upsell path. Teachers from Google landing here hit a dead end (classroom-game CTA only).

Zero PostHog `education_upsell_impression` or `school_lead_form_viewed` events = near-zero teacher-to-lead conversion despite complete infrastructure.

## Revenue brief context

- `ad_event_rewarded_ad_watched`: 1.7/day average — very low, ad channel weak
- Education school leads = $149/year per school — primary upsell lever
- Lead form API, email notifications, and Supabase table all confirmed wired

## Self-check

- eslint on changed file: exit 0, 0 warnings
- Import resolves to existing `@/components/education/TeacherAccessCTA` (used on `games-for-teachers` page)
- No new translation keys needed (component uses existing `education.landing.cta.*` + `education.landing.districtCta.*` keys)
- Server component + client component boundary: valid in Next.js App Router

## Next steps

- Monitor `education_upsell_impression` + `landing_cta_clicked` (cta: 'district_upsell') in PostHog over next 3 days
- Consider adding same CTA to `bell-ringer-word-games` and `hebrew-classroom-vocabulary-games` pages (same gap, same fix)
- Revenue data: founder should run `scripts/nightly/lib/pull-revenue-snapshot.sh` to populate `revenue-latest.json` (stale/absent — brief was thin)
- Ad UX: `rewarded_ad_declined` data would help assess if ad-watched improvement is viable; check PostHog for that event
