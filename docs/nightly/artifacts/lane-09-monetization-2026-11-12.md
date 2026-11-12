status: shipped
attempted: add honest "for schools / bulk pricing" lead-capture CTA on education hub page, 5 locales, TDD

finding: brief's "Education free: NO pricing, NO lead capture" premise was STALE — /[locale]/education/for-schools
already ships a full pricing + lead-capture form (#lead anchor, ForSchoolsPackages). Real gap found instead:
once a teacher signs in, PublicTeacherPayCta.tsx unmounts its CTA entirely (isTeacherProfile check) and the
signed-in teacher dashboard has NO path to the school/bulk-pricing page at all — the only CTA that existed was
for unsigned visitors buying individual Teacher Pro.

shipped: PublicTeacherPayCta now swaps (instead of unmounting) to a small text link —
"Running this for your whole school? Get bulk pricing" -> /{locale}/education/for-schools#lead —
once a teacher profile resolves. No layout change, no flag needed (pure text link, not a new surface),
no pricing/claims invented (reuses the existing live for-schools page). TDD: 2 new tests
(school-bulk-pricing-link testid shows for signed-in teacher / absent while unsigned) + 1 existing test
tightened to check the Pro-checkout-link testid specifically (old assertion only checked the outer wrapper,
which now also renders for the bulk-pricing branch).

files_touched:
- fe-next/app/[locale]/teacher/PublicTeacherPayCta.tsx
- fe-next/app/[locale]/teacher/__tests__/PublicTeacherPayCta.test.tsx
- fe-next/translations/{en,es,he,ja,ru,sv}.js (new teacher.schoolBulkCta.{text,link} key, all 6 locales)

verification: node_modules in this lane sandbox is a partial stub (vitest/eslint binaries absent — known
headless-worktree gap, not caused by this change) so the real test runner/linter could not execute here.
Verified instead: `node -e "require(...)"` loaded all 6 edited translation files cleanly and resolved
teacher.schoolBulkCta.{text,link} correctly in each; manual read of the component diff confirms balanced
JSX, no new imports beyond useLanguage (already used identically elsewhere in this tree), and the two
return branches are mutually exclusive on the same isTeacherProfile condition the file already used.
The nightly gate's real toolchain will run the authoritative tsc/test/build pass on this diff.

guardrail self-check: no coin/ad-reward/payment logic touched; no new ad surface; honest CTA pointing at an
already-live page (no fake stats/testimonials); all new strings via t() in all 6 locales; no AdSense content
page touched (lane 08 boundary respected).

next_steps: none required for this change. If the gate's real test run surfaces anything, it will be in the
2 new/1 edited test in PublicTeacherPayCta.test.tsx — rerun `vitest run app/[locale]/teacher/__tests__/PublicTeacherPayCta.test.tsx`
with a full `npm install` first. Backlog for a future lane 09 night: the founder's unanswered 2026-11-07
"trial for unity" ask is still open — not touched tonight, different surface (IAP trial, not edu upsell).
