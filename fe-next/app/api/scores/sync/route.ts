// POST /api/scores/sync — batch sync endpoint for offline score queue.
//
// Server-wins: client-claimed score is IGNORED. For each submission, we
// re-validate every word against the canonical server dictionary and
// recompute finalScore from the accepted words via the shared
// calculateWordScoreByLength helper. Combos/multipliers are not
// re-applied (server has no game-state context for a queued
// submission), so finalScore is intentionally a conservative floor —
// clients render the adjustment via the offline.sync.adjusted toast.
//
// Phase 1b: per-mode award dispatch wired in for `adventure` and `brain`.
// Each handler calls its own pure processCompletion(...) and writes to
// public.offline_award_log for persistent double-credit protection.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';
import { createClient } from '@/utils/supabase/server';
import {
  revalidateSubmission,
  type RevalidateResult,
  type ServerSubmission,
} from '@/lib/offline/serverRevalidate';
import { validateWordOnServer } from '@/lib/wordValidation/serverDicts';
import {
  processAdventureCompletion,
  type ProcessAdventureContext,
} from '@/app/api/adventure/complete/processCompletion';
import { validateRequestBody as validateAdventureBody } from '@/app/api/adventure/complete/validation';
import {
  processBrainDrillCompletion,
  type ProcessDrillContext,
  type DrillSubmitBody,
} from '@/app/api/drills/submit/processCompletion';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { validateBlastResult } from '@/app/api/blast/utils';
import { processBlastCompletion } from '@/app/api/blast/result/processCompletion';

type SupabaseLike = any;

/**
 * Award-handler failure that carries retry intent. A `retryable` failure
 * (transient — 5xx, DB blip) must NOT delete the queued row: setting
 * accepted=false makes the client retry on the next sync instead of silently
 * losing the score. A non-retryable failure (4xx business rejection — level
 * locked, puzzle expired) keeps accepted=true so the row is dropped rather than
 * retried forever. An unexpected (non-AwardError) throw defaults to retryable.
 */
class AwardError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = 'AwardError';
  }
}

interface AwardHandlerArgs {
  sub: ServerSubmission;
  userId: string;
  supabase: SupabaseLike;
}

type AwardHandler = (args: AwardHandlerArgs) => Promise<Record<string, unknown>>;

// Modes where the sync revalidation loop (per-word dictionary check) is
// the security gate. Other modes (adventure, brain) carry their own
// validation in their processCompletion pipeline and short-circuit
// revalidation here.
const WORD_VALIDATED_MODES = new Set<ServerSubmission['mode']>([
  'sp', 'wotd', 'daily-survival', 'daily-wordhunt',
]);

// Daily modes have a per-date puzzle. Stale submissions (puzzleDate older
// than yesterday, or missing entirely) are rejected with puzzle_expired —
// prevents replay-from-cache abuse on the offline sync path.
const DATE_GUARDED_MODES = new Set<ServerSubmission['mode']>([
  'wotd', 'daily-survival', 'daily-wordhunt',
]);

function todayUtcDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayUtcDateString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

function isPuzzleDateFresh(puzzleDate: string | undefined): boolean {
  if (!puzzleDate) return false;
  return puzzleDate === todayUtcDateString() || puzzleDate === yesterdayUtcDateString();
}

async function dispatchAdventure({ sub, userId, supabase }: AwardHandlerArgs): Promise<Record<string, unknown>> {
  const validation = validateAdventureBody(sub.payload as Record<string, unknown>);
  if (!validation.valid || !validation.data) {
    throw new AwardError(`adventure payload invalid: ${validation.error}`, false);
  }
  const ctx: ProcessAdventureContext = { supabase, source: 'offline-sync' };
  const result = await processAdventureCompletion(validation.data, userId, ctx);
  if (!result.ok) {
    throw new AwardError(`adventure handler ${result.status}: ${result.error}`, result.status >= 500);
  }
  return {
    xpEarned: result.body.xpEarned,
    goldEarned: result.body.goldEarned,
    starsGained: result.body.starsGained,
    isReplay: result.body.isReplay,
    leveledUp: result.body.leveledUp,
  };
}

