# Admin Dashboard Overhaul — Master Plan

**Date**: 2026-03-14
**Scope**: Full redesign of admin dashboard — UI, backend, analytics, game intelligence
**Expert team**: UI/UX Designer, Backend Architect, Data Analyst, Game Designer

---

## Executive Summary

The current admin dashboard is **operational but immature**: 9 flat navigation cards, no analytics, no moderation queue, no game balance monitoring, performance issues (N+1 queries, no caching), and a critical SQL injection vulnerability. This plan transforms it into a three-mode dashboard (Operator / Analyst / Curator) with 15 KPIs, 12 widgets, cohort retention, churn prediction, cheat detection, and game economy monitoring.

---

## Phase 1: Security & Foundation (Week 1)

### 1.1 Critical Security Fixes (Day 1)
- [ ] **Fix SQL injection** in `ugcModerationRoutes.ts` — whitelist `table` param
- [ ] **Strip PII** from audit logs — hash emails, scrub known PII keys
- [ ] Add `admin_role` column to profiles (viewer/moderator/operator/superadmin)

### 1.2 Backend Foundation (Days 2-3)
- [ ] Create `responseHelpers.ts` — standardized `successResponse`/`errorResponse`
- [ ] Create `paginationSchema.ts` — Zod-validated offset/limit/cursor
- [ ] Create `adminCache.ts` — Redis `withCache` wrapper (TTL-based)
- [ ] Create `distributedRateLimit.ts` — Redis sliding window (replace in-memory)
- [ ] Create `rbac.ts` — role hierarchy middleware

### 1.3 Database Migration (Day 3)
- [ ] `moderation_actions` table (ban/suspend/warn history)
- [ ] `admin_audit_log` table (queryable, PII-free)
- [ ] `game_audit_log` table (word-by-word replay)
- [ ] `admin_alerts` table (notification system)
- [ ] Materialized views: `mv_dau_mau`, `mv_cheat_signals`
- [ ] RPC functions: `admin_overview_stats`, `admin_activity_stats`, `admin_language_breakdown`, `admin_cohort_retention`, `admin_bulk_ban_players`
- [ ] pg_cron refresh schedules for materialized views

### 1.4 Sidebar Navigation (Days 4-5)
- [ ] Replace 9-card grid with 6-item sidebar (Overview, Analytics, Moderation, Content, Players, System)
- [ ] Sidebar: full on desktop, icon-only on tablet, bottom tabs on mobile
- [ ] Persistent moderation badge counter
- [ ] Consistent neo-brutalist design across all pages

---

## Phase 2: Operator Dashboard (Week 2)

### 2.1 Overview Page — KPI Cards
- [ ] DAU with 7-day sparkline (vs same day last week)
- [ ] DAU/MAU stickiness gauge (0-50%)
- [ ] New registrations (authenticated vs guest split)
- [ ] Games completed today (by mode bar)
- [ ] Active games count (live from Socket.IO)
- [ ] Moderation queue depth (traffic light)

### 2.2 Live Monitor Improvements
- [ ] Extract GameCard/PlayerRow to separate files (under 500 lines)
- [ ] Add presence legend (ONLINE/IN GAME/IDLE/OFFLINE labels)
- [ ] Game card drill-down → Game Replay page
- [ ] Player name links → Player Detail page
- [ ] Sort by score/time/state

### 2.3 System Health Panel
- [ ] Redis status, DB latency, Socket.IO connections
- [ ] Memory usage gauge
- [ ] Web Vitals scorecard (LCP/FID/CLS with Google thresholds)
- [ ] Process uptime

### 2.4 Alert System
- [ ] P0 alerts: DAU cliff (>20% drop), game completion crash, Web Vitals spike
- [ ] P1 alerts: moderation queue >50, daily challenge broken, registration drop
- [ ] P2 alerts: stale daily word, friend challenge acceptance drop, adventure wall
- [ ] Alert badge in sidebar, Slack webhook for P0

