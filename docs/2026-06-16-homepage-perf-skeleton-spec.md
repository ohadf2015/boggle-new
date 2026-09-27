# Homepage Performance + Skeleton Fix — Spec (2026-06-16)

## Audit summary (BE + FE)

Full scout sweep across backend (Express/Socket.IO/Supabase/Redis) and frontend
(Next 16 App Router, React Compiler on). **The codebase is already well-optimized**;
findings below separate real root causes from non-issues.

### Backend — HEALTHY, no quick win
- Express `compression` IS active (level 6 prod, br/gzip) in `server/middleware.ts:346`.
  `next.config compress:false` is deliberate (lets Express compress uniformly). NOT a bug.
- `ugcBoards.ts` creator profiles: **already batched** via `.in('id', creatorIds)`
  (`backend/routes/ugcBoards.ts:564-568`). Scout's "HIGH N+1" guess was WRONG.
- Redis pooled, rate-limited, TTLs set, socket Maps purged every 5 min. Sound.
- `auth.getUser()` ~88 sites = real network round-trips, but a separate 88-site
  refactor (see memory `auth-getuser-refactor-playbook`), NOT a session-sized win.
- `wordHuntManager.readFileSync` = startup-only fallback; hint-cache O(n) = minor.
- **Verdict:** no bounded backend quick win exists; debt items are large or cold-path.

### Frontend — one real root cause on the homepage
- React Compiler ON, contexts `useMemo`'d, fonts locale-split, lucide/radix tree-shaken.
- Eager `framer-motion`/`gsap`/`pixi.js` bundling — real but NOT on the homepage critical
  path; game-mode code-splitting is a larger follow-up.
- Dead deps present (`three`, `@react-three/*`, `tone`, `@gsap/react`) — install-size only.

## ROOT CAUSE (the homepage "skeleton" problem)

`PageClient` is `'use client'` but imports `LandingView` **synchronously** → Next still
**server-renders** `LandingView`. On the server `window` is undefined →
`hadSession=false` → `cardsReady=true` → **SSR ships the real mode cards**.

On the client, `const [hadSession] = useState(() => hasSupabaseSession())` returns
`true` for a returning user → `cardsReady=false` → LandingView **replaces the already-
painted real cards with `LandingCardsSkeleton`**, then swaps back when auth resolves.

Result for returning authed users — a 4-phase flash + a React hydration mismatch:
`route loading.tsx skeleton → real cards (SSR) → client skeleton → real cards`.

The gate's comment reasons correctly *for a CSR app* ("don't paint guest cards then
overwrite") — but the tree is SSR'd, so the gate does not prevent the guest-default
paint (SSR already did it); it only adds a skeleton *on top* on the client. The gate
**fights the framework**.

`LandingChallengeCards` already self-manages auth via `useAuth().canSeeInWorkModes`
(admin cards are purely additive) and an internal `mounted` gate for hydration-sensitive
personalization. So the parent `cardsReady` skeleton gate is **redundant and harmful**.
All gated props (`playerAllTimeBest`, `cardOrder`, `dailyChallengeStats`, `isAdmin`)
are undefined-safe (verified).

A secondary, smaller CLS: route `loading.tsx` omits a placeholder for
`LandingSeasonHero`, which renders FIRST in `LandingView` (`:207`) → vertical offset
when real content replaces the skeleton.

## Changes

### Phase 1 — kill the hydration downgrade (the flash) — `LandingView.tsx`
- Remove the `hadSession`/`cardsReady` skeleton gate. Always render
  `LandingChallengeCards` (both control + cubes variant — the component reads the
  cubes experiment internally). SSR cards stay painted; personalization fills in place.
- Drop now-unused imports: `LandingCardsSkeleton`, `LandingCubesSkeleton`,
  `hasSupabaseSession` (keep the skeleton component files + their tests — now unused,
  flagged as removable follow-up).

### Phase 2 — tighten the route skeleton — `loading.tsx` + `ModeCardSkeleton.tsx`
- Make `ModeCardSkeleton` server-safe: remove the dead `useLanguage()`/`isRTL`
  (`isRTL` is computed but never used; clamp styling is symmetric) and the `'use client'`.
- Add a slim `LandingSeasonHero` placeholder strip at the top of `loading.tsx` so the
  skeleton's section order matches the real page (season strip → hero → social → cards).
  Height-modest (~50px) so the off-season/CrazyGames null case is a minor one-time shift.

## Tests (TDD)
- `LandingView.test.tsx`: NEW — returning-authed-loading state
  (`authLoading=true`, `profile=null`, `hasSupabaseSession=true`) renders real cards and
  NO `landing-cards-skeleton`. RED before Phase 1, GREEN after.
- `ModeCardSkeleton.test.tsx`: NEW — renders without a `LanguageProvider` and does not
  throw (proves server-safe). Existing 13 tests must stay green.
- `loading-layout.test.tsx`: NEW — asserts a season-strip placeholder above the hero.
  Existing layout assertions must stay green.

## Verification
- `npm run lint`, `npm run test` (touched files), `npm run build`.
- Browser (`npm run dev`, PORT free): seed a Supabase session in localStorage, throttle
  network, DevTools Rendering → Paint-flashing — confirm cards do NOT flash to skeleton.
- Guest path: cards paint immediately, no regression.

## Out of scope (reported, not done)
Game-mode code-splitting of pixi/gsap/framer; dead-dep removal; auth.getUser local-JWT
refactor. All large or low-impact; listed as prioritized recommendations.
