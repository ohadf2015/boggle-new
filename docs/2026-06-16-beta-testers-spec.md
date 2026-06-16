# Beta Testers + Admin Users-List UX — Spec (2026-06-16)

## Goal
1. Admin can mark any player a **beta tester** from the players list (mirror of `blast_access`).
2. **Beta testers see every in-work mode** currently gated behind `is_admin` — now and for future modes.
3. Improve the admin players-list UI/UX (badges, tidy action group, beta filter).

## Durable chokepoint ("for the future as well")
A single predicate, routed through every gate layer, so a future dev adding an
in-work mode never has to remember "also allow beta":

```
canAccessInWorkMode(profile) = !!(profile.is_admin || profile.is_beta_tester)
```

- **Pure shared fn**: `lib/auth/inWorkModeAccess.ts` (used by client compute + backend).
- **Client**: `useAuth().canSeeInWorkModes` (computed `isAdmin || isBetaTester`).
- **Server component**: `canSeeInWorkModesSession()` (mirror of `isAdminSession()`).
- **Server socket**: `gameStartHandler` word-tower gate.

## Gate inventory (all flip `is_admin` → in-work predicate)
Client display / route guards:
- `components/landing/LandingChallengeCards.tsx:200-213` (wordTower, wordForge, wordAlchemy, shiritori, sealedBid, crossword)
- `components/daily/DailyChallengeLanding.tsx:47` (+ relabel "admin" card → in-work/beta)
- `app/[locale]/word-alchemy/page.tsx`, `shiritori/solo/page.tsx`, `word-forge/PageClient.tsx`, `sealed-bid/page.tsx`, `word-tower/PageClient.tsx`
Server-component guard:
- `app/[locale]/crossword/page.tsx:23` (`isAdminSession()` → `canSeeInWorkModesSession()`)
Server socket guard:
- `backend/handlers/gameStartHandler.ts:341` (`is_admin` → fetch `is_beta_tester` too)

NOTE: scoring/rotation gates (`leaderboardScoring.ts`, `gameModeSelector.ts`,
`gameProcessing.ts`) stay `is_admin`-agnostic — preview modes must NOT pollute
leaderboards even when a beta tester plays them. Do not touch.

## Data
Migration: `profiles.is_beta_tester boolean NOT NULL DEFAULT false`.
- `authTypes.ProfileData` += `is_beta_tester?: boolean`
- `PROFILE_SELECTS.full` (the select `getProfile` defaults to) += `is_beta_tester`
- `playerManagerTypes.Player` += `is_beta_tester?: boolean`

## Admin
- `POST /api/admin/players/:id/beta-access` `{ enabled }` (mirror blast-access)
- GET `/players` select += `is_beta_tester`; `hasBeta` query → `playerListFilters`
- `PlayerCard`: beta toggle (purple, FlaskConical) + ADMIN/BETA badges + tidy action group
- `PlayerManager`: `handleToggleBetaAccess` + `betaAccessLoading` + beta filter chip

## i18n
New keys for beta toggle/badge/filter + daily card relabel, ×5 langs (he/en/sv/ja/es).

## Tests (TDD)
- `lib/auth/inWorkModeAccess.test.ts` (pure predicate)
- `lib/auth/canSeeInWorkModesSession.test.ts`
- computed auth: `isBetaTester` + `canSeeInWorkModes`
- `playerListFilters.test.ts`: `hasBeta`
- backend route: beta-access endpoint + gameStartHandler beta host allowed
- `PlayerCard` / `PlayerManager`: beta toggle + badge
</content>
