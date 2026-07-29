# Offline "Flight Mode" — widen playable solo modes + discoverability

**Date:** 2026-06-06
**Goal:** A player can go on a flight and actually play *all possible* (solo) game modes and have fun — not just blast/connections/daily.

## Honest scope: the three offline layers

Offline has three independent layers that are routinely conflated:

- **L1 — Capacitor native shell (cold-start).** `capacitor.config.ts` points `server.url` at the
  remote `https://www.lexiclash.live`. A native app cold-launched in airplane mode loads
  `error.html` and cannot play **at all**. This is the literal "open the app on a plane after
  the OS evicted it" path. **Out of scope this PR** — fixing it requires shipping the web bundle
  *inside* the app (Capgo OTA / local bundle), which can't be done or verified without a device +
  AAB. Tracked as the deferred A2 work. **Stated plainly so we don't fake the acceptance test.**
- **L2 — Service-worker precache (warm web / installed PWA).** `app/sw.js/route.ts` serves a SW
  that precaches locale homes + offline-mode shells + dictionary (stale-while-revalidate). An
  **installed PWA survives offline cold-start** after one online session. ← This PR's "fly with it
  today" path.
- **L3 — `NetworkStatusHandler` whitelist (native in-app nav while offline).** When a *warm* native
  app goes offline, only whitelisted routes keep rendering; everything else shows `OfflineFallback`.

This PR widens **L2 + L3** (both fed by the single `offlineCapableModes` source) and makes the
offline surface discoverable. L1 remains a documented gap.

## What works offline today

`OFFLINE_CAPABLE_MODES = ['blast', 'connections', 'daily']` — the only modes the gate allows, the
SW precaches, and `OfflineFallback` offers. Many other **solo** modes already run fully client-side
but are *blocked by the gate* or not offered.

## Modes to add (each with its precondition handled)

| Mode | Status today | Precondition fix in this PR |
|---|---|---|
| **adventure** | Already offline-safe: cached→default progression, bundled levels (`lib/adventure`), offline completion queue wired (`offlineCompletionQueue.ts`). | None — add to gate/precache/launcher. |
| **singleplayer** (classic solo boggle) | Plays client-side via `?practice=1` (bare `/singleplayer` 308-redirects to MP). `sp` score-queue mode exists. | Gate by segment; launcher/precache entry uses `?practice=1`. |
| **brain** | 5 drills are bundled + client-side, but the **hub** renders a blocking error screen when the Supabase score fetch fails (offline). | Graceful-degrade: render the drill list even when the score fetch fails/offline. |
| **word-craft** | EN/SV dicts bundled; HE/ES/JA fetch `/api/word-craft/wordlist` and return an **empty Set** on failure (every word rejected offline). | localStorage dict cache: persist on first successful load, return cache on fetch failure / offline. |

MP, party, custom UGC, crossword (admin), connections/community stay **online-only** by nature
(live opponents / server content) — explicitly out of scope.

## Architecture change

`lib/offline/offlineCapableModes.ts` becomes **metadata-driven** so the gate, SW precache list, and
`OfflineFallback` launcher all derive from one source (no drift, advisor's trap #4):

```ts
interface OfflineMode {
  segment: string;                 // first route segment, used by isOfflineCapable()
  labelKey: string;                // i18n key for the launcher button
  entry: (locale: string) => string; // full href to open the mode (may include ?query)
}
```

Backward-compatible exports retained: `OFFLINE_CAPABLE_MODES` (segments), `isOfflineCapable()`,
`offlineCapableRoutes()` (now returns full entry hrefs, incl. `?practice=1`).

## Dictionary availability (the load-bearing fix)

A precached *shell* renders a mode offline, but word modes (blast / classic /
daily / adventure / word-hunt) reject every word unless `/api/dictionary-words`
is in the SW cache. The worker→IndexedDB load path does **not** populate SW Cache
Storage, and a warm fetch fired at mount on the first visit races *ahead* of SW
control (a freshly-installed SW doesn't control its registering page until it
activates + `clients.claim()`), so it skips the cache.

**Fix:** `lib/offline/warmDictionary.ts` (`warmDictionaryCache`) does a guarded,
online-only, once-per-locale main-thread `fetch` of the dictionary URL — which
the SW intercepts + SWR-caches. `DictionaryPrewarmer` runs it on mount AND on
`serviceWorker.ready` / `controllerchange`, so it lands once the SW is actually
intercepting. **Verified live:** after a single online home visit, the EN dict
(2.8 MB) is SW-cached and readable offline.

## Done-checklist (acceptance, per added mode)

1. `isOfflineCapable('/{locale}/{route}')` → `true` (gate lets warm native render it).
2. Its entry href is in the SW precache list (PWA cold-start has a cached shell).
3. `OfflineFallback` lists it (discoverable when walled off).
4. Plays to completion offline; score is queued (`enqueueScore`) where applicable.
5. Dictionary present for its locales (EN/SV always; word-craft HE/ES/JA after one online load).

## Loose ends fixed

- ~~Remove dead `DailyOfflineFallback`~~ — verified NOT dead: wired at `DailyChallenge.tsx:606`
  for the `offline-miss` phase (puzzle unobtainable offline). Left in place.
- Landing mode cards become **offline-aware**: network-only modes (arena/MP, party) show a
  "needs internet" badge / disabled state when `navigator.onLine === false`; offline-capable modes
  stay fully active.

## Out of scope (documented, not done)

- L1 native cold-start (Capgo OTA / local bundle) — needs device + AAB.
- Award **dispatch** (coins/XP credit) for sp/brain on sync — pre-existing Phase-1c word-reval path;
  scores queue + validate, reward-grant for these modes tracked separately.
- Mesh/local MP (separate deferred track).

## Test plan (strict TDD)

Pure-logic units (`offlineCapableModes`, dict cache, brain-hub degrade selector, landing
offline-awareness) are TDD'd first. Then `npm run lint && npm run test && npm run build`. PWA offline
path spot-verified via dev server + browser offline emulation where feasible.
