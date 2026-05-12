# Blast v2 Rollout Phases — 4-Phase Sequential Deploy

**Timeline:** Plans 1-7 complete → Phase 0 launch (flag off) → Phase 1-3 over 3 weeks

---

## Phase 0: Pre-Launch (Flag OFF)

**Duration:** 1 sprint (before public rollout)
**Audience:** 0% (feature flag disabled)
**Status:** Legacy Blast ships; v2 code under flag, untouched

**Actions:**
- All Plans 1-6 tests PASS in CI
- Build green: `npm run lint && npm run build`
- Design + i18n review sign-off (HE/SV/JA/ES native speakers)
- Security review: no RNG exploits, server-side validation only
- Feature flag `blast.v2` set to `off` in PostHog UI
- Rollout doc (this file) reviewed by ops team
- Sentry alerts configured for baseline (legacy Blast crash rate)
- PostHog dashboards created manually (specs at `docs/dashboards/`)

**Success Criteria:**
- Zero new issues in CI
- All translations approved
- No Sentry regressions from merge to main

**Rollback:** Not applicable (flag off)

---

## Phase 1: Internal Testing (1 day)

**Flag Setting:** `blast.v2 = true` for `role IN ('admin', 'tester')`
**Audience:** ~5-10 testers on real devices (Android, iOS, web)
**Status:** v2 fully playable; legacy Blast still available for comparison

**Actions:**
1. Smoke test gameplay:
   - Open Blast → v2 board loads
   - Drag-select valid word → "found!" animation + sound + coins ↑
   - Level 1 completion triggers chest
   - Unlock level 2 → triggers FTUE card (if applicable)
   - Navigate back/forth without crashes

2. Check event firing via PostHog console:
   - `blast_level_started` fires on intro dismiss
   - `blast_word_found` fires on each valid word (axis, isCascade match)
   - `blast_level_completed` fires after submit
   - Events have correct payload shape

3. Test all locales (RTL, emoji, special chars):
   - Hebrew: board tiles render RTL, final-form letters display
   - Japanese: hiragana render, no font fallback glitches
   - Spanish/Swedish: diacritics render

4. Monitor crash logs via Sentry:
   - 0 new errors during phase
   - No Redux/state errors
   - No WebGL canvas crashes

**Gate to Phase 2:**
- [ ] No crashes on real devices
- [ ] Events flowing in PostHog console (check Sentry for warnings)
- [ ] Level timing reasonable (not stalling or skipping)
- [ ] i18n visuals OK in all 5 locales

**Rollback (< 5 min):**
- Flip `blast.v2 = false` in PostHog UI
- All testers revert to legacy Blast on next app launch

---

## Phase 2: Staged Rollout (1 week)

**Flag Setting:** Progressive percentage rollout
**Timeline:**
- **Mon:** 10% rollout
- **Tue:** 10% → 25% (if healthy)
- **Wed:** 25% → 50% (if healthy)
- **Fri:** 50% → 100% (if healthy)

**Audience:** 10% → 100% of logged-in players over 7 days

**Gate at Each Step:**
Check the following before advancing to next tier:

| Metric | Target | Check | Cadence |
|--------|--------|-------|---------|
| L1 → L5 retention | ≥ legacy baseline | PostHog funnels | Daily |
| Crash rate | ≤ legacy + 0.5% | Sentry dashboard | Daily |
| Avg session time | ≥ legacy baseline | PostHog trends | Daily |
| Player DAU on Blast | ≥ 80% legacy | PostHog | Daily |

**Success Criteria per Step:**
- All metrics green for 24h
- No new Sentry regressions
- Ad funnel + economy stable (coin earnings reasonable)

**Rollback (< 30 min):**
1. Flip `blast.v2 = false` in PostHog UI (reverts all % tiers)
2. Affected players see legacy Blast on next load
3. Data already captured (game_completed) is kept; no data loss
4. Investigate root cause via Sentry + PostHog

**If Blocked:**
- Pause at current tier (e.g., stuck at 25%)
- Wait 24h, investigate blockers
- May need a hotfix (e.g., difficulty DDA tweak) before advancing
- Or rollback and iterate (Phase 3 contingency)

---

## Phase 3: Legacy Code Deletion (Post-Phase 2, + 1 week)

**Timing:** After Phase 2 hits 100% + 1 week of stable metrics

**Actions:**
1. Delete legacy files:
   ```bash
   rm -rf components/blast/legacy/
   rm -rf app/[locale]/blast/legacy/
   rm lib/blast/v1/* 
   rm lib/blast/blastWaveConfig.ts
   rm backend/modules/blastModeManager.ts
   ```

2. Modify routing:
   - `app/[locale]/blast/page.tsx` → remove flag check, route directly to v2

3. Cleanup:
   - Remove `blast.v2` from `lib/experiments.ts`
   - Remove legacy DB migrations (if any)
   - Update tests (remove legacy-specific test suites)

4. Verify:
   - `npm run lint && npm run test && npm run build` green
   - No stray imports of deleted files

5. Commit:
   ```
   chore(blast): deprecate legacy Blast code post-v2-rollout
   ```

**Rollback:**
- Restore from git (git reset, git revert)
- ~30 min if emergency needed
- In practice, never needed if Phase 2 stable

---

## Success Criteria (3-Month Post-Rollout)

See `blast-v2-success-criteria.md` for detailed KPI targets.

**High-Level Targets:**
- DAU on Blast ≥ 110% legacy peak
- Day-7 retention ≥ 25%
- Avg session length ≥ 8 min
- L1 → L5 funnel ≥ 50%
- No crash rate spike

---

## Emergency Rollback SOP

If at any phase metrics go red:

1. **Decision threshold:** Any single metric red for 12h or two metrics yellow for 24h
2. **Notification:** Ops alert (Slack #incidents)
3. **Action:** Flip `blast.v2 = false` in PostHog (under 5 min)
4. **Investigation:** Root-cause analysis via Sentry + PostHog
5. **Fix:** Hotfix PR (code) or DDA tweak (config)
6. **Re-gate:** If code fix, rebuild APK + retest Phase 1 before advancing
7. **Timeline:** Target re-launch within 24-48h of rollback

---

## Notes

- **Arch:** No DB migrations; v2 uses existing tables (blast_progress, blast_chests)
- **Data loss:** None; both v1/v2 read same progress tables
- **Offline:** Sync pipeline (Plan 8) handles offline clears; no connectivity requirement for Phase 2
- **A/B testing:** All users see v2 at 100%; no comparison group (flag is rollout, not A/B)