---

## Phase 3: Analytics Dashboard (Week 3)

### 3.1 Retention & Engagement
- [ ] Cohort retention heatmap (D1/D3/D7/D14/D30 by signup week)
- [ ] Engagement funnel (signup → first game → D7 → D30)
- [ ] Churn risk model (healthy/cooling/at-risk/churned tiers)
- [ ] Average session length trend
- [ ] Streak health distribution

### 3.2 Game Intelligence
- [ ] Game mode popularity donut + 30-day trend sparklines
- [ ] Economy velocity ratio (gold earned vs spent)
- [ ] Gold Gini coefficient (wealth inequality)
- [ ] Upgrade adoption funnel per upgrade type
- [ ] Adventure progression funnel (world completion rates)
- [ ] Blast Mode difficulty curve (completion rates by difficulty)

### 3.3 Competitive Health
- [ ] MMR distribution histogram with fitted normal curve
- [ ] League tier pyramid chart
- [ ] Win rate by MMR bracket
- [ ] Ranked participation rate

### 3.4 Acquisition & Geography
- [ ] UTM source performance table (signups, activation rate)
- [ ] Geographic choropleth map (DAU density)
- [ ] Top 10 countries ranked list with WAU bars

### 3.5 Social Graph
- [ ] Friend count distribution histogram
- [ ] Challenge acceptance rate trend
- [ ] Social DAU percentage

---

## Phase 4: Moderation & Player Management (Week 4)

### 4.1 Unified Moderation Queue
- [ ] Aggregate invalid words + UGC + player reports in time-sorted feed
- [ ] Inline approve/reject with undo toast (5 seconds)
- [ ] Bulk actions (select multiple, batch approve/reject)
- [ ] Filter by type (words/ugc/players) and status
- [ ] Queue depth per type in tab badges

### 4.2 Player Detail Page
- [ ] Profile summary (no PII — username, country, stats, progression)
- [ ] Recent 20 games table with drill-down
- [ ] Moderation history (bans, warnings, notes)
- [ ] Cheat risk signals (Z-score, anomaly flags)
- [ ] Actions: ban/suspend/warn/gift/promote

### 4.3 Cheat Detection
- [ ] Flagged players list (Z-score > 3.0 threshold)
- [ ] Per-player anomaly breakdown
- [ ] Score anomaly alerts (>4 stddev)
- [ ] Speed run detection
- [ ] Word pattern exploit detection

### 4.4 Game Replay/Audit
- [ ] Board snapshot visualization
- [ ] Word-by-word timeline with valid/invalid flags
- [ ] Score timeline chart
- [ ] Player result comparison

### 4.5 Bulk Operations
- [ ] Bulk ban (max 100, atomic via RPC)
- [ ] Bulk revoke blast access
- [ ] Bulk send email by template
- [ ] Player CSV export

---

## Phase 5: Content & Polish (Week 5)

### 5.1 Word Analytics
- [ ] Word difficulty distribution (trivial/normal/skilled/expert)
- [ ] Dictionary gap detection (top rejected words table with "add" action)
- [ ] Invalid word submission trends (stacked area chart)
- [ ] Daily puzzle difficulty calibration score
- [ ] Language-specific coverage metrics

### 5.2 Content Pipeline
- [ ] Daily puzzle calendar view
- [ ] Puzzle pool depth indicator (days of unique content remaining)
- [ ] Stale content alerts (repeat within 90 days)

### 5.3 i18n & Accessibility
- [ ] Replace all hardcoded admin strings with t() keys (~30+ strings)
- [ ] Fix RTL shadow flipping on admin cards
- [ ] WCAG AA color contrast across all admin pages
- [ ] Keyboard navigation with visible focus indicators
- [ ] Table captions and ARIA labels
- [ ] Mobile: stacked card layout below 640px (no horizontal scroll)

