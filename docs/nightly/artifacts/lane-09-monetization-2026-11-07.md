status: shipped
attempted: fix a truthful-copy gap on the /education/for-schools pricing card (the top-of-funnel page cold school leads see first).

## Founder ask: "Can we have trial for unity?"
Read as "trial for [schools]" (likely dictation/typo — this codebase has no Unity engine
anything). **The ask is already live**: `/teacher/upgrade` already grants a 14-day free
Teacher Pro trial (`lib/education/pro/proOfferCopy.ts` `resolveProOffer` → `offerTrial`),
surfaced on the classroom results card (`ResultsTeacherProTrialCard.tsx`), the
teacherUpgrade/teacherPricing page meta descriptions, and multiple lifecycle-reminder
strings across all 6 locales (`startTrial`/`trialCta` keys already exist, native-translated).
No new trial system needed — never touched billing/Polar/coin logic (hard line respected).

## What I actually shipped
Found the one place that DIDN'T say it: the `/education/for-schools` lead-gen page —
the first page a cold prospect lands on — had its Teacher Pro package CTA hardcoded to
"Upgrade for $9/mo" (`education.packages.teacherPro.cta`, all 6 locales), silently
omitting the trial that clicking through to `/teacher/upgrade` actually grants new
teachers. Every other surface (results card, upgrade-page meta) already discloses the
trial; this one top-of-funnel card undersold the offer. Fixed by reusing each locale's
own existing, already-reviewed "Start 14-day free trial" phrasing (the `startTrial`
key) verbatim — no new translation written, no billing/pricing logic touched, pure
truthful-copy consistency fix.

## Files touched
- `fe-next/components/education/__tests__/educationPackagesTrialCta.test.ts` (new, TDD RED→GREEN,
  asserts all 6 locales)
- `fe-next/translations/{en,he,es,sv,ja,ru}.js` — `education.packages.teacherPro.cta` →
  each locale's existing native "Start 14-day free trial" phrasing (reused from `startTrial` key)

## Verification
- New test: 6/6 locales pass (`vitest run educationPackagesTrialCta.test.ts`).
- Existing `EducationPackages.test.tsx`: 13/13 still pass (mocked `t()` returns the key,
  unaffected by copy change).
- Did not run full tsc/build/lint (time-budget rule) — `npx eslint` on the new test file
  was still running at finalize; the component/translations themselves are data-only
  string edits with no type surface. Gate will catch anything.

## Guardrail self-check
No coin/ad-reward/billing logic touched. No new ad surface. No fake stats/testimonials.
Pure copy accuracy fix making an existing-but-unadvertised trial visible where it
matters most (the lead-gen page). Reversible: revert the 7 files.

## Next steps
- Confirm `npx eslint` background run (task btfav6iqb) came back clean; if not, fix before next lane touches these files.
- Consider also updating `education.packages.subtitle` (currently "Teacher Pro is billed online...") to mention the trial for full consistency — deferred to keep tonight's diff minimal.
- No further action needed on the founder's trial ask — it's live and now correctly advertised at the top of the funnel.

