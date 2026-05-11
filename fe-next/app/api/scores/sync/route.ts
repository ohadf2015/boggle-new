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
// Per-mode award dispatch (coins/streaks/badges via existing handlers)
// is still TODO — current implementation accepts/rejects but does not
// yet persist to per-mode score tables. Tracked as Phase 1 follow-up.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { revalidateSubmission, type RevalidateResult } from '@/lib/offline/serverRevalidate';
import { validateWordOnServer } from '@/lib/wordValidation/serverDicts';

const SubmissionSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(['sp', 'wotd', 'daily-survival', 'daily-wordhunt', 'brain', 'adventure']),
  payload: z.object({
    score: z.number().int().nonnegative(),
    words: z.array(z.string()).optional(),
    language: z.string().optional(),
    puzzleDate: z.string().optional(),
  }),
  clientCompletedAt: z.number().int().positive(),
});

const RequestSchema = z.object({
  submissions: z.array(SubmissionSchema).min(1).max(50),
});

type SyncResult = RevalidateResult;

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const limit = checkApiRateLimit(req, 'scores-sync', { windowMs: 60_000, maxRequests: 20 });
    if (!limit.success) return rateLimitResponse(limit);

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
      const result = await revalidateSubmission(sub, validateWordOnServer);
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
