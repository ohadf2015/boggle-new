# MP Classic Mode — Frontend Performance Investigation

**Date:** 2026-05-21
**Scope:** Multiplayer "classic" word-grid mode, mobile-first
**Method:** PostHog `$web_vitals` (real field data) + static hot-path analysis

---

## TL;DR

Multiplayer classic is **the worst game mode for mobile interaction latency (INP)** by a
wide margin. The grid hot paths are already heavily optimized — the win is **not** another
memo. We do **not** yet know which interaction causes the spike, so the highest-leverage
move is to **ship INP attribution instrumentation**, plus one zero-risk render-waste fix
that holds regardless of attribution.

---

## The data (PostHog `$web_vitals`, mobile, last 14d)

p75 / p90 INP by route family (Google: >200ms = "poor"):

| route        | samples | INP p75 | INP p90 |
|--------------|--------:|--------:|--------:|
| **multiplayer** | 41   | **312ms** | **488ms** |
| blast        | 30      | 244     | 312     |
| other        | 109     | 200     | 248     |
| daily        | 15      | 164     | 176     |
| word-craft   | 9       | 136     | 194     |

MP-only INP distribution (mobile, 14d) — **not** a couple of outliers:

- samples 41 · **persons 17 · sessions 30**
- p50 **200** · p75 312 · p90 488 · p95 704 · p99 832

The whole curve is shifted high; the **median** interaction already sits at the "poor"
threshold. This is a genuine, broad MP-mobile problem, not tail noise.

> LCP p75 on MP ≈ 2320ms (borderline "needs improvement") — secondary, not the focus here.

---

## What is NOT the problem (verified in code)

The grid interaction path is already aggressively optimized — do not "optimize" it again:

- **Per-pointermove drag is RAF-batched + ref-based.** Native `touchmove` (60–120Hz) writes
  only a ref; `processTouchMove` runs at most once per frame. Geometry is cached for 100ms;
  no per-move `getBoundingClientRect`. Adjacency check is O(1). (`components/grid/useGridInteraction.ts`)
- **`GridCell` memo + `selectedCellsLength` clamping** (`GridComponent.tsx:560`) stops
  unselected cells re-rendering as the selection grows.
- **`GridConnectorOverlay`** (the SVG path) is an isolated memo; one `<polyline>` attribute
  swap, no per-cell work, no layout reads per move.
- **`clearAllDragClasses`** already iterates the cached cell-node map (`useGridInteraction.ts:170`),
  `querySelectorAll` only as fallback. Already optimal.
- **Drag-END commit for a *player* is light (~4–18ms):** `setSelectedCells`, cached-map class
  clear, optional `setFadingCells`, haptic. **Players do NOT optimistically add to `foundWords`**
  — the word list only reconciles later, async, on the server `wordAccepted` event. So the
  word list is **not** on the interaction critical path for players.
- **Socket bursts are already tamed:** `useFrozenWhileSelecting` freezes leaderboard + word
  list during drag; `ComboDisplayConnected` / `OpponentWordFeedConnected` own their own
  high-frequency subscriptions so the parent doesn't re-render; `usePlayerGameEvents` batches
  ~15 store writes into one `setState`.

**Conclusion:** the 312/488ms INP is almost certainly dominated by **input delay** (the main
thread busy with continuous MP work — socket events, the combo RAF, opponent feed — when the
user taps) and/or a **specific heavy interaction we haven't profiled** (e.g. a modal mount or
a first-tap library init). Both are invisible to value-only `$web_vitals`. We must attribute
before doing a broad refactor.

---

## Actions

### 1. (Shipped here) INP attribution instrumentation — highest leverage

Add the `web-vitals/attribution` build and capture a custom PostHog event on each finalized
INP. Posthog's bundled web-vitals only sends the *value*; the attribution build adds the
**target selector** and the **inputDelay / processingDuration / presentationDelay** split.

Event `web_vitals_inp_attribution` with: `inp_value`, `inp_rating`, `interaction_target`,
`interaction_type`, `input_delay`, `processing_duration`, `presentation_delay`, `load_state`,
`longest_script_url`, `longest_script_duration`, `route_family`, `pathname`.

The `onINP` listener is **global** (mounted once in `PostHogProvider`), so it captures every
mode, not just MP. `route_family` (see `classifyRoute` in `utils/inpAttribution.ts`) buckets
**all playable modes** — multiplayer, blast, word-hunt, wheel-rush, word-craft, word-tower,
word-vault, word-forge, word-of-the-day, shiritori, practice, adventure, anagram, brain,
connections, daily, party, challenge, singleplayer — so INP is sliceable per mode. It matches
the *route segment* (not a substring), so SEO slugs like `brain-training-word-games` fall to
`other`. Caveat: MP variants (classic/blast/wheel-rush) served under `/multiplayer?mode=…`
share the `/multiplayer` path and bucket together — web-vitals carries no query string.

Cross-mode comparison once data lands:
```sql
SELECT properties.route_family AS mode,
       round(quantile(0.75)(toFloat(properties.inp_value)),0) AS inp_p75,
       round(avg(toFloat(properties.input_delay)),0) AS avg_input_delay,
       round(avg(toFloat(properties.processing_duration)),0) AS avg_processing,
       count() AS n
FROM events
WHERE event = 'web_vitals_inp_attribution'
  AND timestamp >= now() - INTERVAL 7 DAY AND properties.$device_type = 'Mobile'
GROUP BY mode ORDER BY inp_p75 DESC
```

After 2–3 days of data, this answers definitively:
- High **`input_delay`** during MP → main-thread contention. Fix = cut continuous work
  (e.g. throttle the combo RAF further when no combo is active; defer non-visual socket work).
- High **`processing_duration`** on a specific `interaction_target` → a heavy handler. Fix = that handler.
- A modal/CTA dominating `interaction_target` → lazy-mount / pre-warm that component.

Query after data lands:
```sql
SELECT interaction_target, interaction_type,
       round(quantile(0.75)(toFloat(properties.inp_value)),0) AS inp_p75,
       round(avg(toFloat(properties.input_delay)),0) AS avg_input_delay,
       round(avg(toFloat(properties.processing_duration)),0) AS avg_processing,
       count() AS n
FROM events
WHERE event = 'web_vitals_inp_attribution'
  AND timestamp >= now() - INTERVAL 7 DAY
  AND properties.$device_type = 'Mobile'
  AND properties.route_family = 'multiplayer'
GROUP BY interaction_target, interaction_type ORDER BY n DESC
```

### 2. (Shipped here) Compact found-words list windowing — true regardless

Mobile MP renders the compact `GameWordList` (`PortraitLayout.tsx:671`, `block lg:hidden`)
into a 50px `overflow-hidden` box but maps **every** found word. A 60-word game mounts 60
animated chips, ~5 visible, all reconciled by Framer Motion's `AnimatePresence` on **every**
server `wordAccepted` — competing with user interactions on the main thread. Window the
compact view to the newest ~12; keep the count badge showing the true total.

### 3. (Deferred — do after attribution lands) Candidate fixes, NOT done speculatively

- Throttle the combo RAF when combo == 0 (continuous main-thread wake during play).
- Lazy-mount any heavy mid-game modal flagged by `interaction_target`.
- Re-evaluate full (desktop) word-list virtualization only if desktop INP shows up.

Explicitly **not** doing now: blanket `startTransition`, socket-handler refactors (already
batched), component-tree restructuring. No evidence yet; advisor-flagged as week-burners.
