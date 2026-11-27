import type { NextRequest } from 'next/server';
import { holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { kohakuTeam, kohakuTotals } from '@/lib/holidays/holidayGame.server';

export async function GET(request: NextRequest) {
  return holidayRoute(request, { name: 'holiday-kohaku', max: 30, guestOk: true }, async ({ supabase, userId, input }) => ({
    ...(await kohakuTotals(supabase, input.localDate)),
    team: userId ? kohakuTeam(userId) : null,
  }));
}
