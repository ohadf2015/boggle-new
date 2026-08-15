'use client';

/**
 * The one mount point for the stuck-player coach.
 *
 * Two game surfaces need it — multiplayer/daily/quick-play via InGameScreen, and
 * single-player, which is now where FTUE drops every new player
 * (lib/onboarding/firstGameRoute.ts). Two surfaces each hand-rolling the
 * positioning and the example-word lookup is how they drift; this is the shared
 * piece so a fix in one is a fix in both.
 *
 * Positioning is deliberate: fixed bottom-centre, above the grid, and the
 * wrapper is pointer-events-none so the board underneath stays fully playable
 * while the card is up. The coach never blocks the game it is explaining.
 */

import { MPStuckCoachCard } from '@/components/game/ftue/MPStuckCoachCard';
import { useCoachExampleWord } from '@/hooks/useCoachExampleWord';
import type { MPStuckCoach } from '@/hooks/useMPStuckCoach';
import type { LetterGrid } from '@/shared/types/game';

interface StuckCoachOverlayProps {
  coach: MPStuckCoach;
  /** The live board — the coach names a word that is actually findable on it. */
  grid: LetterGrid | null;
  language: string;
}

export function StuckCoachOverlay({ coach, grid, language }: StuckCoachOverlayProps) {
  // Hook order must not depend on visibility, so this runs every render; it
  // no-ops while the stage is 'none'.
  const exampleWord = useCoachExampleWord({
    stage: coach.stage,
    grid,
    language: language || 'en',
  });

  if (!coach.visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3">
      <MPStuckCoachCard
        stage={coach.stage}
        exampleWord={exampleWord}
        onDismiss={() => coach.dismiss('manual')}
      />
    </div>
  );
}

export default StuckCoachOverlay;
