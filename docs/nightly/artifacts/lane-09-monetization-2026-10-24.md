status: research-only
attempted: checked brief's rewarded_ad_watched 0/24h signal + education lead-gen gap (prompt's STEP 3 priority list). Both already covered by prior nights' work, found no safe net-new slice to ship in budget.

## Findings
- **Ad analytics NOT a gap.** `utils/growthTracking.ts:1803/1814/1825` already emits `rewarded_ad_offered` / `rewarded_ad_watched` / `rewarded_ad_declined` with surface+platform+reward. Brief's "0/24h, avg 0.14/7d" is a real-traffic signal (reach=0 severity=low), not an instrumentation hole — no offered/declined counterpart to wire, it exists.
- **Education lead-gen NOT a gap.** `/education/for-schools` has a working `#lead` CTA → `ForSchoolsPackages`; `components/education/SchoolLeadForm.tsx`, `DistrictUpsellStrip.tsx` (wired in `EducationLandingTemplate.tsx:199` + `education/access/PageClient.tsx:270`), `TeacherAccessCTA.tsx` all shipped and tested. This contradicts the lane prompt's STEP 2 assumption ("NO pricing, NO lead capture anywhere") — that line in the prompt is stale and should be corrected by lane 7.
- Brief itself flags `search` + `sentry` collectors stale this run; only live signal was the thin rewarded-ad metric above.

## Ranked backlog for tomorrow
1. **Low rewarded_ad_watched (reach=0) root cause unknown** — need to know if this is low offer volume, low eligible-surface traffic, or a real decline-rate problem. Query `rewarded_ad_offered` vs `rewarded_ad_watched` vs `rewarded_ad_declined` counts (not just watched) before touching any ad-UX code — acting on "watched=0" alone with no denominator is a guess.
2. **Correct the lane-09 prompt's stale STEP 2 claim** that education has "NO pricing, NO lead capture" — it already does (see Findings). Lane 7 should update so future runs don't re-discover this and burn budget re-verifying.
3. **For-schools CTA discoverability** — unverified whether `/education` hub prominently links to `/for-schools` vs. it being reachable only by direct nav; worth a quick agent-browser check next run (not done tonight, ran out of budget before verifying).
4. **IAP/subscription interest probe** (prompt's option 3, `iap_viewed` demand-measurement, no real billing) — not started, still open, low-risk, good candidate if tomorrow's lane has full budget.

status: research-only
files_touched: none
next_steps: see ranked backlog above — start with #1 (query real offered/watched/declined denominators) before any ad-UX code change; #2 is a lane-prompt fix for lane 7, not code.
