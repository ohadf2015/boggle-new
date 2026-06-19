'use client';

import { memo } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoPanel } from '@/components/ui/panel';
import ExitRoomButton from '@/components/ExitRoomButton';

export interface WordHuntMPHeaderProps {
  score: number;
  onQuit: () => void;
  t: (key: string) => string;
  onShowHelp?: () => void;
  /**
   * Force the short-landscape compact treatment (small buttons + score chip)
   * regardless of the `max-height:560px` media query. WordHuntGameLayout sets
   * this on wide-but-short viewports (e.g. 1530×695) where the row layout is
   * active but height is tight, so the chrome stops crowding the grid.
   */
  compact?: boolean;
}

// Icon button size — `compact` collapses it without waiting on the media query.
const iconBtnSize = (compact?: boolean) =>
  compact ? 'w-8 h-8' : 'w-10 h-10 [@media(max-height:560px)]:w-8 [@media(max-height:560px)]:h-8';

export const WordHuntMPHeader = memo<WordHuntMPHeaderProps>(({
  score,
  onQuit,
  t,
  onShowHelp,
  compact,
}) => {
  return (
    <div className={cn(
      'flex items-center justify-between px-2 gap-2',
      compact ? 'py-0' : 'py-0.5 [@media(max-height:560px)]:py-0',
    )}>
      {/* Help button or spacer for layout balance */}
      {onShowHelp ? (
        <button
          onClick={onShowHelp}
          className={cn(
            iconBtnSize(compact),
            'flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm hover:text-neo-white hover:shadow-hard active:shadow-hard-pressed transition-all',
          )}
          aria-label={t('wordHuntRules.quickTipsTitle')}
          data-testid="wh-help-button"
        >
          <HelpCircle size={20} strokeWidth={2.5} />
        </button>
      ) : (
        <div className="w-10" />
      )}

      {/* Score Badge */}
      <div className="flex-1 flex justify-center">
        <NeoPanel tone="navy" shadow="sm" className={cn(
          compact ? 'px-2 py-0' : 'px-4 py-1.5 [@media(max-height:560px)]:px-2 [@media(max-height:560px)]:py-0',
        )}>
          <span className={cn(
            'font-black font-neo-display text-neo-yellow tabular-nums',
            compact ? 'text-base' : 'text-2xl [@media(max-height:560px)]:text-base',
          )}>
            {score}
          </span>
        </NeoPanel>
      </div>

      {/* Quit Button — shared canonical exit button (DoorOpen), sized to match
          the header's compact/full responsive treatment. */}
      <ExitRoomButton
        onClick={onQuit}
        label={t('common.quit')}
        className={cn(iconBtnSize(compact), 'min-w-0 min-h-0')}
      />
    </div>
  );
});

WordHuntMPHeader.displayName = 'WordHuntMPHeader';
