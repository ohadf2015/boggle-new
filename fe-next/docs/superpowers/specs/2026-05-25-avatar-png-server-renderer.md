# Avatar PNG server-only renderer (follow-up)

**Status:** deferred / tracked
**Sentry:** JAVASCRIPT-NEXTJS-1HW ("Element type is invalid … got: undefined"), JAVASCRIPT-NEXTJS-1DV ("Attempted to call the default export … from the server, but it's on the client")
**User impact:** 0 (route degrades gracefully — 404 → mascot push fallback)

## Problem

`GET /api/avatar/png/[playerId]` renders a player's `avatar_config` to a PNG (for
FCM/Web-Push `imageUrl`) by `renderToStaticMarkup(<AvatarRendererSsr config />)`,
then `sharp`-ing the SVG. `AvatarRendererSsr` renders the shared avatar part
components (`BASE_PARTS`, `EYE_PARTS`, …), which call `useAvatarUid()` /
`useEyeColor()` — hooks backed by `createContext` in `AvatarUidContext.tsx` /
`AvatarEyeColorContext.tsx`.

Two hard constraints collide:

1. **Turbopack forbids `createContext` in the server graph.** Any module reachable
   from a route handler that depends on `createContext` must be `'use client'`,
   or the production build fails:
   > You're importing a module that depends on `createContext` into a React
   > Server Component module. This API is only available in Client Components.
2. **A `'use client'` module becomes a client *reference* in the prod server
   bundle.** So `<AvatarUidContext.Provider>` resolves to `undefined`
   (→ "Element type is invalid … got: undefined" = **1HW**) and the hooks throw
   when invoked server-side (→ **1DV**).

Net: the React-tree SSR approach cannot work while the parts depend on React
context. Dropping `'use client'` from the contexts (attempted in `1b232917f`,
reverted in `ef7ab0222`; re-attempted + reverted again 2026-05-25) breaks the
build via constraint #1.

## Interim mitigation (shipped 2026-05-25)

- Route already degrades gracefully (catch → 404; FCM drops `imageUrl`; push
  delivers with mascot fallback). No code change needed there.
- `sentry.server.config.ts` `ignoreErrors` now drops `/\[AVATAR_PNG\] render
  failed/i` — consistent with the ~15 other "expected/handled, degrades
  gracefully" entries (AI hints, Supabase transients). Stops 1HW/1DV from
  recurring as Sentry issues while keeping full pino prod-log visibility.
- `components/avatar/avatarSsrContextBoundary.test.tsx` locks the contract:
  the two context modules MUST keep `'use client'` (build-enforced), and the
  Sentry filter must stay present. Prevents a 3rd fix→revert churn.

## Real fix (when prioritized)

Make the SSR render path **context-free** so it never reaches `createContext`.
Two viable shapes:

- **Prop-thread (preferred):** give the avatar part components `uid` / `eyeColor`
  as props instead of reading them from context hooks. Both renderers pass them
  explicitly (`AvatarRenderer` already owns a `useId()`; `AvatarRendererSsr`
  passes `uid='ssr'` + `config.eyeColor`). Removes `createContext` entirely →
  delete the two context modules → SSR + client + build all green.
  Blast radius: ~17 `parts/*.tsx` signatures + 2 renderers + `PartPreview`.
  Risk: touches the live, heavily-used client avatar UI — needs the existing
  avatar render test suite as a regression net and visual spot-check.

- **Separate pure-SVG renderer:** build SVG strings directly from `avatar_config`
  with no React component tree (what `ef7ab0222`'s revert note proposed).
  Larger; duplicates part geometry. Only worth it if prop-threading proves
  infeasible.

## Acceptance

- `npm run build` passes.
- Hitting `/api/avatar/png/<id>` for a player with a custom `avatar_config`
  returns a 200 PNG of their actual avatar (not a 404).
- Remove the `\[AVATAR_PNG\] render failed` `ignoreErrors` entry + flip the
  boundary test to assert the contexts are gone.
