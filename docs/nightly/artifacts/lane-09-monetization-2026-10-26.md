status: research-only
attempted: add honest "for schools" contact-sales lead-capture CTA on the education hub page, i18n across all live locales
files_touched: none
findings:
  - BRIEF WAS STALE. `app/api/education/school-lead/route.ts` + `app/[locale]/education/for-schools/page.tsx`
    already exist, are fully built (rate-limited per-IP+per-email via `school_lead_rate_limited` RPC, admin
    notify email, Supabase insert to `school_leads`), and are already linked from many surfaces: nav
    (`lib/navigation/sectionHome.ts`), `DistrictUpsellStrip`, `TeacherAccessCTA`, `EducationCalloutLink`,
    teacher profile page, about/guides pages, landing pages. Education lead-gen (STEP-3 option 1) is DONE,
    not a gap. Ran out of finalize-cutoff budget confirming the hub page (`app/[locale]/education/page.tsx`,
    274 lines) itself links to for-schools before cutoff hit — did not get to read it or make any edit.
  - Rewarded-ad brief signal (`rewarded_ad_watched: 0/24h, 7d avg 0.14`) has reach=0 — too thin to act on
    without risking a retention-unsafe ad-UX change under time pressure. Deferred.
next_steps:
  - Confirm `app/[locale]/education/page.tsx` (hub, 274 lines) has a visible for-schools CTA; if not, that's
    the actual smallest safe lead-gen gap (not building new lead-capture — just linking the existing page).
  - Nightly brief/intelligence collector for lane 09 should stop asserting "NO pricing, NO lead capture, NO
    contact-sales anywhere" in STEP 2 — it's wrong and sends every lane into redundant research. Lane 07
    should correct the lane-09 prompt's "known surface" section.
  - Revenue snapshot still stale (impact/restore/search/supabase sources flagged stale this run) — founder
    should run `scripts/nightly/lib/pull-revenue-snapshot.sh` or provision `ADMOB_API_TOKEN`.
  - `rewarded_ad_watched` 0/24h reach=0 — needs a human look at whether the surface/event wiring itself is
    broken before any ad-UX change; too thin a signal for an autonomous nightly edit.
