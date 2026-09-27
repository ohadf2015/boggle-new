# Offline Mode — Phase 0 + 1 Plan

**Date**: 2026-05-11
**Scope**: Foundation (plugins, storage, network detection) + Practice & Single-Player offline.
**Out of scope (later phases)**: Daily prefetch + score queue (Phase 2), MP resume (Phase 3), polish (Phase 4).
**Conflict policy**: Server-wins on sync. Server re-validates word list against canonical dict.
**Targets**: Native Android (Capacitor APK) full-offline + web slow-net degraded.

---

## Phase 0 — Foundation

### Goals
- Capacitor plugins for native persistence + network state installed and wired.
- Single `OfflineStore` abstraction available to callers (web + native).
- `useNetworkState()` hook returns `{ online, slow, type, rttMs }`.
- **Zero user-visible behavior change.** Feature flag `offline-mode` defaults off.

### Tasks

#### 0.1 Install plugins
- Already installed: `@capacitor/preferences@^8.0.0`.
- New deps needed: `@capacitor/filesystem`, `@capacitor/network`, `@capacitor-community/sqlite`, `idb` (web KV), `fake-indexeddb` (dev/test), `sql.js` (web SQLite shim).
- Run `npx cap sync android` after install.
- Update `capacitor.config.ts` plugin block with SQLite encryption pragma (`androidIsEncryption: true` if we hold a key in Preferences).
- Add to `package.json` peer-deps note: web fallback `sql.js` for IndexedDB-backed SQLite on web.

#### 0.2 OfflineStore abstraction
- New file: `fe-next/lib/offline/storage.ts`.
- Interface:
  ```ts
  interface OfflineStore {
    kv: { get(key: string): Promise<string|null>; set(key: string, val: string): Promise<void>; del(key: string): Promise<void>; }
    sql: { run(stmt: string, params?: unknown[]): Promise<{ rows: unknown[] }> }
    file: { read(path: string): Promise<Uint8Array|null>; write(path: string, data: Uint8Array): Promise<void> }
  }
  ```
- Two implementations:
  - `NativeStore`: `@capacitor/preferences` + `@capacitor-community/sqlite` + `@capacitor/filesystem`.
  - `WebStore`: `idb` wrapper for KV (with `localStorage` fallback) + `sql.js` for SQL + IndexedDB blob store for files.
- Factory: `getOfflineStore()` detects `Capacitor.isNativePlatform()`.

#### 0.3 Migration runner
- File: `fe-next/lib/offline/migrations.ts`.
- Versioned migrations stored in `kv['offline_schema_version']`.
- v1 migration: create tables `dict_words` (FTS5), `score_queue`, `daily_puzzles_cache`, `kv_meta`.

#### 0.4 Network state hook
- Extend `fe-next/hooks/useOnlineStatus.ts` → new `useNetworkState()`.
- Return: `{ online: boolean, slow: boolean, type: 'wifi'|'cellular'|'none'|'unknown', rttMs: number|null }`.
- Sources:
  - `navigator.connection.effectiveType` (web Network Info API).
  - `@capacitor/network` `getStatus()` + listener (native).
  - Active probe: `fetch('/api/ping', { method: 'HEAD', timeout: 3000 })` every 30s when foreground + `online=false` suspected.
- Slow = effectiveType in {`2g`, `slow-2g`} OR probe rtt > 2000ms.
- `/api/ping` new route — returns 204 with `Cache-Control: no-store`.

#### 0.5 Feature flag
- `offline-mode` PostHog flag (default off, 0% rollout).
- `useOfflineModeFlag()` hook reads flag + falls back to `process.env.NEXT_PUBLIC_OFFLINE_DEV=1` for local testing.

### TDD Tasks (Phase 0)
1. **RED** `__tests__/lib/offline/storage.web.test.ts` — `WebStore.kv.set/get/del` round-trip, isolated per test via `fake-indexeddb`.
2. **GREEN** implement `WebStore.kv`.
3. **RED** SQL `run` round-trip (`CREATE TABLE`, `INSERT`, `SELECT`).
4. **GREEN** wire `sql.js`.
5. **RED** `NativeStore` via mocked Capacitor plugins (`vi.mock('@capacitor/preferences')`).
6. **GREEN** implement `NativeStore`.
7. **RED** `useNetworkState` — slow detection from `effectiveType=2g`, probe-failure path.
8. **GREEN** implement hook + probe.
9. **RED** migration v1 idempotency (run twice → same state).
10. **GREEN** version-check guard.