async function dispatchBrain({ sub, userId, supabase }: AwardHandlerArgs): Promise<Record<string, unknown>> {
  // Use the queue submission id as the idempotency key — it is already a
  // UUID and gives processBrainDrillCompletion its 5-min same-submission
  // guard for free.
  const body = sub.payload as unknown as DrillSubmitBody;
  const ctx: ProcessDrillContext = { supabase, source: 'offline-sync' };
  const result = await processBrainDrillCompletion(body, userId, sub.id, ctx);
  if (!result.ok) {
    throw new AwardError(`brain handler ${result.status}: ${result.error}`, result.status >= 500);
  }
  return {
    xpAwarded: result.body.xpAwarded,
    brainScore: result.body.brainScore?.overallScore,
    levelPromoted: result.body.levelPromoted,
    idempotent: result.body.idempotent === true,
  };
}

// Blast persistence needs the service-role client (the route uses it too, to
// bypass RLS on profiles/XP). The sync route's per-request client is the authed
// user client, so dispatchBlast creates its own service client.
function getBlastServiceClient(): SupabaseLike | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

async function dispatchBlast({ sub, userId }: AwardHandlerArgs): Promise<Record<string, unknown>> {
  const validation = validateBlastResult(sub.payload as Record<string, unknown>);
  if (!validation.valid || !validation.data) {
    throw new AwardError(`blast payload invalid: ${validation.error}`, false);
  }
  const supabase = getBlastServiceClient();
  if (!supabase) {
    // Misconfiguration is transient from the client's view — retry next sync.
    throw new AwardError('blast service unavailable', true);
  }
  const result = await processBlastCompletion(validation.data, userId, {
    supabase,
    source: 'offline-sync',
  });
  if (!result.ok) {
    throw new AwardError(`blast handler ${result.status}: ${result.error}`, result.status >= 500);
  }
  return {
    isNewBestScore: result.body.isNewBestScore,
    xpAwarded: result.body.xpAwarded,
    percentile: result.body.percentile,
  };
}

const awardHandlers: Partial<Record<ServerSubmission['mode'], AwardHandler>> = {
  adventure: dispatchAdventure,
  brain: dispatchBrain,
  blast: dispatchBlast,
  // sp / wotd / daily-survival / daily-wordhunt: pending Phase 1c (no
  // canonical server completion path exists yet for those modes).
};

const SubmissionSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(['sp', 'wotd', 'daily-survival', 'daily-wordhunt', 'brain', 'adventure', 'blast']),
  // Base payload is intentionally loose. Each mode interprets `words`
  // differently — word-validated modes need `string[]` (revalidate.ts),
  // adventure stores `number` (count). Per-mode handlers narrow + validate.
  payload: z.object({
    score: z.number().int().nonnegative(),
    language: z.string().optional(),
    puzzleDate: z.string().optional(),
  }).passthrough(),
  clientCompletedAt: z.number().int().positive(),
});

const RequestSchema = z.object({
  submissions: z.array(SubmissionSchema).min(1).max(50),
});

interface SyncResult extends RevalidateResult {
  awards?: Record<string, unknown> | null;
  awardError?: string;
}

const dedupeCache = new Map<string, SyncResult>();
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const dedupeTimes = new Map<string, number>();

function purgeStaleDedupe(): void {
  const cutoff = Date.now() - DEDUPE_TTL_MS;
  for (const [id, ts] of dedupeTimes) {
    if (ts < cutoff) {
      dedupeCache.delete(id);
      dedupeTimes.delete(id);
    }
  }
}

/**
 * Persistent idempotency check. Survives server restart and out-of-process
 * deploys (unlike the in-memory dedupeCache). Returns the previously
 * awarded payload if found, null otherwise.
 */
