# Offline Mode — Phase 4 Plan: Hardening + Telemetry + Polish

**Date**: 2026-05-11
**Depends on**: Phase 0 + 1 + 2 + 3 shipped.
**Scope**: Production-readiness pass — security, telemetry rollup, error boundaries, translation pre-cache, E2E test coverage.

---

## Goals
- Score-queue cheating resistance via HMAC signing.
- Translations pre-cached so cold offline launches still render correct locale.
- Comprehensive offline telemetry dashboard.
- Error boundaries around every offline boundary (DB I/O, network probe, sync flush).
- Automated E2E coverage of offline + slow-net paths.

---

## Tasks

### 4.1 Score queue HMAC signing
- On enqueue: compute `hmac = HMAC-SHA256(payload || clientSeq, sessionSecret)`.
- `sessionSecret` rotates on session start; stored in Capacitor Preferences.
- Server `/api/scores/sync` rejects rows where `hmac` doesn't recompute (after looking up sessionSecret by user_id).
- Defence in depth — server-wins re-validation is primary; HMAC raises bar for casual local tampering.
- Reason: prevents `sqlite3 app.db "UPDATE score_queue SET payload='{score:999999}'"` from ADB shell.

### 4.2 Translation pre-cache
- Update `public/sw.js` PRECACHE list to include `/translations/{en,he,sv,ja,es}.js`.
- 2.5MB one-time cache after first visit.
- Cache busted by existing `CACHE_NAME` version on deploy.
- Capacitor: bundle locale JS in webDir (already does via `next build`).

### 4.3 Error boundaries
- New `<OfflineErrorBoundary />` wraps every offline-aware page.
- On caught error:
  - Log to Sentry with `tag: offline`, `extra: { networkState, queueDepth }`.
  - Render `<OfflineRecoveryFallback />` with "Retry" + "Reset offline data" CTAs.
- "Reset offline data": clears SQLite + Preferences + reloads. Confirm modal first.

### 4.4 Telemetry dashboard
- PostHog events to confirm wired (some from earlier phases):
  - `offline_session_start { trigger: 'launch'|'network_loss' }`
  - `offline_session_end { durationSec, modesPlayed: [], scoresQueued }`
  - `offline_daily_prefetched { modes, count, durationMs }`
  - `offline_score_queued { mode, scoreClient }`
  - `offline_score_synced { mode, scoreClient, scoreServer, rejectedWords, queuedDurationMs }`
  - `offline_score_rejected { mode, reason }`
  - `offline_storage_quota { usedMB, quotaMB }`
  - `mp_socket_bytes_round { bytes, players }`
  - `mp_resume_success { gapMs }`
  - `mp_resume_failed { gapMs, reason }`
- Dashboard saved view: "Offline Health".
- Cohort: `Offline Users` = anyone with `offline_session_start` in last 30d.

### 4.5 Quota management
- On `offline_storage_quota.usedMB > 80% of quotaMB`: prompt user "Free up offline space?".
- Eviction order: `daily_puzzles_cache` (drop >7d), `dict_words` (keep), `score_queue` (NEVER auto-drop — user data).

### 4.6 E2E coverage
- New `e2e/offline/` Playwright suite:
  - `practice-offline.spec.ts` — `context.setOffline(true)` → load app → drill plays.
  - `sp-offline-then-sync.spec.ts` — offline SP → reconnect → score visible on server.
  - `daily-prefetched.spec.ts` — prefetch online → go offline → daily plays.
  - `mp-disconnect-resume.spec.ts` — 4s disconnect mid-game → words flush on reconnect.
  - `slow-net-optimistic.spec.ts` — throttled CPU 4x + 3G → submit word renders pending immediately.
