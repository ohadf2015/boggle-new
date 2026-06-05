# Offline Mode + Local-Transport MP — Spec

**Date:** 2026-06-05
**Goal:** "offline mode isn't really working — make it work with no internet; explore BT/wifi-mesh MP."

Two deliverables, **decoupled** (offline-SP ships independently of mesh):

- **A. Offline single-player** — the actual complaint. Ship now.
- **B. Local-transport MP (BT / WiFi-mesh)** — feasibility spike + design. Do not gate A on B.

---

## Audit summary (what exists / what's broken)

Offline machinery is **built but fragile**:

| Layer | State |
|---|---|
| Service worker (`lib/sw/swSource.ts`, served via `app/sw.js/route.ts`) | Registered prod-only. Cache-first assets, network-first nav + cached-shell fallback. Precaches locale homes + offline-mode routes. |
| Offline detection (`useNetworkState`, `NetworkStatusHandler`, `OfflineFallback`) | Solid. Web + Capacitor Network plugin. |
| Offline store (`lib/offline/storage.ts`) | sql.js (web) / CapacitorSQLite (native). Score queue + daily cache + kv. |
| Score queue + sync (`scoreQueue.ts`, `sync.ts`, `useOfflineSync`) | Works for `sp / wotd / daily-* / brain / adventure`. |
| Offline-capable modes (`offlineCapableModes.ts`) | Declares `blast / connections / daily`. |

**Blockers (root → symptom):**

1. **Dictionary is `network-only` in the SW** (`/api/dictionary-words` matches `/\/api\//` in `NETWORK_ONLY_PATTERNS`). Client hook caches it in IndexedDB with a **24h TTL**; on expiry it re-fetches, which **fails offline** → every word rejected. Cold-start offline → no dict at all. This breaks Blast + Daily offline word validation.
2. **Blast / Connections scores are lost offline** — `ScoreMode` excludes `'blast'` and `'connections'`, so their results submit directly (no queue) and vanish if offline.
3. **Dict prewarm runs in `requestIdleCallback`** (low priority) — may never fire before the user goes offline.
4. **Native cold-launch offline is impossible by design** — `capacitor.config.ts` sets `server.url: 'https://www.lexiclash.live'`. First-ever launch with no network → `error.html`, no play. (SW only helps *after* one successful online load.)

**Safety checks for the config change (verified):**
- `isNative` keys off the injected `globalThis.Capacitor` bridge (`utils/platform.ts`), **not** content origin → local-bundling keeps the offerwall/native gates correct.
- Families/COPPA compliance rests on age-gate + server-side `ensureSocialCapability` + parental-controls (`docs/2026-06-03-families-policy-social-compliance.md`), **not** on "remote URL = web". The remote-URL doc calls it mere *logistics* ("no native release needed"). → local-bundling does **not** re-open the Play review.

---

## A. Offline single-player

### Phase A1 — quick wins (ship now, no Capacitor config change)

Fixes web offline **fully** (after one online visit, permanent) and the native "went-offline-mid-session / relaunch-with-SW-shell" path.

