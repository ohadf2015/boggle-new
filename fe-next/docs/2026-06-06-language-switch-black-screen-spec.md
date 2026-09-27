# Spec: "Black screen when changing language (esp. from Hebrew)"

**Date:** 2026-06-06
**Status:** investigation complete → hardening fix

## Report
Hebrew user taps the language switcher to change language → black screen.

## Investigation (what it is NOT)
Reproduced exhaustively in Chromium (dev + prod build, desktop + 390×844 mobile,
landing + nested mobile-menu + in-game `/he/daily`), rapid-polling body
`pointer-events` / `aria-hidden` / overlay state at 60–100 ms. **Every happy-path
switch resolves correctly** (`/he`→`/en`, `dir` rtl→ltr, content present,
`pointer-events:auto`). Therefore the cause is **not**:
- the Radix Select off-screen-popper / RTL placement bug (the `dir={dir}` fix
  `355b21b06`, 2026-05-25, is deployed and works — verified popper on-screen on RTL mobile);
- a modal body-lock / aria-hide cleanup race (teardown is clean even nested
  Select-in-Sheet on mobile);
- the mount-reconciliation `router.replace` bounce (`EssentialProviders` never
  remounts on soft-nav — no `key={locale}`);
- an RTL-specific render throw (no such Sentry exception exists).

"In Hebrew" is **sampling bias**: Hebrew users are the ones who actually use the
switcher; English-default users rarely touch it. Treat as a *language-change
navigation* bug, not an RTL bug.

## Root-cause CLASS
The language switch is the one action that forces a **cross-`[locale]` route
refetch** (new RSC payload + new route/translation/client chunks) — heavier and
more failure-prone than any in-app nav. This repo deploys constantly (nightly
auto-commits, daemon pushes), so an **open client holds stale chunk hashes**; a
newer deploy deletes them; the next language switch fetches a 404'd chunk.

- Outright RSC/route-chunk failure → Next.js **hard-navigates** (`window.location`)
  → full reload fetches fresh chunks → **self-heals** (verified: offline switch
  fell back to a hard nav). Not the black screen.
- A **client-component `ChunkLoadError` during render** of the new-locale page is
  caught by the nearest `error.tsx`. For `/daily`, `/singleplayer`, `/brain`
  (no segment boundary) that is `app/[locale]/error.tsx`.
- **`app/[locale]/error.tsx`'s fallback renders `InteractiveMascot`** — a 764-line
  `'use client'` component (framer-motion, device-perf hook, SilentVideo, mascot
  data). React **cannot re-catch an error thrown inside an error boundary's own
  fallback**. If the mascot's chunk is *also* stale, the fallback throws →
  bubbles to `global-error.tsx`; if *its* `lucide-react` chunk is also stale →
  **blank tree = black navy `<body>`**.
- Side effect: `error.tsx` reports to Sentry from a `useEffect` that only runs if
  the fallback renders → a crashing fallback is **both** the black screen **and**
  the reason Sentry shows no exception.

## Fix (low-risk, root-cause-class)
An error boundary's fallback must be **self-contained** — it renders precisely
when chunks are broken, so it must not depend on a heavy/lazy chunk.

1. `app/[locale]/error.tsx`: replace `InteractiveMascot` with a **static,
   zero-extra-chunk** visual (inline emoji, no framer-motion / next/image / video).
   Keep all existing chunk-error auto-reload + `captureError` logic. → guarantees
   the fallback always renders the recoverable "refresh to update" card instead of
   crashing to black; also restores telemetry.
2. `app/[locale]/error.tsx` + `app/global-error.tsx`: add **from-locale + path**
   tags to `captureError` context so the next real occurrence is diagnosable.

Out of scope: adding `loading.tsx` to game segments (old-page-held behavior is
acceptable and interactive), native-WebView reload behavior (untestable here).

## Verification
- TDD: `error.tsx` renders its fallback **without importing framer-motion /
  InteractiveMascot**, and renders successfully for both a chunk error and a
  generic error, in RTL (`he`) and LTR locales.
- `npm run lint && test (changed) && build`.
- Manual: existing happy-path switch unaffected (already verified working).
