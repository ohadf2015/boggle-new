# Offline Mode — Phase 1b Plan: Per-Mode Award Dispatch

**Date**: 2026-05-11
**Depends on**: Phase 1 shipped (commits `4570389b5` → `ffa9b5cf2`).
**Scope**: Make queued-then-synced scores actually grant rewards (coins, streak, badges, XP). Without this, offline play validates but doesn't reward — players see the toast but their balance doesn't move.

---

## Problem statement

`/api/scores/sync` currently:
- Validates each word against canonical server dict ✓
- Recomputes `finalScore` from accepted words ✓
- Returns `{ accepted, finalScore, rejectedWords }` per submission ✓
- Persists to dedupe cache (24h TTL) ✓
- **Does NOT** call into per-mode handlers to grant coins/streak/badges/XP

The four affected modes:

| Mode | Existing handler | Award responsibilities |
|---|---|---|
| `sp` | (none — SP scores not server-persisted today) | None per-game; aggregate via `/api/stats/record-game` |
| `wotd` | tRPC `dailyChallengeRouter.submit` (TBD) | Coins, streak, daily-mission progress |
| `daily-survival` | tRPC daily-survival path | Coins, streak, leaderboard |
| `daily-wordhunt` | tRPC daily-wordhunt path | Coins, streak, leaderboard |
| `brain` | `/api/drills/submit` | Brain score, drill streak, level-up |
| `adventure` | `/api/adventure/complete` | XP, gold, daily cap, word album, weekly quest, level-completion, loot |

---

## Design Decision: Extract → Reuse, not Self-call

Three options considered:

| Option | How | Pro | Con |
|---|---|---|---|
| **A. HTTP self-call** | Sync route POSTs to existing endpoints | Zero refactor | Auth-cookie passing fragile; 6× latency; circular self-calls; observability mess |
| **B. Audit table only** | Sync persists to `offline_synced_submissions`; mode-cron processes later | No handler refactor; visible audit | Delayed UX; new cron debt; extra table |
| **C. Programmatic extract** ← chosen | Each handler exposes pure `processCompletion(payload, userId)` that sync route calls directly | Single function call; same DB transaction; no auth-passing | Refactor of 4 handlers |

**Why C wins**: existing handlers already have the right logic; they just blend it with HTTP + auth + validation. Extracting the post-auth pure function preserves all existing behavior for online flows AND makes it callable from sync.

---

## Refactor pattern (apply to each mode)

Before:
```ts
// app/api/adventure/complete/route.ts
export async function POST(req) {
  const user = await authenticate(req);
  const body = parseBody(await req.json());
  // ... 200 lines of award logic ...
  return NextResponse.json(result);
}
```

After:
```ts
// app/api/adventure/complete/route.ts
export async function POST(req) {
  const user = await authenticate(req);
  const body = parseBody(await req.json());
  const result = await processAdventureCompletion(body, user.id, { source: 'live' });
  return NextResponse.json(result);
}

// app/api/adventure/complete/processCompletion.ts  ← NEW
export async function processAdventureCompletion(
  body: AdventureCompletionPayload,
  userId: string,
  ctx: { source: 'live' | 'offline-sync' }
): Promise<AdventureCompletionResult> {
  // ... same 200 lines, but no HTTP / no req/res ...
}
```

The `source` context flag lets handlers detect offline-sync submissions for telemetry differentiation (e.g., PostHog `offline_sync_completion` event) without changing core logic.

---

## Sync-route changes

```ts
// app/api/scores/sync/route.ts
import { processAdventureCompletion } from '@/app/api/adventure/complete/processCompletion';
import { processBrainDrillCompletion } from '@/app/api/drills/submit/processCompletion';
// ...etc

const handlers = {
  adventure: processAdventureCompletion,
  brain: processBrainDrillCompletion,
  'daily-survival': processDailySurvivalCompletion,
  'daily-wordhunt': processDailyWordhuntCompletion,
  wotd: processWotdCompletion,
  sp: processSpCompletion,
};

// After server-wins revalidate:
if (result.accepted) {
  const handler = handlers[sub.mode];
  if (handler) {
    try {
      const awarded = await handler(sub.payload, userId, { source: 'offline-sync' });
      result.awards = awarded;  // Add awards: {coins, xp, streak, badges} to response
    } catch (err) {
      // Award failure should NOT roll back acceptance — log + flag for manual review
      captureApiError(err, 'scores-sync.award');
      result.awardError = err.message;
    }
  }
}
```

### Auth on sync route

The current `/api/scores/sync` route doesn't authenticate (rate-limit only). For per-mode dispatch we MUST authenticate:
- Server-wins validation only protects against word cheating
- Award dispatch writes to user-scoped rows; we need the user id

Add:
```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
```

Per memory `auth-getuser-refactor-playbook`, prefer the local JWT verify helper on read-only paths — but this route writes, so `auth.getUser` is the right call.