**A1.1 Dictionary offline-first in the SW.**
Route `/api/dictionary-words*` to **stale-while-revalidate** instead of network-only: serve cache instantly (works offline), refresh in background when online. This kills *both* the cold-start dict failure and the 24h-TTL re-fetch failure (the hook's re-fetch now succeeds from SW cache offline). SW intercepts dedicated-worker fetches, so `dictionaryWorker` benefits with no worker change.
- Edit `lib/sw/swSource.ts`: add `DICT_SWR_PATTERN = /\/api\/dictionary-words/`, handle it **before** the network-only check with an explicit cache-then-revalidate `respondWith`.
- Bump `SW_CACHE_NAME`.
- Size: don't precache (Hebrew 4.9MB, English ~2.5MB). Cache **on first fetch**, active-locale only.

**A1.2 Queue Blast + Connections scores offline.**
- Add `'blast'`, `'connections'` to `ScoreMode`.
- Wire their result submission: if offline (or submit fails network), `enqueueScore` instead of dropping. Server `/api/scores/sync` must accept the new modes (verify/extend the sync route's mode handling).

**A1.3 Prewarm dict eagerly.**
- `DictionaryPrewarmer`: fire `prewarmDictionary` immediately on mount; keep idle/timeout only as a secondary nudge. Guarantees the active-locale dict is fetched (→ SW-cached) on first interactive load.

### Phase A1.4 — explicit "Download for offline" + encrypted dictionary storage (user-requested)

Today the dict is SW-cached **lazily** (only after the active locale is fetched once). A user who wants to play offline on a flight can't proactively prepare, and the curated/community-approved word lists (work-product IP: approved words, noun lists, kanji compounds) sit in plaintext cache. User asks for an explicit download that stores dictionaries **encrypted**.

- **UI**: an "Offline" section (settings / offline launcher) — per-language "Download" button with size + status (downloaded / downloading / stale) + "Delete". i18n × 5, RTL-safe.
- **Encrypted storage** — the key is the whole game:
  - **Key management (the crux):** generate a **non-extractable** AES-GCM 256 `CryptoKey` (`crypto.subtle.generateKey(..., extractable=false, ...)`), persist the *key object itself* in IndexedDB (CryptoKeys are structured-cloneable even when non-extractable — JS can use it to decrypt but **cannot export the bytes**). This makes at-rest ciphertext genuinely unreadable by casual inspection, with no plaintext key sitting beside it. On native, optionally wrap with Capacitor SecureStorage/Keychain. **Reject** the theater option (key in plaintext next to ciphertext).
  - **Cipher**: AES-GCM, fresh 96-bit IV per record, store `{iv, ciphertext, wordCount, downloadedAt}`.
  - **Store**: offline SQL store (`storage.ts`) — a new `offline_dictionaries(locale, iv, ciphertext, word_count, downloaded_at)` table (the existing `dict_words` table is plaintext; superseded by this).
  - **Load tier** in `useDictionaryCache`: memory → **encrypted offline store (decrypt → Set)** → SW/IndexedDB fetch cache → network.
- **Modules**: pure `lib/offline/dictionaryCrypto.ts` (encrypt/decrypt + key mgmt, fully unit-testable with WebCrypto) + `lib/offline/dictionaryDownload.ts` (orchestration: fetch → encrypt → persist → status).

### Phase A2 — true native cold-offline (spec only; bigger change)

Make the Android app boot offline with **zero** prior online session. Options:
- **A2a. Local bundle + remote fallback** — ship the built web app inside the AAB (`webDir`), drop `server.url` (or keep as a runtime-checked fallback). Loses instant OTA; every web change needs an AAB release.
- **A2b. Capgo / live-updates OTA** — local-first bundle **with** OTA updates. Keeps freshness + gains offline. Adds a dependency + update channel.
  → **Recommend A2b** (preserves the remote-URL deploy advantage). Defer until A1 ships + measured.

---

## B. Local-transport MP (BT / WiFi-mesh)

**Feasibility: YES, Android-first, heavy.** No mid-game phone-home today; all game-critical logic is in-repo. But:

- **No Node in a Capacitor WebView** → the authoritative loop must run in the **host peer's WebView JS** (peers = thin clients), not "embed gameStateManager in Node".
- **The real work** = extract the authoritative game loop into a `shared/` module that runs in **both** Node (current server) and browser (host peer):
  - `gameStateManager`, `gameTimer`, word validation, scoring, bots, spam detector.
  - Node-coupled infra to replace: `backend/dictionary.ts` uses `fs.readFile` (Hebrew/JA/SV) → needs the bundled-asset path from A1; `isWordOnBoardAsync` uses `worker_threads` → Web Worker; Redis rate-limit → in-memory for LAN; Supabase/Redis persistence → no-op for LAN.
- **Transport** (the feasibility gate): cold-offline P2P with **no signaling server** → **Android Nearby Connections** (BT/BLE/WiFi-Direct) / iOS MultipeerConnectivity. **WebRTC is out** for cold-offline (needs a signaling round-trip). Build a thin Capacitor plugin bridging Nearby Connections ↔ JS, exposing a Socket.IO-shaped emit/on so the existing client event layer ports with minimal change.

### B — Council outcome (gemini-3 + grok-4.20, 2026-06-05): concrete recommended path

**Strong consensus: Option 1 wins.** Native P2P transport, authoritative-host model, thin clients.

- **Transport**: Android **Nearby Connections `P2P_STAR`** (host = advertiser/hub, N clients; uses BLE for discovery + BT/WiFi-Direct for data, auto-fallback) + iOS **MultipeerConnectivity**. Byte payloads ≤ 32KB — game state is < 2KB JSON, ample. Latency ~10–50ms WiFi-Direct / ~100–200ms BT — fine for 1Hz ticks + word submits.
- **Plugin**: prefer maintained off-the-shelf `@squareetlabs/capacitor-nearby-multipeer` (cross-platform, shared BLE UUIDs, P2P_STAR, `startAdvertising`/`startDiscovery`/`sendMessage` + `endpointFound`/`message`/`endpointLost` events — maps cleanly to an `emit/on` facade). Fall back to a thin custom plugin (~few hundred lines Kotlin/Swift) only if it's missing reliability/binary framing.
- **Architecture**: a `LocalP2PTransport` implementing the app's existing Socket.IO-shaped surface (`emit(type,payload)`, `on(type,handler)`, `getConnectedPlayers()`, `isHost()`), switched in at "Create/Join local game". Host runs the authoritative loop (timer, validation vs bundled dict, scoring, bots) in WebView JS — **reuses the pure in-repo logic almost verbatim**. Clients send `{t:'submitWord',...}`, receive versioned `{t:'state',version,...}` snapshots + heartbeats.
- **Host migration** (lossy link): detect `endpointLost`; deterministic leader election (lexicographically highest stable player ID); host periodically broadcasts a full serializable snapshot; new host re-inits the loop from last snapshot + clients resync. Single authoritative host is the **right v1** (no split-brain; CRDT/consensus = overkill for small-N discrete events).
- **WebRTC = rejected** (no signaling → QR SDP exchange per game = UX-toxic; mDNS unreliable in WebViews). **BLE GATT = discovery/bootstrap only**, not primary. **Raw WiFi-Direct server = high effort, low ROI** (no clean iOS equiv).
- **Gotchas**: Android needs **Google Play Services** (graceful "local MP unavailable" on de-Googled/enterprise devices); Android 12+ BT + NEARBY_WIFI + location permissions; iOS plist usage strings; **physical-device testing non-negotiable** (emulators poor for radio); battery/thermal on host for long sessions.
- **Effort**: prototype (advertise/discover/connect 2–4 Android devices, host echo + fake tick, validated word roundtrip) = **1–3 weeks** Android-first. Production (migration/resync, iOS parity, permissions/GMS UX, 6+ players, bots, i18n×5 + RTL, TDD, device lab) = **multi-week to ~2 months**.

**Follow-up implementation spec** to be written when this is greenlit, starting with: validate the plugin on real devices → `LocalP2PTransport` facade + minimal protocol → host "echo + fake tick" prototype (TDD, RED-first per project rules).

---

## Test plan (Phase A1, TDD)

- `swSource.test.ts`: SW source routes `/api/dictionary-words` via SWR (cached response served when network rejects); dict pattern checked before network-only; cache name bumped.
- `scoreQueue` / sync: `'blast'` + `'connections'` enqueue + flush; sync route accepts them.
- `DictionaryPrewarmer.test.tsx`: prewarm called synchronously on mount (not only in idle callback).

## Rollout

A1 → lint + test + build → commit (per-phase, ask first) → deploy web (Railway) → device-verify native offline relaunch. A2 + B = separate specs.