### Acceptance — Phase 0
- `npm run test` passes new offline-store tests.
- Android dev build launches; SQLite plugin echo round-trip works from in-app dev panel.
- Feature flag visible in PostHog. Default off.

---

## Phase 1 — Practice + Single-Player Offline

### Goals
- Airplane mode → app opens (Capacitor) → Practice + SP boggle play end-to-end with score recorded locally.
- On reconnect, scores sync server-side; server validates words; client reconciles.
- Web slow-net: same code path with web storage. No regression to online users.

### Tasks

#### 1.1 Dictionary bundling
- Add `fe-next/scripts/build-dict-assets.ts` — converts `data/wikipedia-words/{locale}.json` → compact line-delimited gzip blobs in `public/dicts/{locale}.dict.gz` (~80KB each after gzip).
- Capacitor `webDir` already copies `public/` — blobs ship in APK.
- Build step hooked into `npm run build` (pre-build target).

#### 1.2 Dict loader
- New: `fe-next/lib/offline/dict.ts`.
- `ensureDictLoaded(locale)` — checks `kv['dict_loaded_{locale}']`, if missing: fetch blob from `/dicts/{locale}.dict.gz`, gunzip, bulk-insert into `dict_words(word TEXT, locale TEXT)` with index `(locale, word)`.
- Idempotent. ~50ms on Android mid-range to insert 30k words via single transaction.
- `validateOffline(word, locale): Promise<boolean>` — single indexed equality lookup.
- **FTS5 not used**: sql.js npm bundle lacks `SQLITE_ENABLE_FTS5` compile flag (verified Phase 0 cycle 3). For prefix lookups we use range queries `WHERE locale = ? AND word >= ? AND word < ?` which are O(log n) on the btree index — functionally equivalent for our access patterns. Native Capacitor SQLite ships FTS5, but we'd rather have web/native parity than locale-specific behavior.

#### 1.3 Validator router
- Edit `fe-next/lib/wordValidation/validate.ts` (or current entry).
- Decision tree per request:
  1. `online && !slow` → server (`/api/validate-word`).
  2. `online && slow` → local first, server async revalidation (telemetry-only).
  3. `!online` → local only, mark word `pendingRevalidation=true` in submitted set.
- Returns same shape as today so callers don't change.

#### 1.4 Board generator extraction
- Move `backend/utils/gameUtils.generateRandomTable` → `lib/board/generate.ts` (shared).
- Existing backend re-exports for unchanged backend callers.
- Client SP + adventure import from new shared location.
- Why: client must not call backend code paths offline. Today adventure already does this; SP currently mixes.

#### 1.5 Score queue (minimal subset for Phase 1)
- New: `fe-next/lib/offline/scoreQueue.ts`.
- Insert on game end when `!online`: `{ id: uuid(), mode: 'sp'|'practice', payload, createdAt, attempts: 0 }`.
- Flush worker: on `online → true` transition, drain queue with exponential backoff (1s/2s/4s/.../60s cap).
- Honor 429 `Retry-After`.
- Server side: new POST `/api/scores/sync` accepts batch `{ submissions: [{ id, mode, payload, clientCompletedAt }] }`. Idempotent on `id`. Returns per-submission `{ accepted, finalScore, rejectedWords[] }`.
- Practice mode: no server submission needed (already local). Queue is no-op for practice — keep scoped to SP for Phase 1.

#### 1.6 UI affordances (minimal)
- `<OfflineBanner />` component mounted in `app/[locale]/layout.tsx`.
- Yellow chip, dismissible per-session, persists dismissal via Preferences.
- Strings: `t('offline.banner.title')`, `t('offline.banner.subtitle')`, `t('offline.banner.dismiss')`.
- 5 locales (en/he/sv/ja/es). Native review flagged for he/sv/ja/es per project convention.
- A11y: `role="status"`, `aria-live="polite"`.