async function readPriorAwardLog(
  supabase: SupabaseLike,
  submissionId: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from('offline_award_log')
    .select('awards')
    .eq('submission_id', submissionId)
    .maybeSingle();
  return (data?.awards as Record<string, unknown> | undefined) ?? null;
}

async function writeAwardLog(
  supabase: SupabaseLike,
  submissionId: string,
  userId: string,
  mode: string,
  awards: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('offline_award_log').insert({
    submission_id: submissionId,
    user_id: userId,
    mode,
    awards,
  });
  // 23505 = unique-violation on submission_id — means a concurrent sync
  // wrote the row first. Safe to swallow; awards already persisted.
  if (error && error.code !== '23505') {
    throw new Error(`offline_award_log insert failed: ${error.message}`);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const limit = checkApiRateLimit(req, 'scores-sync', { windowMs: 60_000, maxRequests: 20 });
    if (!limit.success) return rateLimitResponse(limit);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const raw = await req.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
    }

    purgeStaleDedupe();

    const results: SyncResult[] = [];
    for (const sub of parsed.data.submissions) {
      const prior = dedupeCache.get(sub.id);
      if (prior) {
        results.push(prior);
        continue;
      }

      // Date guard: daily-mode submissions older than yesterday (or missing
      // puzzleDate) are stale. Reject before any award / revalidation work.
      if (DATE_GUARDED_MODES.has(sub.mode) && !isPuzzleDateFresh(sub.payload.puzzleDate)) {
        const stale: SyncResult = {
          id: sub.id,
          accepted: false,
          finalScore: 0,
          rejectedWords: [],
          reason: 'puzzle_expired',
        };
        dedupeCache.set(sub.id, stale);
        dedupeTimes.set(sub.id, Date.now());
        results.push(stale);
        continue;
      }

      // Word-based modes still run through revalidation. Adventure/brain
      // skip it; their handlers carry the security gate.
      let revalidated: RevalidateResult;
      if (WORD_VALIDATED_MODES.has(sub.mode)) {
        revalidated = await revalidateSubmission(sub as ServerSubmission, validateWordOnServer);
      } else {
        revalidated = {
          id: sub.id,
          accepted: true,
          finalScore: sub.payload.score,
          rejectedWords: [],
        };
      }

      const result: SyncResult = { ...revalidated };

      if (revalidated.accepted) {
        const handler = awardHandlers[sub.mode];
        if (handler) {
          try {
            // Persistent idempotency: if this submission already awarded
            // (e.g. cache evicted and replayed), return cached awards
            // without re-crediting.
            const prior = await readPriorAwardLog(supabase, sub.id);
            if (prior) {
              result.awards = prior;
            } else {
              const awarded = await handler({
                sub: sub as ServerSubmission,
                userId: user.id,
                supabase,
              });
              await writeAwardLog(supabase, sub.id, user.id, sub.mode, awarded);
              result.awards = awarded;
              getPostHogServer()?.capture({
                distinctId: user.id,
                event: 'offline_sync_award_granted',
                properties: { mode: sub.mode, submissionId: sub.id, ...awarded },
              });
            }
          } catch (err) {
            result.awardError = err instanceof Error ? err.message : 'unknown_award_error';
            // Transient failures (5xx, unexpected throws) must retry, not drop:
            // flip accepted=false so the client keeps the queued row. Permanent
            // 4xx rejections stay accepted=true (drop — retry can't help).
            const retryable = err instanceof AwardError ? err.retryable : true;
            if (retryable) {
              result.accepted = false;
              result.reason = result.reason ?? 'award_failed';
            }
            captureApiError(
              err instanceof Error ? err : new Error(String(err)),
              'scores-sync.award',
              { userId: user.id, body: { mode: sub.mode, submissionId: sub.id } },
            );
          }
        } else {
          result.awards = null;
        }
      }

      dedupeCache.set(sub.id, result);
      dedupeTimes.set(sub.id, Date.now());
      results.push(result);
    }

    return NextResponse.json({ results });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'scores-sync');
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
