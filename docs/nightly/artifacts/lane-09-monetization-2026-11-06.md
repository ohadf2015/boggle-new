status: research-only
attempted: add schools lead-capture CTA + ad-UX/IAP-probe instrumentation — found ALL of it already shipped by prior lane-09 runs.

## Findings (verified by reading code, not assumed)
- Education lead-gen is COMPLETE end to end:
  - Hub (`app/[locale]/education/PageClient.tsx`) → `LandingSchoolLead` (inline `SchoolLeadForm`, truthful bullets, no fake stats).
  - `DistrictUpsellStrip` wired into `EducationLandingTemplate` + `/education/access` (teacher-individual CTA).
  - `SchoolLeadForm` posts to real `app/api/education/school-lead/route.ts` (has its own test suite — not a stub).
  - Impressions tracked via `useUpsellImpression` (IntersectionObserver, no double-fire).
- Ad-UX probes are COMPLETE and already mounted:
  - `components/ads/RemoveAdsProbe.tsx` mounted in `/settings` (web-only gate inside the component).
  - `components/monetization/SupporterInterestCard.tsx` mounted in `/profile` and `SinglePlayerResults` (native-gated to web only — correct, native has real ads).
  - `iap_viewed`/`iap_tapped` fire from ~12 call sites across teacher Pro gates + these two probes.
- `useAdMob.ts` rewarded-ad flow is heavily hardened already (immersive-mode tradeoff, visibility-reconcile grace, interstitial-vs-video namespace bug, stuck-watchdog onError) — read the inline comments before ever touching this file; not a target for a time-boxed lane.

## Open signal (not fixed tonight — needs more than one lane)
- Brief: `rewarded_ad_watched` 0/24h, 7d avg also 0. Either genuinely zero rewarded-ad engagement this week, or an instrumentation break. Too deep for safe same-night diagnosis (ad flow is the most booby-trapped file in the surface, per its own comments). Next lane: compare against `rewarded_ad_offered` count in the same window — if offered>0 and watched=0, that's a real break; if both are 0, it's a demand issue (surface discoverability), not a bug.

## Backlog (ranked, for tomorrow)
1. Diagnose the `rewarded_ad_offered` vs `rewarded_ad_watched` gap (see above) with a PostHog query before touching `useAdMob.ts`.
2. Lane 09 should `rg` for existing monetization components (`components/ads/`, `components/monetization/`, `DistrictUpsellStrip`, `SchoolLeadForm`) FIRST each night before proposing new lead-capture/probe UI — this surface is saturated, duplicate-build risk is high now.
3. If a genuinely new idea is needed: measure whether `SupporterInterestCard`/`RemoveAdsProbe` conversion (iap_tapped / iap_viewed ratio) is worth a copy/placement iteration — that's a safe, small follow-up (copy + placement only, no new surface).

files_touched: none (research-only; no code changed)
next_steps: see Backlog above. Do not re-propose school lead-gen or IAP-probe scaffolding — it exists. Investigate rewarded_ad_watched=0 via PostHog query first.
