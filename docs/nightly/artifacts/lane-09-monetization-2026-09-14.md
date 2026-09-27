status: research-only
attempted: education upsell lead-gen CTA (planned) — found it's already fully shipped end-to-end; ad-UX telemetry gap check — found already fully instrumented. No safe new lever found in budget; documenting backlog instead of forcing a rushed edit.
files_touched: none

## Findings

**Education lead-gen (my planned Option 1) is ALREADY COMPLETE** — built in a prior
nightly run (migration `20260911140000_schedule_school_leads_digest.sql`, dated
09-11), not previously logged in the memory index:
- `app/[locale]/education/page.tsx:281-289` — "For Schools" card in the hub, click-tracked
  via `data-ph-capture-attribute-source="edu_hub_for_schools_card"`.
- `app/[locale]/education/for-schools/page.tsx` → `ForSchoolsPackages` →
  `SchoolLeadForm` (`components/education/SchoolLeadForm.tsx`) — full lead form
  (name/email/school/role/student-count/interests/message), tracks
  `school_lead_form_viewed` + `school_lead_submitted`.
- `POST /api/education/school-lead` — inserts into Supabase `school_leads` table.
- `GET /api/admin/school-leads` (+ `/export`) — admin-only viewer (RLS admin-gated).
- `GET /api/cron/school-leads-digest` — weekly Monday 07:00 UTC email digest to founder
  of every lead row from the last 7 days.

Conclusion: the "biggest untapped lever" the lane prompt describes is not untapped —
it's a shipped, instrumented pipeline. **Next step is not to build more of it, it's to
check whether it's converting**: query `school_leads` row count since 09-11 and read
the last digest email. If zero rows in 3+ days, the funnel bottleneck is upstream
(hub → for-schools page traffic), not the form itself — check
`edu_hub_for_schools_card` click count in PostHog before building anything new here.

**Ad-UX telemetry (my planned Option 2) is ALREADY COMPLETE** — `trackRewardedAdOffered`
/`Watched`/`Declined` fire from 11 call sites across `hooks/useRewardedAd.ts` and 8
component surfaces (DoubleGoldAdButton, TimeLowAdPrompt, RewardedAdGoldButton,
WatchAdButton, WatchAdForFreezeButton, BossRushResults, RetryAssistModal, ShareSection,
MemoryHuntCluePanel, useRewardedFeatureUnlock). The brief's low
`rewarded_ad_watched` count (2/24h) is a genuine low-engagement signal, not a missing-
instrumentation gap — nothing to wire.

## Why nothing shipped tonight
Both of the lane prompt's top two suggested levers turned out to be already-built (not
reflected in memory/brief — a documentation gap, now recorded here). Spent the budget
verifying rather than assuming, per Class-1/Class-4 pitfall guidance. No safe
alternative lever was scoped in time to implement + self-verify before the finalize
cutoff, so shipping nothing beats shipping a rushed, unverified edit.

## Ranked backlog for tomorrow's lane 09 (or lane 12/telemetry)
1. **Query `school_leads` row count + `edu_hub_for_schools_card` PostHog click count**
   since 2026-09-11. If clicks > 0 but leads = 0, the for-schools page itself is the
   drop-off point (form friction, or page not loading) — investigate there first.
2. If the funnel is healthy but low-volume, the real lever is **hub visibility**: is
   the "For Schools" card discoverable from anywhere outside `/education` itself (nav,
   footer, teacher dashboard for non-Pro teachers)? A grep of inbound links to
   `/education/for-schools` would answer this in one lane.
3. IAP/subscription demand-probe (lane prompt Option 3) is still genuinely unbuilt —
   an `iap_viewed` instrumented "remove ads / supporter" interest CTA behind a flag,
   pure analytics, no purchase path. This is the one real gap left from tonight's menu.
next_steps: verify school_leads conversion (query row count + click funnel) before building more lead-gen UI; if funnel is dead, fix discoverability not the form; IAP demand-probe (Option 3) remains unbuilt and is the next safe lever.
