import { NextResponse } from 'next/server';
import { getRandomAvatar } from '@/backend/modules/avatarConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generic avatar colors (subset of bot config to avoid logger dependency)
const GENERIC_AVATAR_COLORS = [
  { emoji: '😊', color: '#fcd34d' },
  { emoji: '😎', color: '#1f2937' },
  { emoji: '🙂', color: '#fef08a' },
  { emoji: '😄', color: '#86efac' },
  { emoji: '🤗', color: '#f9a8d4' },
];

/**
 * GET /api/random-avatar
 * Returns a random generic avatar for OAuth users whose names don't come from the fun name pool
 * Returns avatar images instead of emojis
 */
export async function GET() {
  const avatarImage = getRandomAvatar();
  const legacyAvatar = GENERIC_AVATAR_COLORS[Math.floor(Math.random() * GENERIC_AVATAR_COLORS.length)];

  return NextResponse.json({
    avatar: {
      avatarImage: avatarImage.id,
      // Keep emoji/color for backward compatibility
      emoji: legacyAvatar.emoji,
      color: legacyAvatar.color,
    },
  });
}
