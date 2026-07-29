'use client';

import { memo } from 'react';
import ComboDisplay from './ComboDisplay';
import { useComboTimer } from '@/player/hooks/useComboTimer';

interface Props {
  comboLevel: number;
  /** Timestamp of the last word found, drives the combo-window countdown. */
  lastWordTime: number | null;
  compact?: boolean;
}

/**
 * Self-contained wrapper around ComboDisplay. Owning the `useComboTimer`
 * subscription here (rather than in PlayerView) isolates the ~10 Hz RAF-driven
 * combo-timer state updates from the game shell. Without this, every threshold
 * tick re-rendered PlayerView → PlayerInGameView → InGameScreen → PortraitLayout
 * → ComboDisplay through 4 memo boundaries while the user was mid-drag,
 * stealing frame budget from per-letter grid rendering on mobile MP classic.
 *
 * Mirrors the OpponentWordFeedConnected pattern (PR #450).
 */
export const ComboDisplayConnected = memo<Props>(function ComboDisplayConnected({
  comboLevel,
  lastWordTime,
  compact,
}) {
  const { comboTimeRemaining, comboDanger } = useComboTimer(comboLevel, lastWordTime);
  return (
    <ComboDisplay
      comboLevel={comboLevel}
      compact={compact}
      timeRemaining={comboTimeRemaining}
      isDanger={comboDanger}
    />
  );
});