#### 1.7 Sync reconciliation toast
- On flush response with `rejectedWords[]`: toast `t('offline.sync.adjusted', { from, to, count })`.
- Logged: PostHog event `offline_score_synced` with `{ mode, queuedDurationMs, rejectedCount }`.

### TDD Tasks (Phase 1)
1. **RED** `dict.test.ts` — `ensureDictLoaded('en')` bulk-inserts, second call is no-op.
2. **GREEN** implement loader.
3. **RED** `validateOffline('HELLO', 'en')` true, `validateOffline('ZZQX', 'en')` false.
4. **GREEN** implement FTS5 query.
5. **RED** validator-router prefers local when offline; prefers server when online.
6. **GREEN** wire decision tree.
7. **RED** `scoreQueue.enqueue` → row appears; `flush` consumes; idempotency on retry.
8. **GREEN** implement queue.
9. **RED** `/api/scores/sync` rejects `submissionId` already accepted (returns prior result, idempotent).
10. **GREEN** implement route w/ unique constraint on `id`.
11. **RED** server-side: submission with invalid word → `rejectedWords[]` populated, `finalScore` reduced.
12. **GREEN** implement re-validation pass.
13. **RED** integration: airplane-mode → play SP → toggle online → score synced + toast surfaces.
14. **GREEN** wire UI + transition handler.
15. **RED** `OfflineBanner` shows when `!online`, hides when online, persists dismissal.
16. **GREEN** implement banner.

### Acceptance — Phase 1
- Airplane mode test on Android device:
  - App launches cold ✓
  - Practice drill plays + scores correctly ✓
  - SP boggle round plays, score saved to queue ✓
- Reconnect → score appears on server within 5s.
- Server rejects 1 deliberately-invalid word → toast surfaces correct count.
- All 5 locale strings round-trip via `t()` (HE RTL pixel-check).
- `npm run lint && npm run test && npm run build` clean.
- PostHog events firing: `offline_session_start`, `offline_score_queued`, `offline_score_synced`.
- Feature flag `offline-mode` toggles whole subsystem on/off.

---

## Open Decisions

| Decision | Default proposed |
|---|---|
| Dict format on disk | gzipped LF-delimited word list (smaller than JSON, ~80KB/locale) |
| Web SQLite shim | `sql.js` (5MB WASM) vs hand-roll on IDB. Default: `sql.js` for parity, lazy-load behind dynamic import |
| Practice mode queue | **No queue** (already local-only). Decision: keep out of scope until Phase 2 if telemetry desired |
| HMAC-sign queue rows | Defer to Phase 4 hardening |

---

## File-Touch Manifest (Phase 0+1)

**New**:
- `lib/offline/storage.ts`
- `lib/offline/migrations.ts`
- `lib/offline/dict.ts`
- `lib/offline/scoreQueue.ts`
- `lib/board/generate.ts`
- `components/offline/OfflineBanner.tsx`
- `app/api/ping/route.ts`
- `app/api/scores/sync/route.ts`
- `scripts/build-dict-assets.ts`
- `__tests__/lib/offline/*`

**Edited**:
- `capacitor.config.ts` (plugin config)
- `package.json` (deps + build script)
- `hooks/useOnlineStatus.ts` → `useNetworkState`
- `lib/wordValidation/validate.ts` (router)
- `app/[locale]/layout.tsx` (banner mount)
- `translations/{en,he,sv,ja,es}.js` (offline.* keys)
- `backend/utils/gameUtils.ts` (re-export only)

**Migrations**:
- Supabase: `score_submissions` table needs unique constraint on `client_submission_id` if not already (verify against brain-drills audit precedent).

---

## Risks specific to Phase 0+1

| Risk | Mitigation |
|---|---|
| `sql.js` 5MB WASM bloats web bundle | Dynamic import, served only when offline path active. Tree-shake via Next dynamic. |
| Capacitor SQLite plugin version drift with Capacitor core | Pin exact versions; smoke test on `npx cap doctor`. |
| Dict bundle adds APK size visible in Play Console | Acceptable (~400KB total gz). Document in release notes. |
| Locale change mid-session → wrong FTS5 partition | Index has `(word, locale)`; queries always filter by locale. |
| Server-side `/api/scores/sync` cheating: client claims any score | Server re-validates each word against canonical dict + recomputes score. Trust nothing in payload except `submissionId` for dedupe. |
