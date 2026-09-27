# Performance audit — 2026-08-07

Every number below is measured, not inferred. Two reusable tools were written for it:

- `fe-next/scripts/perf-route-budget.mjs` — per-route client JS from an existing `.next`
  build (parses Next 16's `*_client-reference-manifest.js`; no rebuild, no analyzer dep).
- `fe-next/scripts/perf-chunk-modules.mjs` — breaks one built chunk into its modules,
  largest first, with a content fingerprint per module. `--dir` points it at a snapshot
  of shipped chunks (a concurrent `next build` in this repo wipes `.next` mid-read).

## Ground truth: production, `www.lexiclash.live`, 2026-08-07

| Page | JS on the wire (gzip) | JS requests | HTML (gzip) |
|---|---|---|---|
| `/en/legal` (static text) | **1096 kB** | **74** | 234 kB |
| `/en/about` | ~1090 kB | 73 | 234 kB |
| `/en/practice/classic` | ~1100 kB | 75 | 227 kB |

A page whose entire content is legal prose ships 1.1 MB of gzipped JavaScript.
The weight is essentially constant across routes, so it is the shared shell,
not any one feature.

## Real-user impact (PostHog `$web_vitals`, p75, last 14 days)

INP p75 — poor band (>500 ms): `/es/daily/word-hunt` 1296 · `/es/practice` 864 ·
`/he/about` 768 · `/en/quests` 736 · `/en/brain/drills/memory-hunt` 670 ·
`/es/tools/word-solver` 646 · `/en/daily/word-wheel` 530 · `/he/practice/wordHunt` 520 ·
`/en/profile` 512.

LCP p75 — poor band (>4000 ms): `/es/practice/classic` 6940 · `/il` 6696 ·
`/en/daily/word-wheel` 4576. Needs-improvement includes `/en` 2796, `/` 2832,
`/en/legal` 3396 — a static text page over the 2.5 s threshold is the shared-shell
tax showing up in the field.

`/en/daily/word-wheel` is in the poor band on **both** metrics.

## Findings, ranked by measured bytes on every route

### 1. Avatar SVG part library — 464 kB raw / 91 kB gz, every page

`static/chunks/65990-*.js` is **one module, 99.2% of the chunk**: the inline SVG
`<path>` data for every avatar part (`components/avatar/parts/*`, 8347 lines).
`AvatarRenderer.tsx` statically imports all nine part registries (`BASE_PARTS`,
`EYE_PARTS`, `HAIR_PARTS`, `ACCESSORY_PARTS`, …). Lookup is dynamic
(`HAIR_PARTS[config.hair]`), so webpack cannot tree-shake it — every part of every
category ships to every visitor. Confirmed as a real `<script async>` tag on
`/en/legal`, `/en/about`, `/en/practice/classic`.

### 2. Home-page entry chunk on unrelated routes — 205 kB raw / 75 kB gz

`app/[locale]/(home)/page-*.js` is a `<script async>` on `/en/legal`, `/en/about` and
`/en/practice/classic`. Its dominant module (61552) is 134 kB raw. Only
`app/[locale]/(home)/page.tsx` imports `../PageClient`, and neither `not-found.tsx`
nor `NotFoundClient.tsx` pulls it in, so the inclusion is not explained by the import
graph — cause still open.

### 3. `67917-*.js` — 484 kB raw / 146 kB gz, every page

309 modules, diffuse: Sentry browser SDK (`auto.ui.browser.metrics` 22 kB,
`before_send` 11 kB), Next router internals (23 kB), and the `@sentry/nextjs`
route manifest (28 kB raw, 215 entries — injected into the client bundle for
transaction parameterization; `routeManifestInjection` in `next.config.mjs` can
scope or disable it).

### 4. Locale layout — 175 kB raw / 58 kB gz of always-mounted promo widgets

`app/[locale]/layout-*.js`: a 45 kB module, plus a New Year countdown (10 kB),
comeback-bonus claim (7 kB), Android app promo (6 kB), PWA install prompt (5 kB).
All statically imported by `app/[locale]/layout.tsx`, so all mount on every route.

### 5. Inline RSC flight payload — 660 kB uncompressed per page

Of `/en/about`'s 740 kB HTML, 660 kB is inline `<script>` flight data (234 kB gzip).

## Deliberately not investigated

Settled by prior measured work; re-deriving them wastes time:
trie memory (36 MB, hypothesis refuted) · idle-heap "leak" (was the
`--max-old-space-size` cap, fixed) · client-bundled dictionaries (fixed `0acd6a92d`) ·
per-word fetch, Pixi exec cost, tutorial image, translation payload CPU (four
measured-and-rejected hypotheses in the low-end audit) · spread props breaking memo.

All `perf/*` branches are merged into master (0 commits ahead) — nothing stranded.

## Fixes

### 1 — Avatar SVG library — partial, and **not** the win it looked like

`components/Avatar.tsx` now reaches `AvatarRenderer` through `next/dynamic`
(`ssr: false`). Nothing is lost server-side: the HTML for `/en/about` and
`/en/legal` contains **zero** avatar markup either way (no `<ellipse>`, no
`data-testid="header-avatar"`), because the avatar only mounts after hydration.

**Measured result: no change in bytes on the wire.** `65990-*.js` (466 kB raw /
91 kB gz) is still a `<script async>` on `/en/legal` after the change, and the
route's client-reference-manifest still lists it. Next registers a
`next/dynamic` target as a client reference of the route and preloads its chunk
regardless of `ssr: false`, so deferring the *import* does not defer the
*download*. The chain is `layout → Header → HeaderMobileMenu → Avatar`, all
static; only the last hop is lazy now.

What it does buy: the module's ~466 kB of JSX factory calls are no longer
**executed** during hydration on pages that never render an avatar — they are
registered and only run when an avatar actually mounts. Given the low-end-device
audit found V8 compile/execute (not network) dominates on Android, that is worth
keeping, but it is a CPU win, not a byte win, and it is unverified in a browser.

Making `HeaderMobileMenu` itself dynamic would have the same shape and therefore
almost certainly the same non-result. Genuinely removing these bytes means not
importing the parts as modules at all — a larger change, left open.

Guarded by `components/__tests__/Avatar.bundleGraph.test.ts`, which walks the real
static import graph from `Avatar.tsx` and fails if anything in `components/avatar/parts/`
becomes statically reachable again.

### 3 — Sentry route manifest

`routeManifestInjection.exclude` in `next.config.mjs` drops `/admin` and `/blog`
(52 of the 215 entries). Keeping the rest preserves parameterised transaction
names for real user routes; disabling injection outright would report raw URLs.

### 4 — Layout widgets (~30 kB gz)

The install prompts, cookie banner, version checker, churn tracker and the New
Year countdown were already behind `next/dynamic`, but with the default
`ssr: true` — which keeps the module in the layout's own entry chunk so
hydration can match. `ssr: false` is what actually splits them out, and Next
rejects it inside a Server Component, so they moved to
`components/DeferredLayoutWidgets.tsx` (a client wrapper).
Guarded by `components/__tests__/DeferredLayoutWidgets.test.tsx`.

### 5 — Message catalogue out of the flight payload (~165 kB gz per page load)

The catalogue is no longer a prop crossing the server→client boundary. It ships
as a content-hashed `public/i18n/<lang>.<hash>.js` asset (written by
`scripts/build-i18n-assets.ts`, wired into `build:prebuild`) served
`immutable`, loaded by a classic `<script>` in `<head>` so
`globalThis.__LEXI_MESSAGES__` exists before hydration.

The `<head>` placement is not cosmetic: `t()` returns the raw key path
(`nav.howToPlay`) when the catalogue is missing, so a deferred/async load would
make React repaint every server-rendered string. SSR is unaffected —
`getCachedTranslation` still `require()`s the file on the server.

Measured serialisation overhead was only ~5 kB gz (525 kB as a JS string literal
vs 475 kB as raw JSON), so this is not about escaping — it is about the bytes
becoming **cacheable**. Same first-visit cost, zero on every later page load.

Guarded by `__tests__/loadTranslation.globalSeed.test.ts`.

## Verified result

`/en/legal`, production (before) vs a local `.next-perf` build (after), same
extraction script both times:

| | before | after |
|---|---|---|
| HTML | 693 kB | **152 kB** |
| inline `<script>` flight | 636 kB | **94 kB** |
| `<script src>` tags | 74 | 74 |
| `app/[locale]/layout-*.js` raw | 175 kB | **142 kB** |

Verification commands live in `fe-next/scripts/perf-verify-i18n-split.sh`, which
checks the two ways the catalogue split could have been a net regression:

1. **A locale context module leaking into the client bundle.** `getCachedTranslation`
   does `require(\`./${lang}.js\`)`; a template-literal require in a *client*
   webpack build can pull all six locales (~3.4 MB) in as a context module, and
   the `typeof window === 'undefined'` guard stops execution, not bundling.
   *Result: PASS* — `he`, `ja` and `ru` catalogues sit in three separate chunks
   (184 k / 121 k / 257 k characters respectively), none combined. Note that
   mere co-occurrence of two scripts in a chunk means nothing here: blog posts
   about Hebrew word games contain Hebrew, and every SEO page carries a
   per-locale title map. The check keys off volume.
2. **SSR losing the catalogue** (nothing seeds the server-side cache any more).
   A raw-key regression would be far worse than the bytes saved.
   *Result: PASS* — English text renders, zero raw key paths in the markup, and
   `/i18n/en.<hash>.js` appears exactly once.

## Status

| # | Finding | State |
|---|---|---|
| 1 | Avatar SVG library, 91 kB gz | partial — execution deferred, bytes unchanged |
| 2 | Home chunk on every route, 75 kB gz | open — cause not in the import graph |
| 3 | Sentry route manifest | fixed (small) |
| 4 | Layout widgets | fixed — layout chunk 175 → 142 kB raw |
| 5 | Catalogue in flight payload | **fixed — HTML 693 → 152 kB, and now cacheable** |

Not verified in a browser: hydration on a real device, and the CPU claim in #1.
The two unrelated `app/` test failures seen during this work belong to another
agent session editing this shared tree (`app/api/custom-puzzle/**` is modified
and was not touched here).
