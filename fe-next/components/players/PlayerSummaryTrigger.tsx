'use client';

import React, { useCallback, useState } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { PlayerSummaryDialog } from './PlayerSummaryDialog';
import { hasSummary, type PlayerSummarySeed } from './playerSummaryModel';

interface PlayerSummaryTriggerProps {
  player: PlayerSummarySeed;
  /** Analytics surface, e.g. 'daily_leaderboard'. */
  surface: string;
  /** The tappable element (a name, an avatar). Receives the click and keyboard props. */
  children: React.ReactElement;
  /** Give the trigger its own accessible name (use for an avatar, which has no text). */
  labelled?: boolean;
  /** Skip the card (the viewer's own row, or a row with no profile). */
  disabled?: boolean;
}

/**
 * Makes a player's name or avatar on a board open their summary card. The card
 * mounts on first tap only, so a 50-row board renders no dialogs up front.
 */
export function PlayerSummaryTrigger({ player, surface, children, labelled = false, disabled = false }: PlayerSummaryTriggerProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const openCard = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMounted(true);
    setOpen(true);
    trackGrowthEvent('player_summary_opened', { surface });
  }, [surface]);

  if (disabled || !hasSummary(player)) return children;

  const label = labelled ? t('playerSummary.openFor').replace('{name}', player.name) : undefined;

  return (
    <>
      <Slot
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={label}
        data-testid="player-summary-trigger"
        onClick={openCard}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') openCard(e);
        }}
        className="cursor-pointer rounded-neo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
      >
        {children}
      </Slot>
      {mounted && (
        <PlayerSummaryDialog player={player} open={open} onOpenChange={setOpen} surface={surface} />
      )}
    </>
  );
}

export default PlayerSummaryTrigger;
