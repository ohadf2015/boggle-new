# Low-end device performance audit — 2026-07-25

Goal: make all games smooth on low-end devices. This is what the measurements
actually say, what was fixed, and what is left — ranked by measured impact.

Everything below is measured, not inferred. Where a hypothesis was tested and
turned out to be wrong, that is recorded too.

---

## 1. Field data (PostHog `$web_vitals`, last 30 days)

| Device | n | INP p75 | LCP p75 |
|---|---|---|---|
| **Mobile Android** | 246 | **476 ms** | **3938 ms** |
| Tablet Android | 49 | 376 ms | 2306 ms |
| Desktop Windows | 165 | 296 ms | 5892 ms |
| Mobile iOS | 92 | 218 ms | 1579 ms |
| Desktop Mac | 49 | 160 ms | 478 ms |

Google's "good" bar is INP ≤ 200 ms and LCP ≤ 2500 ms. Android misses both.
Android INP is ~2.2× iOS on the same code — a CPU/tier problem, not a code-path problem.

Per-route INP only has enough samples to trust on two routes:

| Route | n | INP p75 |
|---|---|---|
| `/en/multiplayer` | 130 | 262 ms |
| `/es/multiplayer` | 128 | 428 ms |

**Do not weight the other per-route numbers.** `/ru/daily/word-hunt` shows 6072 ms
but n=2; `/en/practice/wordHunt` shows 888 ms but n=5. Those are noise, and an
earlier draft of this audit wrongly treated them as signal.

## 2. Synthetic cold load — 6× CPU throttle, 412×915 viewport

Route: `https://www.lexiclash.live/en/practice/wordHunt`

| Metric | Value |
|---|---|
| FCP | 584 ms |
| **LCP** | **6956 ms** |
| **Total Blocking Time** | **1220 ms** |
| Longest single task | 645–708 ms |
| Long tasks > 50 ms | 12 |
| **Script requests** | **113** |
| **JS transferred (gzip)** | **1735 KB** |
| Total transferred | 3080 KB |
| HTML document | 691 KB raw / 218 KB gzip |

CPU profile attribution of the non-idle time:

| Cost | Est. time | What it is |
|---|---|---|
| `(program)` | **3275 ms** | V8 parsing/compiling the JS |
| `u @ webpack-*.js` | **1113 ms** | webpack module registry resolving 113 chunks |
| route page chunk | 912 ms | route code |

**Conclusion: the bottleneck is JS volume and chunk count.** Pixi, particles and
effects do not appear in the profile at all.

---

## 3. Fixed in this pass

### 3.1 Device tier never re-measured after the first guess — `lib/perf/runtimeTier.ts` (new)

`useDevicePerformance` classified the device **once**, from static hints, via
`useMemo(…, [])`. Those hints are systematically wrong for the devices that matter:

- a budget MediaTek phone reports 8 cores + 8 GB and classifies **high-end**;
- Safari/iOS never exposes `deviceMemory`, and the code defaults it to `4`, so the
  `memory <= 2` rule can never fire on any iPhone;
- the UA keyword branch only matches `android [2345]`, which no shipping phone reports.

Added a frame watcher that measures frames actually rendered and downgrades the tier
when the device demonstrably cannot hold the budget. It starts 3 s after mount (so it
measures steady state, not hydration jank), requires **20 consecutive** slow frames
(so a GC pause cannot condemn a good device), ignores hidden-tab stalls, and
self-terminates once it reaches a verdict — one rAF doing two subtractions, then gone.

This lands once and reaches all **75** `useDevicePerformance` consumers.

Tests: `lib/perf/__tests__/runtimeTier.test.ts` (10), `hooks/__tests__/useDevicePerformance.test.tsx` (4).

### 3.2 A fullscreen WebGL context on every route, with no low-end guard — `components/animations/SharedFxMount.tsx`

`SharedFxMount` is mounted at app root (`essential-providers.tsx:244`) on **every
route**. Every guard (`isNative`, `prefersReducedMotion`, `maxParticles <= 0`,
`fxSuppressed`) lived *inside* the `useEffect`, and the module statically imported
`SharedFxApp`. So a low-end phone loaded the FX module and spun up a fullscreen
WebGL canvas for decorative coin sparkles before anything decided it shouldn't.

Changes:
- `isLowEnd` is now a skip condition — low-end devices never initialize the layer;
- `SharedFxApp` moved behind a dynamic `import()` **after** the guards;
- because the runtime watcher can flip `isLowEnd` mid-session, the effect re-runs and
  **tears the GPU layer down** on a device that starts strong and degrades.

Tests: `components/animations/__tests__/SharedFxMount.test.tsx` — 11 passing (3 new).

Verification: lint 0, `tsc --noEmit` clean on touched files, 186/186 tests green
across `components/animations`, `lib/pixiFx`, `lib/perf`, and the device hooks.

---

## 4. Hypotheses that were tested and rejected

Recorded so nobody re-runs them.

**"Per-word `fetch('/api/dictionary/check')` causes the high INP."**
Rejected. `useSinglePlayerCore.ts:319-333` updates state optimistically *before* the
fetch, so the next paint — where INP closes — does not wait for the network. The round
trip is still worth removing for **game feel** (the accept sound, score and combo all
wait on it, and `daily/*` already uses the local `useDictionaryCache` path while
single-player does not — a Class-3 asymmetry), but it is not an INP fix.

**"The `/ru` routes are slowest because Russia is far from the server."**
Rejected as stated — n=2. Note however that `ru.js` is the largest catalog (890 KB vs
596 KB for `en`), so a real mechanism exists; it simply is not yet evidenced.

