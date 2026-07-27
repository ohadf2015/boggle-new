status: shipped
files_touched:
  - fe-next/app/[locale]/teacher/PageClient.tsx  (useEffect impression event, +5 lines)
  - fe-next/app/[locale]/teacher/__tests__/PageClient.test.tsx  (2 new tests, 4/4 GREEN)
  - docs/nightly/impact-ledger.ndjson  (3 entries: 2 verdicts + 1 new ship entry)

## IMPACT CHECK verdicts (appended)
- `09-monetization-2026-07-22-teacher-upgrade-cta` → **neutral** (0 clicks since ship)
  - Root cause: `iap_viewed` was click-only. Fixed tonight (impression on mount).
- `09-monetization-2026-07-23-teacher-cta-classroom` → **neutral** (0)
  - IMPACT CHECK used wrong CTA value (`teacher_individual`); actual event fires `teacher_district_banner`. Not a regression.

## What was shipped
Added `iap_viewed{product:'teacher_pro', source:'dashboard_banner', event_type:'impression'}` fired on mount for non-admin teachers in `TeacherDashboardInner`. Previously the event only fired on CLICK — giving no visibility denominator. Now tomorrow's brief can detect whether 0 clicks means "no traffic" or "traffic but no intent". Guards: only fires when `!isAdmin && isTeacher && !loading`.

## Root cause finding: discovery gap, not CTA quality
- `school_lead_form_viewed` = 0 in 7d — for-schools page gets zero organic traffic
- `education_upsell_impression{cta:'teacher_district_banner'}` = 0 in 7d — teacher dashboard barely visited
- All upsell infrastructure is correctly built; problem is no entry points from main game flow

## next_steps
1. (S) Add "For Schools" link to education hub PageClient — zero prominent entry point from game
2. (S) Add a footer or main-nav "Teachers" link so educators can discover the education hub
3. (M) Consider adding a post-game "teach with LexiClash?" soft prompt for high-streak players
4. Monitor `growth:iap_viewed` impression count in 3d — if still 0, teacher dashboard traffic is near-zero and a nav entry point is the priority
