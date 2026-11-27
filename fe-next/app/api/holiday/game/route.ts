import type { NextRequest } from 'next/server';
import { holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { noteHolidayGame } from '@/lib/holidays/holidayGame.server';

export async function POST(request: NextRequest) {
  return holidayRoute<{ words?: unknown }>(request, { name: 'holiday-game', max: 20 }, ({ supabase, userId, input, body }) =>
    noteHolidayGame(supabase, userId as string, input, Number(body.words) || 0),
  );
}
