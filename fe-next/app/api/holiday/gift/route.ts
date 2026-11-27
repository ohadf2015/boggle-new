import type { NextRequest } from 'next/server';
import { holidayRoute } from '@/lib/holidays/holidayRoute.server';
import { openGift, readGift } from '@/lib/holidays/gift.server';

export async function GET(request: NextRequest) {
  return holidayRoute(request, { name: 'holiday-gift-read', max: 30 }, ({ supabase, userId, input }) => readGift(supabase, userId as string, input));
}

export async function POST(request: NextRequest) {
  return holidayRoute(request, { name: 'holiday-gift-open', max: 10 }, ({ supabase, userId, input }) => openGift(supabase, userId as string, input));
}
