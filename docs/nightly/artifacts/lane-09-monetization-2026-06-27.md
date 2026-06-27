status: research-only
attempted: education upsell audit + supporter/IAP probe scouting

---

## Findings

### Education upsell: COMPLETE (no code needed tonight)

Full infrastructure built and wired in prior sessions:
- `SchoolLeadForm` → `/api/education/school-lead` → `school_leads` table + admin email notify
- Tracking: `school_lead_form_viewed`, `school_lead_submitted`, `education_upsell_impression`
- CTAs wired on: teacher dashboard (`DistrictUpsellBanner`), education hub (`DistrictUpsellStrip`),
  esl-word-games/vocabulary-games-classroom/games-for-teachers (`TeacherAccessCTA`),
  spelling-bee-practice (`DistrictUpsellStrip`), classroom-game (link)
- `/education/for-schools`: full FAQ JSON-LD, pricing schema ($149/yr), hero CTAs, lead capture form
- Admin queue: `SchoolLeadsQueue` + `/api/admin/school-leads` endpoint

**Funnel is ready. The lever is traffic volume, not more infrastructure.**

### Web ad revenue: STRUCTURAL gap (not tonight's fix)

- Web rewarded ads gated OFF (`NEXT_PUBLIC_H5_ADS_ENABLED` triple-gate in `useRewardedAd`)
- AdSense pending approval — zero web ad earnings until approved
- Android AdMob: live but modest eCPM
- `rewarded_ad_watched` = 0/24h (7d avg 1.86) — declining Android ad engagement

No code fix available until AdSense approves or Android placement changes.

### Supporter/ad-free interest probe: READY TO BUILD (tomorrow's #1)

`iap_viewed` and `iap_purchased` events exist in `utils/growthTracking.ts` type definitions
but have NEVER been fired anywhere — no web demand signal for "remove ads / pay to support."

**Exact spec so tomorrow is 20-min execution, not re-scout:**

Component: `components/monetization/SupporterProbe.tsx` (~50 lines)
- Mount: `app/[locale]/education/PageClient.tsx` (231 lines, has room below `DistrictUpsellStrip`)
- Gate: PostHog flag `web-supporter-probe` (default `control`, rollout to 5%)
- Analytics: fire `iap_viewed` on mount with `{ surface: 'education_hub' }`
- UX: small neo-brutalist card — "Love LexiClash? Help keep it free for teachers →"
  mailto:ohadf2015@gmail.com?subject=LexiClash+Supporter (no purchase, pure demand signal)
- Uses existing `useLanguage()` hook + `t()` pattern

Files needed (8, TDD mandatory — RED must fail first):
1. `components/monetization/__tests__/SupporterProbe.test.tsx` (RED first)
2. `components/monetization/SupporterProbe.tsx` (GREEN)
3. `translations/en.js` — add `monetization.supporter.{title,body,cta}` keys
4. `translations/es.js`
5. `translations/he.js`
6. `translations/ja.js`
7. `translations/sv.js`
8. `app/[locale]/education/PageClient.tsx` — mount `<SupporterProbe />` behind flag

Pre-work: create `web-supporter-probe` flag in PostHog before writing code.

---

next_steps:
  1. Build supporter probe (8 files, TDD, all 5 locales) — spec above, execution ~20 min
  2. Create PostHog flag `web-supporter-probe` first (default=control, rollout 5%)
  3. Watch `iap_viewed` in PostHog 7d to decide if paid tier is viable
  4. Education growth: funnel exists — drive traffic via blog + SEO lanes (06/08)
  5. Provision ADMOB_API_TOKEN for unattended revenue data in nightly brief
