import { NextRequest, NextResponse } from 'next/server';
import { generateRandomPlayerName } from '@/backend/modules/botManager';

/**
 * GET /api/random-name
 * Returns a random player name with suited avatar for players who don't set their own name
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language') || 'en';
  const existingNamesParam = searchParams.get('existing');

  // Parse existing names if provided (comma-separated)
  const existingNames = existingNamesParam
    ? existingNamesParam.split(',').map(n => n.trim()).filter(Boolean)
    : [];

  const { name, avatar } = generateRandomPlayerName(existingNames, language);

  return NextResponse.json({
    name,
    avatar,
  });
}
