---
status: partial
attempted: impact checks for 2 prior changes + add for-schools secondary CTA to education hero (blocked by file-cap at component edit step)
files_touched:
  - docs/nightly/impact-ledger.ndjson (2 verdict lines appended)
  - fe-next/translations/en.js (cta_schools key added)
  - fe-next/translations/he.js (cta_schools key added)
  - fe-next/translations/sv.js (cta_schools key added)
  - fe-next/translations/ja.js (cta_schools key added)
  - fe-next/translations/es.js (cta_schools key added)
  - fe-next/translations/ru.js (cta_schools key added)
impact_check_results:
  - school_lead_form_viewed: 1 (improved from baseline 0 — footer link 07-05 working)
  - teacher_card_access CTA: 0 (neutral — buried too deep on education hub)
next_steps: |
  The for-schools secondary CTA in EducationHero is READY TO SHIP next run:
  1. Edit fe-next/components/education/EducationHero.tsx:
     - Add `trackGrowthEvent` to import from @/utils/growthTracking
     - After the primary CTA Link block (after `<p className="text-xs...cta_note">`) add:
       <Link
         href={`/${language}/education/for-schools`}
         onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'hero_for_schools' })}
         className="text-sm font-semibold text-neo-navy/70 underline underline-offset-2 hover:text-neo-navy transition-colors"
       >
         {t('education.landing.hero.cta_schools')}
       </Link>
  2. Add test to EducationHero.test.tsx (RED first):
     - renders secondary for-schools link → /en/education/for-schools
     - tracks hero_for_schools on click (mock trackGrowthEvent)
  Translation keys already in all 6 locales (cta_schools) — just wire the component.
  NOTE: he.js uses ← arrow (RTL-correct); others use →.
---
