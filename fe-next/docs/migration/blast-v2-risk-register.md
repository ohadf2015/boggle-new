# Blast v2 Risk Register — Monitoring & Alerting

**Updated:** 2026-05-12

---

## Risk Matrix

| Risk ID | Risk | Impact | Likelihood | Detection | Mitigation |
|---------|------|--------|------------|-----------|-----------|
| R-01 | Generator flat/boring boards | Retention ↓ | Medium | cascade_rate < 0.2 per level | Raise interestingness threshold; manual audit first 50 per locale |
| R-02 | Tutorial copy missed in HE/JA | Confusing FTUE | Medium | ftue_step_complete_rate < 50% by locale | Pre-gate Phase 2 on native review + QA |
| R-03 | Chest preview RNG exposed (client) | Economy abuse | Low | duplicate_avatar_part rate > 5% | Code review: verify server-side RNG only |
| R-04 | Player backlash vs old Blast | Engagement ↓ | Low | v2/legacy DAU ratio < 0.8 in week 1 | Flip flag off within 1h; analyze Reddit/Discord |
| R-05 | Cascade rate too low | Meh gameplay | Medium | cascade_rate < 0.3 globally | A/B test interestingness weights; bump floor by 0.05 |
| R-06 | Content authoring slow | Level gap at launch | Medium | level_count < 30 authored | Use generator for all; replace with authored as ready |
| R-07 | Offline sync stale | Lost progress | Low | offline_award_log row count → production (inspect) | Server-side idempotency; test offline flow E2E before Phase 1 |

---

## Monitoring Dashboards (PostHog)

### Daily Checks (Phase 2)

**Dashboard 1: Engagement Funnel**
- L1 start → L5 start → L10 start (conversion %)
- Baseline from legacy Phase 0
- Alert: Any step < 80% of legacy baseline

**Dashboard 2: Cascade Quality**
- cascade_rate (avg cascades per clear) by theme
- Target: 0.3-0.6
- Alert: Theme < 0.2 or global > 1.0

**Dashboard 3: Crash & Stability**
- Sentry error rate by error type
- Baseline from legacy Phase 0
- Alert: Any new error cluster > 1% of traffic

**Dashboard 4: Tutorial Friction**
- blast_ftue_step completion rate by step & locale
- Target: > 80% per step
- Alert: Any locale < 50% on step 1-2

### Weekly Checks (Phase 2 → Phase 3)

**Dashboard 5: Economy Health**
- Avg coins earned per clear (by level, by theme)
- Chest open rate (opens per DAU per week)
- Alert: Avg coins > 200 or < 50 (farming/too hard)

**Dashboard 6: Content Difficulty Ramp**
- Hints used per level (trend)
- Words found per level (trend)
- Alert: Level X avg hints > 3 (too hard)

### Monthly Checks (Phase 3)

**Dashboard 7: Retention & Cohort**
- Day-7 retention (v2 vs legacy baseline)
- DAU trend (v2 only, week-over-week)
- Target: ≥ legacy baseline at all cohort ages

---

## Risk Responses

### R-01: Flat Boards

**Detection:** `cascade_rate < 0.2` for 3+ days on a theme
- View `blast-v2-cascade-rate.sql` dashboard
- Drill into worst-performing theme

**Response:**
1. **Immediate:** Inspect 5 recent generated boards for the theme
   - Are word placements isolated (words not adjacent)?
   - Is lexicon too small (not enough words for density)?
   - Run generator audit (`lib/blast/v2/blast-generator-audit.ts`) to score boards

2. **If audit finds pattern (e.g., low interestingness score):**
   - Raise `interestingnessScore` threshold in generator config
   - Re-generate next batch of boards for that theme
   - Monitor cascade_rate for 24h

3. **If no pattern (random bad luck):**
   - Manually author 10-20 boards for theme
   - Blend generated + authored for 1 week
   - Re-evaluate generator

4. **Timeline:** Fix within 48h of alert

---

### R-02: Tutorial Copy Issues

**Detection:** `ftue_step_complete_rate` dips below 50% for any locale on phase 2 day 1

**Response:**
1. **Immediate:** Check PostHog event payload for that locale
   - Do events fire? (Yes → not data collection issue)
   - Are `step_number` and `advance_reason` populated? (Yes → data OK)

