import { NextResponse } from 'next/server';
import { getRandomGenericAvatar } from '@/backend/modules/botManager';

/**
 * GET /api/random-avatar
 * Returns a random generic avatar for OAuth users whose names don't come from the fun name pool
 * These are neutral emojis that work with any name
 */
export async function GET() {
  const avatar = getRandomGenericAvatar();

  return NextResponse.json({
    avatar,
  });
}
