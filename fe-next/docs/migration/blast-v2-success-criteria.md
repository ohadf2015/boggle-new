# Blast v2 Success Criteria — 3-Month KPI Targets

**Launch Date:** 2026-05-12 (Phase 0)
**Success Measurement Window:** 2026-05-12 to 2026-08-12 (12 weeks post-Phase-0 launch)

---

## Executive Summary

Blast v2 is successful if it delivers **higher retention, engagement, and monetization** compared to legacy Blast baseline (measured in weeks 0-2 of Phase 2 at 10% rollout).

**Go / No-Go Gate:** If any PRIMARY metric is red at 12 weeks, trigger postmortem + iteration sprint.

---

## Primary Metrics (Must Hit)

| # | Metric | Target | Baseline | PostHog Query | Cadence | Owner |
|---|--------|--------|----------|--------------|---------|-------|
| P1 | DAU on Blast (rolling 7d) | ≥ 110% legacy peak | Week 0 legacy DAU | Trends: count distinct(`distinct_id`) where `event = 'blast_level_started'` | Daily | Product |
| P2 | Day-7 Retention | ≥ 25% | Legacy baseline (12%) | Funnel: `blast_level_started` week 0 → any event week 1 | Weekly cohorts | Product |
| P3 | L1 → L5 Funnel | ≥ 50% | Legacy ~40% | Funnel: `blast_level_started(level=1)` → `blast_level_started(level=5)` | Weekly | Product |
| P4 | Avg Session Length | ≥ 8 min | Legacy ~6 min | Trends: `(max(timestamp) - min(timestamp)) / 60` per session | Weekly | Product |
| P5 | Crash Rate | ≤ Legacy + 0.5% | 0.8% | Sentry: crash count / unique sessions | Daily | Engineering |

---

## Secondary Metrics (Directional)

| # | Metric | Target | PostHog Query | Cadence | Owner |
|---|--------|--------|--------------|---------|-------|
| S1 | Chest Opens / DAU / Week | ≥ 0.8 | Count distinct(`distinct_id`) with `blast_chest_opened` / unique players / 7 | Weekly | Product |
| S2 | Cascade Rate (avg per clear) | 0.3-0.6 | Trends: avg(`cascades`) from `blast_level_completed` | Weekly | Design |
| S3 | L1 FTUE Completion | ≥ 85% | Funnel: `blast_ftue_step(step=1)` → `blast_ftue_step(step=6)` | Weekly | Design |
| S4 | Avatar Part Adoption | ≥ 15% new | Count `avatar_part` drops / count new avatar equips | Monthly | Product |
| S5 | Hint Usage per Clear | < 1.5 avg | Trends: avg(`hints_used`) from `blast_level_completed` | Weekly | Design |

---

## Measurement Methodology

### Baseline Collection (Phase 0-1, week -1 to 0)

Run legacy Blast with flag OFF to capture baseline metrics:
1. Disable v2 entirely
2. Measure legacy DAU, session length, funnel metrics for 7 days
3. Store as baseline in Notion/spreadsheet

### Phase 1-2 Collection (week 1-3)

At 10% rollout, run parallel dashboards:
- **v2 Only** (10% of traffic): new metrics
- **Legacy Only** (90% of traffic): baseline continuation

Compare daily; alert if v2 significantly worse.

### Phase 3 Collection (week 4-12)

At 100% rollout, measure all v2:
- Weekly cadence for all metrics
- Roll up to 4-week moving averages for stability
- Track seasonality (weekday vs weekend)

---

## Success Gates by Milestone

### Phase 2 Week 1 (10% rollout)

**Gate Decision:** Proceed to 25%?

Required:
- [ ] P2 (D7 retention) ≥ 20% (2% below target OK for small sample)
- [ ] P5 (crash rate) ≤ legacy + 1%
- [ ] No new Sentry error cluster > 5% traffic

Action if blocked:
- Investigate root cause (difficulty? tutorial?)
- Stay at 10% + hotfix
- Re-gate after 48h

### Phase 2 Week 2-3 (25-50% rollout)

**Gate Decision:** Proceed to 100%?

Required:
- [ ] P1 (DAU) ≥ 100% legacy (sample now large enough)
- [ ] P2 (D7 retention) ≥ 23%
- [ ] P3 (L1-L5 funnel) ≥ 45%
- [ ] P5 (crash rate) ≤ legacy + 0.5%

