# Economy Unification Plan

## Current State

LexiClash has two separate currency systems:

| | Coins | Gold |
|---|---|---|
| **Storage** | localStorage (`coinManager.ts`) | Supabase (`adventure_progress.gold`) |
| **Scope** | All modes (singleplayer, daily, blast, multiplayer) | Adventure mode only |
| **Earning** | `SINGLEPLAYER_BASE + Math.floor(score / SCORE_DIVISOR)` | Boss defeats, quest rewards, loot |
| **Spending** | Cosmetics, room flair (planned) | Word Forge upgrades (11 upgrades in `upgradeConfig.ts`) |
| **Auth required** | No (guest-friendly) | Yes (Supabase auth) |
| **Persistence** | Lost on clear/device switch | Permanent, cross-device |

## Problem

- Players earn "coins" in most modes but "gold" in adventure — confusing
- Coins in localStorage are not persistent; players lose progress
- No way to spend coins earned in singleplayer/daily on adventure upgrades (or vice versa)
- Monetization (battle pass, gold packs) needs a single reliable currency

## Proposed Solution: Single "Gold" Currency via Supabase

Unify into one currency called **Gold**, backed by Supabase for authenticated users with localStorage fallback for guests.

### Architecture

```
Earning (any mode) → /api/coins endpoint → Supabase profiles.gold_balance
                                         ↘ localStorage (guest fallback)

Spending (any mode) → /api/coins/spend endpoint → Supabase profiles.gold_balance
                                                ↘ localStorage (guest fallback)
```

### Key Decisions

- **Single endpoint**: `/api/coins` handles both auth and guest paths
- **Server-side validation**: All earn/spend validated server-side (already started in production-readiness audit)
- **Guest fallback**: Guests keep localStorage; balance migrates on first auth
- **Adventure gold merges**: `adventure_progress.gold` balance added to main `profiles.gold_balance` during migration
- **Display name**: "Gold" everywhere (coins → gold in UI, i18n keys)

## Migration Steps

1. **Add `gold_balance` column to `profiles` table** — `ALTER TABLE profiles ADD COLUMN gold_balance INTEGER DEFAULT 0;`
2. **Create `/api/coins` endpoint** — accepts `{ action: 'earn' | 'spend', amount: number, source: string }`, validates server-side, updates `profiles.gold_balance` (auth) or returns instruction to update localStorage (guest)
3. **Migrate adventure gold** — SQL: `UPDATE profiles SET gold_balance = gold_balance + (SELECT gold FROM adventure_progress WHERE user_id = profiles.id)`
4. **Update `coinManager.ts`** — replace localStorage reads/writes with API calls for auth users; keep localStorage path for guests
5. **Add auth-triggered migration** — on first login, read localStorage coin balance, POST to `/api/coins` with `source: 'migration'`, clear localStorage
6. **Update all UI references** — change i18n keys from `coins` → `gold`, update `Coins` icon to unified gold icon
7. **Update `useAdventureCurrency`** — read/write from `profiles.gold_balance` instead of `adventure_progress.gold`
8. **Deprecate `adventure_progress.gold`** — stop writing, keep column for rollback window (30 days), then drop
9. **Update Word Forge shop** — spend from unified balance
10. **Smoke test all modes** — singleplayer, daily, blast, adventure, multiplayer earn/spend paths

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Guest→auth migration loses coins | High | Double-write during transition: localStorage + API. Migration is additive (never subtracts). |
| API latency for coin display | Medium | Optimistic UI updates; cache balance in memory. Refetch on focus. |
| Adventure gold double-counted | Medium | Migration script runs once per user (idempotent flag `gold_migrated_at` timestamp). |
| Rate limiting on `/api/coins` | Low | Batch small earnings (e.g., per-word scores) into single end-of-game request. |
| Rollback needed | Medium | Keep both systems writing for 30-day window. Feature flag `USE_UNIFIED_GOLD`. |

## Estimated Effort

| Phase | Work | Estimate |
|---|---|---|
| DB migration + API endpoint | Backend | 1 day |
| coinManager refactor | Frontend | 1 day |
| Auth-triggered migration | Full-stack | 0.5 day |
| Adventure gold merge | Backend + SQL | 0.5 day |
| i18n + UI updates | Frontend | 0.5 day |
| Testing all modes | QA | 1 day |
| **Total** | | **~4.5 days** |

## Out of Scope

- Changing the coin earning formula (separate task)
- Implementing monetization (battle pass, gold packs) — depends on this
- Score display multiplier (M1 — separate task, purely cosmetic)
