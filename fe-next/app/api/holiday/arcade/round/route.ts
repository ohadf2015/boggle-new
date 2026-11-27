import type { NextRequest } from 'next/server';
import { holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { previewRound } from '@/lib/holidays/arcade/preview.server';
import { startRound } from '@/lib/holidays/arcade/rounds.server';

export async function POST(request: NextRequest) {
  const preview = await previewRound(request);
  if (preview) return preview;
  return holidayRoute<{ game?: unknown }>(request, { name: 'holiday-arcade-round', max: 30, guestOk: true }, ({ supabase, userId, input, body }) =>
    startRound(supabase, userId, input, body.game),
  );
}