- Native: manual checklist in `docs/runbooks/offline-android-qa.md` for airplane-mode flows (Playwright doesn't cover native shell).

### 4.7 Translation key audit
- Run `clean-translations` skill against all `offline.*` and `mp.disconnect.*` keys added across Phases 0-3.
- Native review: he, sv, ja, es (per project convention — flag in PR).

### 4.8 Feature flag rollout plan
- Internal track (10 testers): week 1.
- 5% Android prod: week 2. Watch crashlytics + offline_score_rejected rate.
- 50% Android prod: week 3.
- 100% + web rollout: week 4.
- Kill-switch: PostHog flag `offline-mode` defaults on; toggle off remotely kills entire subsystem (validator router falls through to server-only).

---

## TDD Tasks

1. **RED** HMAC roundtrip: sign payload client-side, server recompute matches.
2. **GREEN** implement signing + verification.
3. **RED** server rejects tampered payload (wrong HMAC) with 401.
4. **GREEN** wire rejection path.
5. **RED** SW precaches translations on install.
6. **GREEN** update precache list.
7. **RED** `<OfflineErrorBoundary />` catches SQL error, logs to Sentry mock, renders fallback.
8. **GREEN** implement boundary.
9. **RED** "Reset offline data" clears SQLite + Preferences + survives reload check.
10. **GREEN** implement reset.
11. **RED** quota nag fires at 80% threshold; eviction respects priority.
12. **GREEN** implement eviction policy.
13. **E2E** all 5 Playwright specs pass on CI.

---

## Acceptance — Phase 4
- HMAC tamper test: ADB-shell modify SQLite row → sync returns 401 ✓
- Cold offline launch (uninstall → install → never online) → translations render correct locale ✓
- Sentry receives offline-tagged errors ✓
- PostHog "Offline Health" dashboard populated within 24h of internal rollout ✓
- All 5 Playwright offline specs green on CI ✓
- Translation native review sign-offs on file ✓
- Crashlytics no regression vs Phase 3 baseline ✓
- `npm run lint && npm run test && npm run build` clean ✓

---

## File-Touch Manifest

**New**:
- `lib/offline/hmac.ts`
- `components/offline/OfflineErrorBoundary.tsx`
- `components/offline/OfflineRecoveryFallback.tsx`
- `lib/offline/quota.ts`
- `e2e/offline/practice-offline.spec.ts`
- `e2e/offline/sp-offline-then-sync.spec.ts`
- `e2e/offline/daily-prefetched.spec.ts`
- `e2e/offline/mp-disconnect-resume.spec.ts`
- `e2e/offline/slow-net-optimistic.spec.ts`
- `docs/runbooks/offline-android-qa.md`

**Edited**:
- `lib/offline/scoreQueue.ts` (HMAC integration)
- `app/api/scores/sync/route.ts` (HMAC verification)
- `public/sw.js` (precache translations)
- `app/[locale]/layout.tsx` (wrap with `OfflineErrorBoundary`)
- `translations/{en,he,sv,ja,es}.js` (offline.error.*, offline.reset.*, offline.quota.*)

---

## Risks

| Risk | Mitigation |
|---|---|
| HMAC sessionSecret leaks via Sentry breadcrumb | Mark secret as `PII: true` in Sentry config; never log full payload, only hash. |
| Translation precache 2.5MB hurts first-visit perf budget | Lazy: precache only on second visit (after `install` event sees prior session). One-time hit acceptable for offline-capable users. |
| ErrorBoundary swallows real bugs as "offline" | Boundary only catches errors thrown from `lib/offline/*` and tagged with `OfflineError` subclass. Other errors propagate. |
| Reset offline data is destructive — accidental tap | Two-step confirm: button → modal with "type RESET to confirm". |
| 5% prod rollout discovers cohort-specific crash | PostHog cohort filter on `offline-mode = true`. Pre-rollout: 24h internal track validation. |
| Crashlytics false positives from intentional offline throws | Sentry tag `offline_expected: true` on validator-rejection errors; filter out in dashboards. |

---

## Post-launch: ongoing care

- Weekly: review `offline_score_rejected` reasons. New `reason` codes mean new edge cases.
- Monthly: review storage quota distribution. P95 should stay < 30MB.
- Per-release: re-run airplane-mode QA runbook on Android.
- Reference: `realtime-publication-perf-fix-2026-05-06` precedent — don't add Realtime subscriptions to offline-touched tables without checking publication audit.
