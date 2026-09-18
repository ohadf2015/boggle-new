/**
 * Treasure Chest Ticker — Host Screen
 *
 * Shows a scrolling feed of steal and swap events from the current round.
 * Only displays dramatic outcomes (steal/swap), not quiet ones (gain/double/loss).
 * Respects reduced motion: shows the latest event without scrolling animation.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { TreasureChestState, TranslateFn } from '@/shared/types/vocabQuiz';
import { cn } from '@/lib/utils';

export interface TreasureChestTickerProps {
  chestEvents: TreasureChestState[];
  t: TranslateFn;
}

interface TickerEvent {
  id: string;
  actor: string;
  outcome: string;
  targetUsername?: string;
  amount: number;
  timestamp: number;
}

const TICKER_DURATION_MS = 4000; // Show each event for 4 seconds
const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function TreasureChestTicker({ chestEvents, t }: TreasureChestTickerProps) {
  const [visibleEvents, setVisibleEvents] = useState<TickerEvent[]>([]);
  const eventQueueRef = useRef<TickerEvent[]>([]);
  const activeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert chest outcomes to ticker events, filter dramatic ones only
  useEffect(() => {
    chestEvents.forEach((chest) => {
      if (chest.outcome === 'steal' || chest.outcome === 'swap') {
        const id = `${chest.actor}:${chest.outcome}:${Date.now()}`;
        eventQueueRef.current.push({
          id,
          actor: chest.actor,
          outcome: chest.outcome,
          targetUsername: chest.targetUsername,
          amount: chest.amount,
          timestamp: Date.now(),
        });
      }
    });

    // Process the queue if nothing is currently showing
    if (visibleEvents.length === 0 && eventQueueRef.current.length > 0) {
      const event = eventQueueRef.current.shift();
      if (event) {
        setVisibleEvents([event]);
        // Schedule removal after duration
        if (activeTimeoutRef.current) {
          clearTimeout(activeTimeoutRef.current);
        }
        activeTimeoutRef.current = setTimeout(() => {
          setVisibleEvents([]);
          // Recursively process next event
          if (eventQueueRef.current.length > 0) {
            const next = eventQueueRef.current.shift();
            if (next) {
              setVisibleEvents([next]);
            }
          }
        }, TICKER_DURATION_MS);
      }
    }

    return () => {
      if (activeTimeoutRef.current) {
        clearTimeout(activeTimeoutRef.current);
      }
    };
  }, [chestEvents, visibleEvents]);

  if (visibleEvents.length === 0) {
    return null;
  }

  const event = visibleEvents[0];
  const label =
    event.outcome === 'steal'
      ? t('vocabQuiz.treasure.tickerSteal', {
          actor: event.actor,
          target: event.targetUsername || '?',
          amount: event.amount,
        })
      : t('vocabQuiz.treasure.tickerSwap', {
          actor: event.actor,
          target: event.targetUsername || '?',
        });

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 max-w-sm z-30',
        'rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated p-3 shadow-hard',
        !PREFERS_REDUCED_MOTION && 'animate-[cosy-quiet-in_400ms_ease-out]'
      )}
      role="status"
      aria-live="polite"
    >
      <p className={cn('font-neo-body text-sm text-neo-white', event.outcome === 'steal' ? 'text-neo-pink' : 'text-neo-pink')}>
        {label}
      </p>
    </div>
  );
}

export default TreasureChestTicker;