2. **Root cause:**
   - Engage native speaker (assign on-call)
   - Compare copy against design spec (should be 1-2 sentences per step)
   - Check for font fallback glitches (screenshots in RTL/CJK)

3. **If copy confusing:**
   - Provide clearer copy within 24h
   - Deploy hotfix (change `translationKeyXXX` in BlastFtueOverlay)
   - Retest with native speaker

4. **If visual glitch:**
   - Fix font rendering in CSS (e.g., font fallback, line-height)
   - Deploy hotfix
   - Retest

5. **If both:**
   - Regress to Phase 1 (10% testers only)
   - Fix + retest 24h
   - Resume Phase 2 at 10% again

---

### R-03: RNG Exposure

**Detection:** `blast_chest_opened` shows `is_duplicate: true` for > 5% of opens

**Response:**
1. **Code review:** Verify `BlastChestOpenModal` does NOT call `Math.random()` to decide avatar part
   - Should receive pre-determined `avatarPart` from server (`useBlastProgress`)
   - Server-side generator uses seeded PRNG (see `lib/blast/v2/prng.ts`)

2. **If client-side RNG found:**
   - Remove immediately
   - Replace with server value
   - Deploy hotfix

3. **Monitor:** Duplicate rate should stay < 2% (normal RNG variance)

---

### R-04: Backlash vs Old Blast

**Detection:** Player sentiment on Discord/Reddit or `(v2_DAU / legacy_DAU) < 0.8` in Phase 2 week 1

**Response:**
1. **Immediate:** Flip `blast.v2 = false` (under 5 min)

2. **Investigate:** What's the complaint?
   - Difficulty too hard? → DDA adjustment needed
   - Missing features from v1? → Scope creep (design doc should have addressed)
   - Bugs? → Sentry + logs

3. **Fix:** Code fix or config change

4. **Timeline:** Target re-launch within 48h

5. **Comms:** Announce planned improvements on Discord #announcements

---

### R-05: Cascade Rate Low

**Detection:** Global `cascade_rate < 0.3` for 5+ days

**Response:**
1. **A/B test:** Split players 50/50
   - Control: current interestingness weights
   - Treatment: bump `interestingnessScore` threshold by 0.1
   - Run for 7 days

2. **Metric:** cascade_rate on control vs treatment

3. **Decision:**
   - If treatment ≥ target: roll out globally
   - If still low: try threshold +0.2 on next iteration
   - If > target: may have swung too far; dial back

4. **Timeline:** 1-2 weeks per cycle

---

### R-06: Slow Authoring

**Detection:** `level_count < 30` at launch OR authoring team reports blockers

**Response:**
1. **Use generated boards:** Roll out with all generated content
   - Set flag `useOnlyGenerated: true`
   - Schedule daily generator run to refresh boards

2. **Parallel authoring:** Team works on 10-20 themed packs while users play generated boards

3. **Gradual replacement:** Each week, swap in ~5 authored levels
   - New players always see authored boards (better quality)
   - Returning players see mix

4. **Timeline:** Target 50+ authored boards within 4 weeks of launch

---

### R-07: Offline Sync Stale

**Detection:** `offline_award_log` shows stale timestamps OR user reports lost progress

**Response:**
1. **Check logs:** Did sync fire?
   - Query `offline_award_log` for user_id
   - Check timestamp (should be recent)
   - Check `synced_at` (should be non-null)

2. **If stale:**
   - Replay sync handler: check `/api/scores/sync` endpoint
   - Verify Supabase connectivity
   - Check rate limiting (50 msg / 10s)

3. **If sync failed:**
   - Check `backend/handlers/scoreSyncHandler.ts` for errors
   - Verify idempotency via `submissionId` UUID (should de-dup retries)

4. **User recovery:** Admin can re-grant coins/XP via Supabase if needed

---

## Escalation Contacts

- **Product:** @[owner]
- **Engineering:** @[eng-lead]
- **Native Speakers (i18n):** @[he], @[sv], @[ja], @[es]
- **Operations (PostHog/Sentry):** @[ops-lead]
- **Discord Moderators (community sentiment):** @[mod-lead]

---

## Pre-Phase 2 Sign-Off Checklist

- [ ] All dashboards created in PostHog
- [ ] Sentry alerts configured
- [ ] Risk register reviewed by team
- [ ] Emergency contacts confirmed
- [ ] Phase 1 testers trained on how to report issues