### 5.4 A/B Testing Panel (stretch)
- [ ] Low-risk parameters: gold/XP rates, clue timing, streak thresholds
- [ ] Medium-risk: timers, boss HP, upgrade costs (10-20% rollout)
- [ ] Test dashboard: cohort size, primary metric, p-value, auto-pause
- [ ] Kill-switch if Health Score drops >10 points

---

## New Files to Create

### Backend
```
backend/routes/admin/responseHelpers.ts
backend/routes/admin/paginationSchema.ts
backend/routes/admin/adminCache.ts
backend/routes/admin/distributedRateLimit.ts
backend/routes/admin/rbac.ts
backend/routes/admin/statsService.ts
backend/routes/admin/analyticsRoutes.ts
backend/routes/admin/moderationRoutes.ts
backend/routes/admin/moderationQueueRoutes.ts
backend/routes/admin/gameAuditRoutes.ts
backend/routes/admin/cheatDetectionRoutes.ts
backend/routes/admin/bulkOperationRoutes.ts
backend/routes/admin/systemHealthRoutes.ts
```

### Frontend
```
components/admin/sidebar/AdminSidebar.tsx
components/admin/overview/KPICards.tsx
components/admin/overview/SystemHealth.tsx
components/admin/overview/AlertsFeed.tsx
components/admin/analytics/RetentionHeatmap.tsx
components/admin/analytics/EngagementFunnel.tsx
components/admin/analytics/ChurnRiskPanel.tsx
components/admin/analytics/GameModePopularity.tsx
components/admin/analytics/EconomyHealth.tsx
components/admin/analytics/AcquisitionTable.tsx
components/admin/analytics/GeographicMap.tsx
components/admin/analytics/CompetitiveHealth.tsx
components/admin/analytics/AdventureProgressionFunnel.tsx
components/admin/analytics/SocialGraphHealth.tsx
components/admin/moderation/UnifiedQueue.tsx
components/admin/moderation/CheatDetection.tsx
components/admin/players/PlayerDetail.tsx
components/admin/players/BulkActions.tsx
components/admin/games/GameReplay.tsx
components/admin/content/WordAnalytics.tsx
components/admin/content/PuzzleCalendar.tsx
components/admin/live/GameCard.tsx          (extracted from LiveMonitor)
components/admin/live/PlayerRow.tsx         (extracted from LiveMonitor)
```

### Database
```
supabase/migrations/20260314120000_admin_backend_improvements.sql
```

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/routes/admin/ugcModerationRoutes.ts` | Table param whitelist (SQL injection fix) |
| `backend/routes/admin/middleware.ts` | PII hash, distributed rate limit, fetch admin_role |
| `backend/routes/admin/statsRoutes.ts` | Replace 11 queries with RPC + cache |
| `backend/routes/admin/index.ts` | Register new routers |
| `backend/handlers/wordHandler.ts` | Write to game_audit_log on word acceptance |
| `components/admin/LiveMonitor.tsx` | Extract GameCard/PlayerRow, add drill-down |
| `components/admin/InvalidWordsManager.tsx` | Split below 500 lines |
| `app/[locale]/admin/PageClient.tsx` | Replace grid with sidebar layout |

---

## Design Documents

| Document | Location |
|----------|----------|
| UI/UX Design Spec | `docs/admin-dashboard-redesign.md` |
| Master Plan (this file) | `docs/plans/2026-03-14-admin-dashboard-overhaul.md` |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Admin page load time | ~3s (11 queries) | <800ms (cached RPCs) |
| Moderation queue visibility | Buried in Invalid Words page | Badge count always visible |
| Analytics available | 0 charts/cohorts | 12 widgets, 15 KPIs |
| Security vulnerabilities | 1 critical (SQL injection) | 0 |
| Admin test coverage | 2 test files | 11+ test files |
| Files over 500 lines | 1 (InvalidWordsManager) | 0 |
| Hardcoded strings | ~30 | 0 |
