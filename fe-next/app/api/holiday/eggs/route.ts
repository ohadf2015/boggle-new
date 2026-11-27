import type { NextRequest } from 'next/server';
import { BadRequest, holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { pickRoscon, readEggs, recordEgg, ROSCON_SLICES, SERVER_ONLY_EGGS } from '@/lib/holidays/eggs.server';
import { isEggId } from '@/lib/holidays/eggs';

export async function GET(request: NextRequest) {
  return holidayRoute(request, { name: 'holiday-eggs-read', max: 30 }, async ({ supabase, userId, input }) => ({
    found: await readEggs(supabase, userId as string, input),
  }));
}

export async function POST(request: NextRequest) {
  return holidayRoute<{ egg?: unknown; roscon?: unknown }>(request, { name: 'holiday-eggs-find', max: 20 }, ({ supabase, userId, input, body }) => {
    if (body.roscon !== undefined) {
      const pick = body.roscon;
      if (typeof pick !== 'number' || !Number.isInteger(pick) || pick < 0 || pick >= ROSCON_SLICES) throw new BadRequest('Invalid slice');
      return pickRoscon(supabase, userId as string, input, pick);
    }
    if (!isEggId(body.egg) || SERVER_ONLY_EGGS.has(body.egg)) throw new BadRequest('Invalid egg');
    return recordEgg(supabase, userId as string, input, body.egg);
  });
}
