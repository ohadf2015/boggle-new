# Blast v2 Phase 0 Go-Live Checklist

**Phase 0 Goal:** Flag OFF, legacy ships, v2 code ready under feature flag

**Owner:** Product Manager  
**Timeline:** 1 sprint (before Phase 1 launch)

---

## Engineering Sign-Off

- [ ] All Plans 1-6 tests PASS
  - Run: `npm run test`
  - Expected: ≥ 2700 tests, 0 failures
  - Artifact: CI build log

- [ ] Lint + type check green
  - Run: `npm run lint && npm run tsc`
  - Expected: 0 errors
  - Artifact: CI build log

- [ ] Production build succeeds
  - Run: `npm run build`
  - Expected: "Compiled successfully"
  - Note: Build-time RPC/DB errors OK (fixture issues); runtime logic must be sound

- [ ] No regressions in existing code
  - Check: Blast v1/legacy tests still pass
  - Check: Other game modes unaffected (MP, Practice, etc.)

**Sign-off:** Engineering Lead ___________ Date: ________

---

## Design & UX Sign-Off

- [ ] Visual review: tiles, FX, animations
  - Checklist:
    - [ ] Board renders correctly in portrait + landscape
    - [ ] Tiles shadow + border styling correct (hard-shadow, neo-thick)
    - [ ] Colors per theme (lime, cyan, pink, purple) render true to design
    - [ ] Animations smooth (no jank on 60fps + 30fps devices)
    - [ ] Intro card + level complete card match brand

- [ ] FTUE flow + mechanics cards reviewed
  - Checklist:
    - [ ] 6-step FTUE sequence clear + engaging
    - [ ] Mechanic unlock cards (frozenTiles, bonusDictionary, etc.) copy is clear
    - [ ] Unlock card dismissal doesn't block gameplay

- [ ] Accessibility review (basic)
  - [ ] Buttons/clickables have min 44px tap target
  - [ ] Text contrast ≥ 4.5:1
  - [ ] Reduced motion: animations optional (not disabled)

**Sign-off:** Design Lead ___________ Date: ________

---

## Internationalization (i18n) Sign-Off

Translations reviewed by native speakers:

- [ ] **Hebrew (he)** - RTL + diacritics
  - Reviewer: ___________ 
  - Sign-off: ___________  Date: _______
  - Issues: [ ] None [ ] Minor [ ] Blocking

- [ ] **Swedish (sv)** - Diacritics
  - Reviewer: ___________
  - Sign-off: ___________  Date: _______
  - Issues: [ ] None [ ] Minor [ ] Blocking

- [ ] **Japanese (ja)** - Hiragana + kanji
  - Reviewer: ___________
  - Sign-off: ___________  Date: _______
  - Issues: [ ] None [ ] Minor [ ] Blocking

- [ ] **Spanish (es)** - Diacritics
  - Reviewer: ___________
  - Sign-off: ___________  Date: _______
  - Issues: [ ] None [ ] Minor [ ] Blocking

- [ ] **English (en)** - Copy tone + clarity
  - Reviewer: Product/Copy ___________ 
  - Sign-off: ___________  Date: _______
  - Issues: [ ] None [ ] Minor [ ] Blocking

**All issues resolved?** [ ] Yes [ ] No — if No, defer to Phase 0.5 (next sprint)

---

## Security & Anti-Cheat Sign-Off

- [ ] No client-side RNG exposure
  - Code review: `BlastChestOpenModal`, `chest-roll.ts`
  - Check: All randomness server-side (`lib/blast/v2/prng.ts`)
  - Artifact: Code review notes

- [ ] No server-side validation bypasses
  - Code review: `/api/blast/clear-level`
  - Check: Word validation re-run server-side, coin scoring validated
  - Check: No client-side XP/coins applied without verification
  - Artifact: Code review notes

- [ ] Anti-cheat guardrails in place
  - Check: `lib/blast/v2/anti-cheat.ts` has star-rating, time-check, wrong-attempt gates
  - Check: Server rejects clears with unreasonable stats (3 stars in 5 seconds)
  - Artifact: Test coverage report

**Sign-off:** Security Lead ___________ Date: ________

---

## Deployment & Ops Sign-Off

- [ ] Feature flag `blast.v2` wired to PostHog
  - Confirm: Flag exists in PostHog UI
  - Confirm: Flag key = `blast.v2`, type = boolean
  - Confirm: Default value = `false`
  - Artifact: PostHog UI screenshot

- [ ] No schema migrations required
  - Tables used: `blast_progress`, `blast_chests` (already exist from Plan 3)
  - New columns: None (v2 uses same schema as v1)
  - Artifact: Migration audit checklist

- [ ] Sentry integration ready
  - Check: `lib/sentry-client.ts` imports telemetry, breadcrumbs wired
  - Check: Blast-specific error tags applied (see `BlastGame.tsx` error boundary if added)
  - Baseline: Capture legacy Blast error rate Week -1 for comparison
  - Artifact: Sentry dashboard bookmark + baseline screenshot

- [ ] PostHog dashboards created (manual in UI)
  - [ ] blast-v2-ftue-funnel (funnel)
  - [ ] blast-v2-chest-open-rate (trends)
  - [ ] blast-v2-hint-usage (trends)
  - [ ] blast-v2-cascade-rate (trends)
  - [ ] blast-v2-tutorial-skip-rate (trends)
  - [ ] blast-v2-avatar-part-excitement (funnel)
  - Artifact: Dashboard links

- [ ] Rollout runbook reviewed & approved
  - Doc: `blast-v2-rollout-phases.md`
  - Reviewed by: Ops Lead ___________
  - Artifacts: PDF + sign-off

**Sign-off:** Ops Lead ___________ Date: ________

---

## Final Sanity Checks

- [ ] No hardcoded strings in UI (all `t('key')`)
  - Run: `grep -r "hardcoded\|TODO\|FIXME" components/blast/v2 lib/blast/v2` (no hits)
  - Artifact: Search results

- [ ] No console errors in browser devtools
  - Manual smoke test on web + Android emulator
  - Check: Console tab is clean (no red errors, only normal logs)
  - Artifact: Screenshot

- [ ] Performance baseline captured
  - Lighthouse audit (web): FCP < 2s, LCP < 4s
  - Note: Mobile may vary; capture baseline from internal tester
  - Artifact: Lighthouse report

- [ ] Offline mode not broken
  - Manual test: Play level, go offline, complete, come back online
  - Check: Progress saved + syncs when reconnected
  - Artifact: Test notes

---

## Go-Live Decision

**All checklists green?**

- [ ] Engineering: YES
- [ ] Design: YES
- [ ] i18n: YES
- [ ] Security: YES
- [ ] Ops: YES
- [ ] Final checks: YES

**Decision:**

- [ ] **APPROVED:** Proceed to Phase 1 (internal testing)
- [ ] **HOLD:** Blocker found; schedule follow-up sprint

**Final Approval:**

Product Manager: ___________ Date: ________

Ops Lead: ___________ Date: ________

---

## Rollback Plan (if needed)

If Phase 0 is canceled (rare):
1. Disable PR merge (don't land feature branch)
2. Legacy Blast continues as-is on main
3. Reschedule v2 launch for next sprint

If Phase 0 lands but Phase 1 reveals blocking issues:
1. Revert feature branch: `git revert [commit-hash]`
2. Push to main
3. Deploy to production (under legacy Blast, flag off)
4. Fix issue in new branch, re-test, re-gate