Action if blocked:
- Rollback to Phase 1
- Iterate on content/difficulty
- Re-launch in next sprint

### Phase 3 Week 4-12 (100% rollout)

**Final Assessment:** Hit all PRIMARY metrics?

- [ ] P1: DAU ≥ 110% legacy
- [ ] P2: D7 retention ≥ 25%
- [ ] P3: L1-L5 funnel ≥ 50%
- [ ] P4: Avg session ≥ 8 min
- [ ] P5: Crash rate ≤ legacy + 0.5%

If all green → **SUCCESS.** Continue support + iteration.

If any red → **POSTMORTEM.** Identify why + plan Phase 3.5 iteration.

---

## Failure Scenarios & Contingencies

### Scenario A: Retention Collapsed (P2 < 15%)

**Root Cause Candidates:**
1. Difficulty too hard (avg hints > 2.5, cascade rate < 0.1)
2. Tutorial confusing (FTUE completion < 60%)
3. Economy broken (avg coins > 300 per clear = farming)
4. Bugs (frequent crashes on level complete)

**Hotfix:**
- If difficulty: lower DDA `interestingness_threshold` by 0.1
- If tutorial: clarify copy, test with HE/JA speakers
- If economy: review coin-earning rates vs ads/boosts
- If bugs: Sentry-driven fixes

**Timeline:** Implement within 48h, re-gate

---

### Scenario B: Engagement Flat (P3 funnel ≤ 40%)

**Root Cause Candidates:**
1. Early levels too easy (players bored by L5)
2. Content too sparse (same word groups repeated)
3. Difficulty curve steep (L5-L10 jump too hard)
4. Players prefer legacy (muscle memory)

**Hotfix:**
- Audit generated L1-L5 boards for uniqueness
- Increase word variety per level
- Adjust DDA curve (slower ramp)
- A/B test legacy → v2 onboarding flow

**Timeline:** Test + deploy within 1 week

---

### Scenario C: Crash Rate Spiked (P5 > 1.3%)

**Root Cause:**
- Check Sentry for error type
- Likely: WebGL canvas on certain devices, RNG logic, timer stall

**Hotfix:**
- Canvas: fallback renderer or WebGL disable per device
- RNG: revert to legacy algorithm
- Timer: add watchdog + safety checks

**Timeline:** Hotfix within 24h

---

## Bonus Metrics (Nice-to-Have)

- **ARPU increase:** Avg revenue per user (coins bought, ads watched)
  - Target: ≥ legacy + 5%
  - PostHog: revenue events (ad.shown, purchase.coins)

- **Booster Usage:** % of clears with power-ups active
  - Target: ≥ 20% (shows economy engagement)
  - PostHog: count `power_up_activated` / `blast_level_completed`

- **Leaderboard Participation:** % of players on Blast leaderboard
  - Target: ≥ 30% of DAU (indicates competitive interest)
  - PostHog: distinct(`user_id`) with `leaderboard.viewed` / distinct DAU

---

## Post-Success Roadmap

If all PRIMARY metrics green at week 12:

1. **Month 2:** Scale up + passive iteration
   - Monitor metrics weekly (looser cadence)
   - Gather player feedback (Reddit, Discord)
   - Author more curated content (gradually replace generated)

2. **Month 3:** Feature iteration
   - A/B test seasonal themes
   - Explore leaderboard social mechanics
   - Consider ranked mode (ELO) if D7 retention stays strong

3. **Month 4+:** Expansion
   - Cross-promote with other game modes
   - Blast tournaments / season pass
   - Integrate with avatar cosmetics (deeper avatar-Blast loop)

---

## Data Sources & Ownership

- **PostHog:** Product team (dashboard refresh daily)
- **Sentry:** Engineering team (alert + triage daily)
- **Supabase:** Backend (DB queries for economy validation weekly)
- **Google Analytics:** Optional (web session flow analysis monthly)
- **Notion:** Shared metrics hub (updated Friday EOD)

---

## Stakeholder Signoff

- [ ] Product Manager: ___________  Date: _______
- [ ] Engineering Lead: ___________  Date: _______
- [ ] Design Lead: ___________  Date: _______
- [ ] Ops / Data: ___________  Date: _______
