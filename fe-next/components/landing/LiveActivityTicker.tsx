'use client';

import { memo, useMemo } from 'react';
import { Trophy, Target, Flame, Zap, BookOpen, Star } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import type { ActivityEvent } from '@/app/api/activity/recent/route';

/** Event type → icon + accent color */
const EVENT_CONFIG: Record<ActivityEvent['type'], { icon: typeof Trophy; accent: string; label: string }> = {
  multiplayer_win: { icon: Trophy, accent: 'text-neo-yellow', label: 'WON' },
  daily_solved: { icon: Star, accent: 'text-neo-cyan', label: 'DAILY' },
  word_hunt_solved: { icon: Target, accent: 'text-neo-pink', label: 'HUNT' },
  blast_highscore: { icon: Zap, accent: 'text-neo-orange', label: 'BLAST' },
  long_word: { icon: BookOpen, accent: 'text-neo-lime', label: 'WORD' },
  streak: { icon: Flame, accent: 'text-neo-yellow', label: 'STREAK' },
};

function EventPill({ event }: { event: ActivityEvent }) {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.long_word;
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 mx-3 shrink-0">
      {/* Mode badge */}
      <span className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-current/20 text-[9px] font-black uppercase tracking-wider',
        config.accent,
      )}>
        <Icon className="w-2.5 h-2.5" aria-hidden="true" />
        {config.label}
      </span>
      {/* Player name */}
      <span className="text-neo-white font-bold text-[11px]">
        {event.playerName}
      </span>
      {/* Detail */}
      <span className="text-neo-white/50 text-[11px]">
        {event.detail}
      </span>
    </span>
  );
}

/**
 * LiveActivityTicker — Horizontal scrolling marquee of recent game events.
 * Designed as a thin broadcast bar, inspired by esports tickers and news crawls.
 * Uses CSS animation for smooth infinite scroll (GPU-composited translateX).
 */
const LiveActivityTicker = memo(function LiveActivityTicker({ className }: { className?: string }) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const { events, loading } = useLiveActivity();

  // Duplicate events for seamless loop
  const displayEvents = useMemo(() => {
    if (events.length === 0) return [];
    // Ensure enough items for seamless scroll — duplicate if < 6
    const items = events.length < 6 ? [...events, ...events] : events;
    return items;
  }, [events]);

  if (loading || displayEvents.length === 0) return null;

  const duration = Math.max(30, displayEvents.length * 4);

  return (
    <div
      className={cn(
        'w-full max-w-4xl mx-auto xl:max-w-5xl overflow-hidden relative',
        'border-y border-neo-white/10',
        className,
      )}
      role="marquee"
      aria-label={t('landing.liveActivity') || 'Live game activity'}
    >
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-neo-navy to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-neo-navy to-transparent z-10 pointer-events-none" />

      {/* LIVE indicator */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-2 bg-neo-navy pr-4">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-neo-white/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          LIVE
        </span>
      </div>

      {/* Scrolling content */}
      <div
        className={cn(
          'inline-flex whitespace-nowrap py-2 pl-16',
          reducedMotion && 'overflow-x-auto',
        )}
        style={!reducedMotion ? {
          animation: `activity-ticker-scroll ${duration}s linear infinite`,
        } : undefined}
      >
        {/* Render twice for seamless loop */}
        {[0, 1].map((copy) => (
          <span key={copy} className="inline-flex">
            {displayEvents.map((event, i) => (
              <span key={`${copy}-${i}`} className="inline-flex items-center">
                <EventPill event={event} />
                <span className="text-neo-white/15 text-xs mx-1" aria-hidden="true">/</span>
              </span>
            ))}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes activity-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
});

export { LiveActivityTicker };
