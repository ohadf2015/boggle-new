import type { NextRequest } from 'next/server';
import { holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { readWrapped } from '@/lib/holidays/wrapped.server';

export async function GET(request: NextRequest) {
  return holidayRoute(request, { name: 'holiday-wrapped', max: 20 }, ({ supabase, userId, input }) => readWrapped(supabase, userId as string, input));
}
