import type { NextRequest } from 'next/server';
import { BadRequest, holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { readHunt, recordHuntFind } from '@/lib/holidays/hunt.server';
import { isHuntSlot } from '@/lib/holidays/hunt';

export async function GET(request: NextRequest) {
  return holidayRoute(request, { name: 'holiday-hunt-read', max: 30 }, ({ supabase, userId, input }) => readHunt(supabase, userId as string, input));
}

export async function POST(request: NextRequest) {
  return holidayRoute<{ slot?: unknown }>(request, { name: 'holiday-hunt-find', max: 10 }, ({ supabase, userId, input, body }) => {
    if (!isHuntSlot(body.slot)) throw new BadRequest('Invalid slot');
    return recordHuntFind(supabase, userId as string, input, body.slot);
  });
}