**"Pixi is shipped and executed on non-Pixi routes."**
Partly rejected. Chunk `82055` (254 KB gzip) *is* genuine Pixi and *is* downloaded on
`practice/wordHunt`, but it is absent from the initial HTML and never appears in the CPU
profile — it arrives via Next.js route prefetch and is never executed. Real wasted
bandwidth on mobile data; **not** a CPU cost. (`SharedFxApp` itself was already correct:
it imports Pixi as `import type`, which is erased at runtime.)

**"The LCP element is a lazily-loaded tutorial image."**
Rejected. `PracticeTutorialArt` already sets `priority`, and the image finished
downloading at ~2.6 s — but LCP paints at 6.9 s. The image was ready and the main thread
was too busy to commit the render. LCP here is a symptom of JS execution, not of images.

**"The full translation catalog in the RSC payload is a major CPU cost."**
Substantially rejected. The catalog *is* fully shipped (see §5.1 — confirmed, 50/50
sampled keys present), but its measured deserialization cost at 6× throttle is only
~62 ms (16 ms unescape + 46 ms JSON.parse). It is a **bandwidth** problem, not a CPU one.

---

## 5. Remaining work, ranked by measured impact

### 5.1 [HIGHEST] Cut initial JS: 1735 KB across 113 requests

This is the measured bottleneck — 3275 ms of V8 compile plus 1113 ms of webpack module
resolution at 6× throttle. Two compounding causes:

- **[the main lever] 131 `next/dynamic` call sites across 75 files.** Each is its own
  chunk, its own registry entry, its own compile unit. Past a point, code-splitting
  *hurts* low-end devices: 86 `<script src>` tags appear in the initial HTML. Audit which
  of those splits earn their overhead — many wrap components small enough that the chunk
  costs more than it defers — and group the rest with `webpackChunkName` magic comments.
- **[secondary] No `splitChunks` tuning.** `next.config.mjs` has a `webpack()` hook but
  never sets `optimization.splitChunks`, and the waterfall contains 1 KB, 2 KB, 4 KB and
  5 KB chunks.
  **Be aware:** raising `splitChunks.minSize` will *not* merge the `next/dynamic` chunks.
  webpack always emits a chunk per dynamic-import boundary regardless of `minSize`;
  `minSize` only governs how *shared* modules get split out. Expect a modest win here at
  best — do not treat it as the fix for the 113-request count.

Needs a build-and-measure loop; re-run `prof.js` against the same route to confirm.

### 5.2 [HIGH] Ship only the translation namespaces a route uses

`app/[locale]/layout.tsx:267` loads the whole locale catalog and passes it to both
`NextIntlClientProvider` and `LanguageProvider`, serializing it into the RSC flight
payload on **every route**. Confirmed empirically: **50 of 50** randomly sampled `en.js`
keys are present in the shipped HTML for `practice/wordHunt`, including
`cosmicShardDesc`, `screenshotProtection` and `approve` (admin-only).

That is 537 KB of the 691 KB document — 78%. Per-language splitting already exists
(`translations/loadTranslation.ts`); per-namespace splitting does not.

Impact is bandwidth on the critical path (~170 KB gzip before anything else can start;
~0.9 s on a 1.5 Mbps link), plus memory. **Not** a big CPU win — see §4. Worth doing,
but it is a careful change across 6 locales with a translation-first rule, so it needs
its own pass.

### 5.3 [MEDIUM] `/api/analytics/guest-session` takes 5.0 s

Measured 3705 ms → 8706 ms on a cold load. It does not block paint, but it is a
5-second server call fired for every guest. Worth a look on its own merits.

### 5.4 [MEDIUM] Route prefetch pulls a 254 KB Pixi chunk onto non-Pixi routes

See §4. Consider `prefetch={false}` on cross-game links, or narrowing what the Pixi-heavy
routes pull in, so mobile users don't spend 254 KB of data on a chunk they never execute.

### 5.5 [LOW] Micro-cleanups in the grid submit path

`useSinglePlayerCore.ts:292` rebuilds an array over all found words on every submit, and
`validateWordLocally`'s array branch calls `normalizeWord()` once per found word;
`foundWords` sits in the `useCallback` deps at line 392, so the handler is recreated per
accepted word. Real but sub-millisecond — listed for completeness, not as a perf fix.

Note if fixing: the existing `foundWordsSetRef` holds `toLowerCase().trim()` words while
`validateWordLocally` compares with `normalizeWord(…, language)`. Passing the existing set
directly would **regress Hebrew** final-letter duplicate detection; a separate
normalized set is required.

### 5.6 [SEPARATE] `lexiclash.com` does not resolve

`https://lexiclash.com/en` times out (curl code 000) while `www.lexiclash.live` returns 200.
Unrelated to performance, but found during this audit and worth checking.

---

## Reproducing the measurements

Scripts used (CDP over the agent-browser Chrome instance):
`prof.js` (load metrics), `lcp.js` (LCP element + waterfall), `cpu.js` (sampling profile),
`parsecost.js` (payload deserialization cost).

```
agent-browser set viewport 412 915
agent-browser open "https://www.lexiclash.live/en/practice/wordHunt"
agent-browser get cdp-url          # take the port
node prof.js <port> "https://www.lexiclash.live/en/practice/wordHunt" 6
```

Baseline numbers to compare against are in §2. **Any claim that INP or LCP improved must
be backed by re-running these against a deploy** — the fixes above are verified by tests
and by mechanism, not yet by field data.
