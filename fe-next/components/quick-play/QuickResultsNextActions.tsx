'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { ResultsNextBar } from '@/components/results/stage/ResultsNextBar';
import { PressSurface } from '@/components/motion/PressSurface';
import { ModeGlyph } from './ModeGlyph';
import { NODE_COLORS } from './modeColors';
import { QUICK_MODES, type QuickMode } from './types';
import type { WheelSelection } from './wheelGeometry';

/**
 * The one primary action, pinned under the scrolling results. "Spin next round"
 * spins: it deals a random round right away. It used to call onNextRound() with
 * no mode, which the hub ignores outside a live round (its guard against stale
 * board quits) — the button did nothing.
 */
export function QuickResultsCtaBar({
  currentMode,
  onNextRound,
  onChallenge,
  shine,
}: {
  /** The mode just played; when given, the next-mode chips pin above the button. */
  currentMode?: QuickMode;
  onNextRound: (mode?: WheelSelection) => void;
  /** Resolves with the share outcome so the bar can confirm a copy. */
  onChallenge: () => Promise<unknown> | void;
  shine: boolean;
  /** Accepted so existing callers keep compiling. Guests share a seeded board too. */
  isGuest?: boolean;
}) {
  const { t } = useLanguage();
  const [shareNote, setShareNote] = useState<'copied' | 'failed' | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  const handleShare = useCallback(async () => {
    const outcome = await onChallenge();
    const next = outcome === 'copied' || outcome === 'failed' ? outcome : null;
    setShareNote(next);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    if (next) clearTimer.current = setTimeout(() => setShareNote(null), 2500);
  }, [onChallenge]);

  const ShareIcon = shareNote === 'copied' ? Check : Swords;
  const note = shareNote === 'copied' ? t('quickPlay.solo.copied') : shareNote === 'failed' ? t('quickPlay.solo.shareFailed') : '';
  return (
    <ResultsNextBar
      testId="quick-results-cta-bar"
      shine={shine}
      clearAdBand
      top={currentMode ? <QuickResultsModeSwitch currentMode={currentMode} onNextRound={onNextRound} compact /> : undefined}
      primary={{
        // Straight to a fresh board in the SAME mode: no menu, no spin. The mode
        // chips above stay for a switch; Random is one of them.
        label: currentMode ? t('quickLoop.nextBoard') : t('quickPlay.solo.nextRound'),
        onClick: () => {
          posthog.capture('next_board_click', { mode: currentMode ?? 'random', source: 'quick_results' });
          onNextRound(currentMode ?? 'random');
        },
        testId: 'quick-results-next',
      }}
      secondary={{
        label: t('quickPlay.solo.challengeFriend'),
        shortLabel: t('quickPlay.solo.challengeShort'),
        title: t('quickPlay.solo.challengeHint'),
        onClick: () => void handleShare(),
        testId: 'quick-results-challenge',
        icon: <ShareIcon className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />,
        note,
      }}
    />
  );
}

/**
 * Pick the next round's mode. `compact` is the row pinned in the bottom bar
 * (always on screen, above the tab bar and the ad band); the card form is kept
 * for any caller that lists it in a scrolling column.
 */
export function QuickResultsModeSwitch({
  currentMode,
  onNextRound,
  compact = false,
}: {
  currentMode: QuickMode;
  onNextRound: (mode?: WheelSelection) => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const caption = t('quickPlay.solo.pickNextMode', 'Next round');
  return (
    <div
      role="group"
      aria-label={caption}
      className={
        compact
          ? 'flex flex-col gap-1.5'
          : 'flex flex-col gap-2.5 rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-3 shadow-hard'
      }
      data-testid="quick-next-mode-picker"
    >
      {!compact && (
        <span className="font-neo-display text-[10px] uppercase tracking-[0.18em] text-neo-white/55">{caption}</span>
      )}
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {QUICK_MODES.map((mode) => {
          const isCurrent = mode === currentMode;
          // NEXT BOARD already replays the current mode.
          if (isCurrent && compact) return null;
          return (
            <PressSurface
              key={mode}
              lip={2}
              data-testid={`quick-next-mode-${mode}`}
              data-current={isCurrent || undefined}
              onClick={() => onNextRound(mode)}
              className={
                compact
                  ? `relative flex h-11 min-w-0 flex-row items-center justify-center gap-1.5 rounded-xl border-2 border-neo-white/25 bg-neo-navy-elevated px-1 shadow-neo-white/20 font-neo-display text-xs font-bold tracking-wide ${NODE_COLORS[mode].text}`
                  : `relative flex h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border-[3px] border-black px-1 font-neo-display text-[11px] font-bold tracking-wide text-black ${NODE_COLORS[mode].bg}`
              }
            >
              {isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 end-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-neo-white text-black"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              <ModeGlyph mode={mode} size={compact ? 16 : 20} />
              <span className="min-w-0 truncate">{t(`quickPlay.solo.mode.${mode}`)}</span>
            </PressSurface>
          );
        })}
      </div>
    </div>
  );
}