### Idempotency

The 24h dedupe cache already protects against double-acceptance via `submissionId`. But we must ALSO protect against double-AWARD: same `submissionId` should not credit coins twice if the cache is purged. Persist `submissionId` in each mode's award log:

```ts
// pattern per mode
const { error } = await supabase
  .from('mode_completion_log')
  .insert({ submission_id: submissionId, user_id: userId, mode: 'adventure', awarded_at: now })
  .returns();
if (error?.code === '23505') return cachedResult;  // unique violation = already awarded
```

Or add a single shared `offline_award_log(submission_id PRIMARY KEY, user_id, mode, awarded_at, payload jsonb)` table that all dispatchers check before writing.

---

## TDD task list

1. **RED+GREEN**: extract `processAdventureCompletion` — keep all existing tests for `/api/adventure/complete/route.ts` green by routing through the new pure function.
2. **RED+GREEN**: same for `/api/drills/submit`.
3. **RED+GREEN**: same for daily-survival / daily-wordhunt / wotd tRPC routers.
4. **RED+GREEN**: same for sp (or skip — no existing handler).
5. **RED+GREEN**: add `offline_award_log` Supabase table via migration. Test idempotency by replaying same submissionId.
6. **RED+GREEN**: sync route auth via `auth.getUser`. Test unauthenticated → 401.
7. **RED+GREEN**: sync route dispatches to handler map by `mode`. Test award call happens after accept.
8. **RED+GREEN**: handler failure doesn't roll back acceptance. Test broken adventure handler → still get accepted result + `awardError` field.
9. **RED+GREEN**: idempotency end-to-end — replay same submission → no double-credit.
10. **RED+GREEN**: PostHog event `offline_sync_award_granted { mode, coins, xp }` per success.

---

## Acceptance — Phase 1b

- Manual: airplane mode → play adventure → reconnect → coins/XP balance moves ✓
- Replay same submissionId via curl → no double-credit, same response ✓
- Broken handler simulation → sync returns 200 with `awardError`, queue drains, audit log row present ✓
- All existing per-mode handler tests still pass (refactor is behavior-preserving) ✓
- PostHog dashboard "Offline Health" shows `offline_sync_award_granted` events ✓

---

## File-touch manifest

**New**:
- `app/api/adventure/complete/processCompletion.ts`
- `app/api/drills/submit/processCompletion.ts`
- `lib/dailyChallenge/processCompletion.ts` (or per-mode files)
- `supabase/migrations/<timestamp>_offline_award_log.sql`
- `__tests__/api/scores-sync-awards.test.ts`

**Edited**:
- `app/api/adventure/complete/route.ts` (route thin wrapper over processCompletion)
- `app/api/drills/submit/route.ts` (same)
- relevant tRPC routers
- `app/api/scores/sync/route.ts` (handler map dispatch + auth)
- `lib/offline/serverRevalidate.ts` (optional: include `awards` shape in result)

---

## Risks

| Risk | Mitigation |
|---|---|
| Extract refactor breaks existing online flow | Behavior-preserving; existing handler tests are the safety net. Run full per-mode test suite before+after. |
| Award handler is slow (adventure does ~200 lines incl. weekly quest update) → sync route timeout on large batches | Sync route caps batch at 50. With 6 modes × max ~500ms each, worst case 15s — well within Node serverless 60s default. Could shard by mode if needed. |
| Double-award via dedupe-cache eviction | Persistent `offline_award_log(submission_id PK)` survives cache restart. Server-side unique constraint is the source of truth. |
| Auth refresh / expired session at sync time | Standard 401 → client surfaces re-login prompt. Queue stays intact until next auth-fresh sync. |
| Adventure `processAdventureCompletion` references `req` for IP/UA fingerprinting | Pass minimal `ctx` (source, ip?, ua?) instead of req object. |
| Streak edge case: offline submission for yesterday synced today should credit YESTERDAY's streak | Per-mode handlers must respect `payload.puzzleDate` as canonical date, not `Date.now()`. Test explicitly. |

---

## Estimated effort

- Per-mode extract: ~1-2h each × 5 modes = 5-10h
- Sync route handler dispatch + auth + idempotency table: ~3h
- Tests: ~4h
- **Total: 1-2 days** in a fresh focused session.

---

## Why this is a separate plan doc from Phase 1

Phase 1 was scoped to "client-side offline play + score queueing + server-wins validation". That ships an honest pipeline: the offline player's score gets accepted with the correct value. The reward gap is real but doesn't break gameplay — players see their score adjust on sync. Adding award dispatch turns scores into balance changes, which is meaningfully different work touching 5 unrelated handlers in production hot paths. Splitting it as Phase 1b keeps Phase 1 reviewable and shippable while the heavier work proceeds independently.
