import { NextRequest, NextResponse } from 'next/server';
import { BOT_CONFIG } from '@/backend/modules/botConfig';
import { getRandomAvatar } from '@/backend/modules/avatarConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  // Get name pool for the language
  const namePool = BOT_CONFIG.PLAYER_NAMES[language] || BOT_CONFIG.PLAYER_NAMES.en;

  // Filter out names already in use
  const availableEntries = namePool.filter((entry: { name: string }) =>
    !existingNames.includes(entry.name)
  );

  // Pick a random entry (or fallback to any if all used)
  const entry = availableEntries.length > 0
    ? availableEntries[Math.floor(Math.random() * availableEntries.length)]
    : namePool[Math.floor(Math.random() * namePool.length)];

  // Get random avatar image
  const avatarImage = getRandomAvatar();

  return NextResponse.json({
    name: entry.name,
    avatar: {
      avatarImage: avatarImage.id,
      // Keep emoji/color for backward compatibility
      emoji: entry.emoji,
      color: entry.color,
    },
  });
}
