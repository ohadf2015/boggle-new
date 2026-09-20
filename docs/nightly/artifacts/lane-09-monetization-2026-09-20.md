status: research-only
attempted: verified the 4 standard monetization levers from tonight's playbook — all already shipped and functional, found no safe gap to ship.

## Verified already-built (do NOT re-propose these)
- Education lead-gen: `/education/for-schools` hero CTA -> `EducationPackages`/`ForSchoolsPackages` -> `SchoolLeadForm` -> POST `/api/education/school-lead` -> real `school_leads` Supabase insert, errors surfaced (429/500 handled, not silent). Linked from both education hub (`PageClient.tsx`) and `/teacher/upgrade` (district_inquiry CTA). Brief's "education has NO pricing, NO lead capture" claim is STALE — update learnings.
- Ad-offer instrumentation: `trackRewardedAdOffered/Watched/Declined` wired across 8 call sites (WatchAdButton, WatchAdForFreezeButton, DoubleGoldAdButton, TimeLowAdPrompt, RewardedAdGoldButton, MemoryHuntCluePanel, ShareSection, useRewardedFeatureUnlock). No missing-instrumentation gap found.
- IAP/supporter interest probes: `RemoveAdsProbe` (settings) + `SupporterInterestCard` (profile) both mounted and firing `iap_viewed`. `ClassLimitUpsellModal`, `TeacherProAskBanner`, `ProGate` all wired too.

## Why no ship tonight
Brief's only signal (`rewarded_ad_watched` 1/24h, reach=1) is too low-volume to act on blind — could be traffic, not a UX gap, and every obvious instrumentation/CTA surface is already in place. Guessing at a fix here risks a reward-adjacent change under the hard guardrail. Didn't find a genuine, verifiable gap in the ~budget remaining.

## Ranked backlog for tomorrow
1. Fix stale intel: `docs/nightly/*` / prompt claims "education has no pricing/lead capture" — false, update the brief source so lane 09 doesn't re-walk this path.
2. Investigate WHY rewarded_ad_watched is only 1/24h despite 8 wired offer surfaces — check `rewarded_ad_offered` vs `_watched` conversion rate (declined reasons) once a revenue snapshot is available; needs `ADMOB_API_TOKEN` or founder Playwriter capture (both still unprovisioned per brief note).
3. Consider: is `district_inquiry` CTA on `/teacher/upgrade` actually seen (impressions), or dead like the old Tools-drawer paywall (see memory `teacher-tools-drawer-phantom-paywall-2026-09-17`)? Worth an impression check before building anything new there.

files_touched: none
next_steps: see ranked backlog above; do NOT re-verify items in "already-built" section without new evidence they broke.
