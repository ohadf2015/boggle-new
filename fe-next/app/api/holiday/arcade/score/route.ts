import type { NextRequest } from 'next/server';
import { holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { finishRound } from '@/lib/holidays/arcade/rounds.server';

export async function POST(request: NextRequest) {
  return holidayRoute<{ roundId?: unknown; plays?: unknown; score?: unknown }>(request, { name: 'holiday-arcade-score', max: 20 }, ({ supabase, userId, input, body }) =>
    finishRound(supabase, userId as string, input, body),
  );
}
