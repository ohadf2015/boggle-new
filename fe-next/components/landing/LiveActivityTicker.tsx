'use client';

import { memo, useMemo, useState } from 'react';
import { Trophy, Target, Flame, Zap, BookOpen, Star, Sparkles } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import type { ActivityEvent } from '@/app/api/activity/recent/route';

/** Game mode → icon + color (aligned with ModeCard colors) */
const EVENT_CONFIG: Record<ActivityEvent['type'], { icon: typeof Trophy; accent: string; labelKey: string }> = {
  multiplayer_win: { icon: Trophy, accent: 'text-neo-pink', labelKey: 'landing.tickerWon' },
  daily_solved: { icon: Star, accent: 'text-neo-cyan', labelKey: 'landing.tickerDaily' },
  word_hunt_solved: { icon: Target, accent: 'text-neo-orange', labelKey: 'landing.tickerHunt' },
  blast_highscore: { icon: Zap, accent: 'text-neo-yellow', labelKey: 'landing.tickerBlast' },
  long_word: { icon: BookOpen, accent: 'text-neo-lime', labelKey: 'landing.tickerWord' },
  streak: { icon: Flame, accent: 'text-neo-orange', labelKey: 'landing.tickerStreak' },
};

/** Detail template keys per event type */
const DETAIL_KEYS: Record<string, string> = {
  multiplayer_win: 'landing.tickerScored',
  word_hunt_solved: 'landing.tickerCracked',
  blast_highscore: 'landing.tickerCleared',
  long_word: 'landing.tickerFoundLong',
};

/** Fun player names for fallback messages */
const FAKE_NAMES = [
  'WordWizard', 'LetterNinja', 'VowelStorm', 'ComboKing',
  'GridMaster', 'SyllableSam', 'BlastQueen', 'LexiLion',
  'TileHunter', 'WordSmith42', 'AlphaAce', 'SpellCaster',
  'BoggleBoss', 'StreakStar', 'VocabViking', 'PuzzlePro',
];

/** Seeded pseudo-random (stable per session) */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Simple template interpolation: "scored {score} pts" → "scored 42 pts" */
function interpolate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? key));
}

function getTranslatedDetail(
  event: ActivityEvent,
  t: (key: string) => string,
): string {
  const data = event.detailData;
  if (!data) return event.detail;

  if (event.type === 'daily_solved') {
    const key = data.word ? 'landing.tickerFoundWord' : 'landing.tickerScoredPts';
    return interpolate(t(key), data);
  }

  const key = DETAIL_KEYS[event.type];
  if (key) return interpolate(t(key), data);

  return event.detail;
}

function EventPill({ event, isFallback }: { event: ActivityEvent; isFallback?: boolean }) {
  const { t } = useLanguage();
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.long_word;
  const Icon = isFallback ? Sparkles : config.icon;
  const label = t(config.labelKey) || config.labelKey;
  const detail = isFallback ? event.detail : getTranslatedDetail(event, t);

  return (
    <span className="inline-flex items-center gap-1.5 mx-3 shrink-0">
      <span className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-current/20 text-[9px] font-black uppercase tracking-wider',
        config.accent,
      )}>
        <Icon className="w-2.5 h-2.5" aria-hidden="true" />
        {label}
      </span>
      <span className="text-neo-white font-bold text-[11px]">
        {event.playerName}
      </span>
      <span className="text-neo-white/50 text-[11px]">
        {detail}
      </span>
    </span>
  );
}

/**
 * LiveActivityTicker — Horizontal scrolling marquee of recent game events.
 * Always renders: uses fun fallback messages when no real data is available.
 * CSS animation for smooth infinite scroll (GPU-composited translateX).
 */
const LiveActivityTicker = memo(function LiveActivityTicker({ className }: { className?: string }) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const { events, loading } = useLiveActivity();

  // Stable seed per mount (avoids impure Date.now in render)
  const [seed] = useState(() => Math.floor(Date.now() / 60000));

  // Generate fun fallback events when no real data
  const fallbackEvents = useMemo((): ActivityEvent[] => {
    const types: ActivityEvent['type'][] = [
      'multiplayer_win', 'daily_solved', 'blast_highscore',
      'word_hunt_solved', 'long_word', 'streak',
    ];
    const funKeys = Array.from({ length: 12 }, (_, i) => `landing.tickerFun${i + 1}`);
    const shuffledNames = seededShuffle(FAKE_NAMES, seed);
    const shuffledFun = seededShuffle(funKeys, seed + 1);

    return shuffledNames.slice(0, 10).map((name, i) => ({
      type: types[i % types.length],
      playerName: name,
      detail: t(shuffledFun[i % shuffledFun.length]),
      timestamp: new Date().toISOString(),
    }));
  }, [t, seed]);

  const hasRealEvents = events.length > 0;
  const sourceEvents = hasRealEvents ? events : fallbackEvents;

  // Duplicate for seamless loop
  const displayEvents = useMemo(() => {
    if (sourceEvents.length === 0) return [];
    return sourceEvents.length < 6 ? [...sourceEvents, ...sourceEvents] : sourceEvents;
  }, [sourceEvents]);

  if (loading || displayEvents.length === 0) return null;

  const duration = Math.max(30, displayEvents.length * 4);
  const liveLabel = t('landing.tickerLive') || 'LIVE';

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
            <span className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              hasRealEvents ? 'animate-ping bg-red-400' : 'animate-pulse bg-neo-yellow',
            )} />
            <span className={cn(
              'relative inline-flex rounded-full h-1.5 w-1.5',
              hasRealEvents ? 'bg-red-500' : 'bg-neo-yellow',
            )} />
          </span>
          {liveLabel}
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
                <EventPill event={event} isFallback={!hasRealEvents} />
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
