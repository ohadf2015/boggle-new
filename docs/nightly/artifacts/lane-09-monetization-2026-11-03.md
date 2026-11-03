status: research-only
attempted: education upsell lead-gen CTA — premise was stale, pivoted to verification + ranked backlog.
files_touched: none (no code edit started; verified-only, out of safe time budget to land+verify a new change)

## Findings — brief's premise was stale
Brief claimed education is "100% free, NO pricing, NO lead capture, NO contact-sales anywhere."
Checked live code, both false:
- `app/[locale]/education/for-schools/page.tsx` already has a `#lead` lead-capture form + closing
  CTA section, and is already linked from the education hub card (`app/[locale]/education/page.tsx:92`).
- `app/[locale]/teacher/upgrade/PageClient.tsx` already has `AskSchoolPanel` + `SchoolPlanSection`
  (district/bulk inquiry, `iap_viewed` product=`district_inquiry` tracked) — likely from the
  2026-11-02 teacher-search-research pass (7d5f4aad6, unpushed per memory).
- `hooks/useRewardedAd.ts` already calls `trackRewardedAdOffered/Watched/Declined` from
  `utils/growthTracking.ts` — ad-event instrumentation (option 2 in brief) is not missing either.

Intel brief's single signal (`rewarded_ad_watched` 0/24h, 0 7d avg) was flagged stale by the collector
itself (search + supabase sources stale) — did not chase it; likely low-traffic/dev noise, not a code gap.

## Did not ship
No safe additive gap found that both (a) isn't already built and (b) fits remaining time budget to
land + eslint-verify. Chose not to start an edit I couldn't finish cleanly (pitfall: half-written
file fails the gate).

## Follow-up verification (same run, ~20min budget allowed more digging)
Chased both backlog candidates before handing off — both are also already solid, not gaps:
- `/teacher/upgrade` is linked from 20+ components (`TeacherPlanBadge`, `ClassLimitUpsellModal`,
  `ProgressDigestDashboard`, `TeacherProNavLink`, nav + banners + report CTAs) — discoverability is
  not a gap.
- `components/teacher/pro/SchoolQuoteForm.tsx` POSTs to a real endpoint, `/api/education/school-lead`
  — not a dead-end form. The education monetization funnel (hub → for-schools → lead form,
  dashboard → upgrade → school-quote → API) is fully built and wired end-to-end.

This is a genuinely saturated surface for "add education lead-gen" as a lane-09 idea — likely built
across several recent nightly/human passes (see memory `edu-teacher-search-research-2026-11-02`,
`edu-stickiness-pro-funnel-pass-2026-10-23`, `teacher-activation-root-cause-2026-10-16`). Did not find
a new small-blast-radius gap in this specific area worth shipping tonight; a half-built speculative
instrumentation tweak (e.g. second-guessing `trackRewardedAdOffered` call-site timing in
`hooks/useRewardedAd.ts:437` off a single stale/low-confidence PostHog signal) was judged lower value
than an honest "nothing to add here" plus a sharper backlog below.

## Ranked backlog for tomorrow (lane 09 or human queue)
1. **Stop pointing lane 09 at "does education lead-gen exist" — it does, fully.** Update the lane 09
   prompt's "known surface" section (STEP 2) to reflect the real funnel above instead of the stale
   "NO pricing, NO lead capture anywhere" premise, or every future run re-discovers this from scratch.
2. **Rewarded-ad engagement is the real open question**, but the only signal (`rewarded_ad_watched`
   0/24h, 0 7d avg) came from a collector marked stale (search + supabase legs failed this run). Needs
   a fresh, non-stale PostHog pull before concluding anything about CTA copy/placement/decline rate —
   don't act on a stale single data point.
3. Founder action still open per brief: provision `ADMOB_API_TOKEN` or run the Playwriter revenue
   snapshot script so this lane gets real revenue signal instead of a thin, often-stale PostHog-only brief.
4. If lane 09 wants a genuinely new (not-yet-built) angle: an instrumented "remove ads / supporter"
   interest probe (`iap_viewed` exists in `growthTracking.ts` but is unused for this) is real greenfield
   — no existing component/flag/i18n keys found for it. Sized for a full lane run with TDD, not a
   tail-end add tonight.

next_steps: fix the lane-09 prompt's stale "known surface" premise (item 1) before the next run wastes
another night re-verifying the same funnel; item 4 is the best-scoped net-new idea for tomorrow if a
code ship is wanted.
