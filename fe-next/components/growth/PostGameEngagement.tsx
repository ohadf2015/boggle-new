'use client';

/**
 * PostGameEngagement — Compact engagement prompts shown after a game ends.
 * Shows league rivals ("You're 50pts behind Alex") and Word of the Day.
 * These hit harder post-game when the player is deciding whether to play again.
 * Each sub-section self-hides when empty, so the component adds zero noise.
 */

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

const LeagueRivalsCard = dynamic(
  () => import('@/components/leagues/LeagueRivalsCard').then(m => m.LeagueRivalsCard),
  { ssr: false },
);
const WotdTeaser = dynamic(
  () => import('@/components/landing/WotdTeaser').then(m => m.WotdTeaser),
  { ssr: false },
);
const WordCollectionCard = dynamic(
  () => import('@/components/vocabulary/WordCollectionCard').then(m => m.WordCollectionCard),
  { ssr: false },
);

export const PostGameEngagement: React.FC = memo(function PostGameEngagement() {
  const { isAuthenticated } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  // Only show for authenticated users — guests see the sign-up CTA instead
  if (!isAuthenticated) return null;
  // CrazyGames distribution is multiplayer-only — WotdTeaser links to /daily,
  // which would navigate the player off-mode. Hide the whole block.
  if (isOnCrazyGamesPlatform) return null;

  return (
    <div
      data-testid="post-game-engagement"
      className="flex flex-col gap-3 w-full"
    >
      {/* "You're 50pts behind Alex" — social pressure to play again */}
      <LeagueRivalsCard />
      {/* Word of the Day — discovery moment after game */}
      <WotdTeaser />
      {/* Words you discovered this session */}
      <WordCollectionCard />
    </div>
  );
});

export default PostGameEngagement;
