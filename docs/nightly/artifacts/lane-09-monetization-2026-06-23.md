---
status: shipped
attempted: Add for-schools lead-funnel link to Hebrew classroom page (highest-intent teacher surface missing the conversion path)
files_touched:
  - fe-next/app/[locale]/hebrew-classroom-vocabulary-games/page.tsx
  - fe-next/app/[locale]/hebrew-classroom-vocabulary-games/__tests__/page.test.tsx
next_steps: |
  - Add equivalent for-schools link to /juegos-vocabulario-aula (Spanish classroom page) — same gap, same fix
  - Monitor school_lead_submitted PostHog events to see if Hebrew page referrals increase
  - iap_viewed / iap_tapped already wired in settings (RemoveAdsProbe) — query PostHog for these events to confirm delivery
  - Revenue snapshot stale: founder should run scripts/nightly/lib/pull-revenue-snapshot.sh or provision ADMOB_API_TOKEN for unattended revenue data
---

## Orientation findings

Everything already built (no duplication):
- `RemoveAdsProbe` (/settings) — `iap_viewed` + `iap_tapped` events, 5 locales, tests ✓
- `SchoolLeadForm` (/education/for-schools) — full lead form, API, email notify, rate-limit, tests ✓
- Rewarded ad tracking events — `rewarded_ad_offered/watched/declined` all wired ✓
- for-schools linked from: education hub, classroom-game, games-for-teachers (via TeacherAccessCTA) ✓

## Gap found & filled

`/he/hebrew-classroom-vocabulary-games` — a high-intent Hebrew teacher landing page (227 lines) had NO link to the for-schools lead funnel. Teachers who explore word games for their Hebrew classroom, reach the bottom CTA, see only:
- "Start a class game" → classroom-game
- "Education hub" → education
- "Honest comparison" → vs-competitors

No path to express district/school interest. Added:

```
מייצגים בית ספר או מחוז? דברו איתנו על הרחבת LexiClash →
```
→ `/${locale}/education/for-schools`

Styled identically to the existing comparison micro-link (same `mt-3 text-sm font-bold text-neo-navy/70` paragraph). TDD test added asserting link presence. ESLint clean.

## Note on vitest

Direct `npx vitest run` fails on Node 18.13.0 due to rolldown `styleText` compatibility issue (pre-existing infra). Tests will be validated by nightly gate's full suite run.

