'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Share2, Trophy } from 'lucide-react';
import MpBragCard from '@/components/results/MpBragCard';
import { deriveBragCardData, deriveBragShareText } from '@/lib/results/bragCard';
import { getBragShareUrl, trackShareCompleted } from '@/utils/share';
import { runBragShare } from '@/utils/bragShare';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { Avatar as AvatarType } from '@/types';
import { cn } from '@/lib/utils';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface MpBragStripPlayer {
  name: string;
  avatar?: AvatarType;
  score: number;
}

export interface MpBragInput {
  gameCode?: string;
  gameMode?: string;
  language: string;
  isWinner: boolean;
  rank: number;
  playerCount: number;
  score: number;
  wordsFound: number;
  longestWord?: string;
  maxCombo?: number;
  opponent?: MpBragStripPlayer;
}

export interface MpBragStripProps extends MpBragInput {
  visible: boolean;
  current: MpBragStripPlayer;
  modeLabel: string;
  onChallenge?: () => void;
  /** Runs synchronously on the tap, before the share sheet opens (e.g. pause auto-continue). */
  onShareStart?: () => void;
  className?: string;
  t: TFn;
}

export function useMpBrag(
  { gameCode, gameMode, language, isWinner, rank, playerCount, score, wordsFound, longestWord, maxCombo, opponent }: MpBragInput,
  t: TFn,
) {
  const data = useMemo(
    () =>
      deriveBragCardData({
        gameMode,
        isWinner,
        rank,
        playerCount,
        score,
        wordsFound,
        longestWord,
        maxCombo,
        opponentName: opponent?.name,
        opponentScore: opponent?.score,
        locale: language,
      }),
    [gameMode, isWinner, rank, playerCount, score, wordsFound, longestWord, maxCombo, opponent, language],
  );

  const shareUrl = useMemo(
    () =>
      getBragShareUrl(gameCode, {
        score,
        rival: data.rival?.score ?? null,
        name: data.rival?.name ?? null,
        mode: gameMode ?? null,
        words: wordsFound,
        best: longestWord ?? null,
      }),
    [gameCode, score, data.rival, gameMode, wordsFound, longestWord],
  );

  const cardText = useMemo(() => {
    const { key, params } = deriveBragShareText(data, score);
    return t(key, params);
  }, [data, score, t]);

  const winText = isWinner
    ? data.rival
      ? t('brag2.mp.winText', { score, rival: data.rival.score })
      : t('brag2.mp.winTextSolo', { score })
    : null;
  const shareText = winText ?? cardText;

  const share = useCallback(
    (surface: string) =>
      runBragShare({ text: shareText, url: shareUrl, surface, kind: isWinner ? 'mp_win' : 'mp_result', copiedLabel: t('brag.copied') }),
    [shareText, shareUrl, isWinner, t],
  );

  return { data, shareUrl, shareText, cardText, share };
}

/**
 * Collapsed brag strip + expandable MpBragCard on the NEW MpResultsStage chassis.
 * Impression fires once when the strip becomes visible (IntersectionObserver),
 * matching privacy/no-board-spoiler (scores + names only; no board letters).
 */
export function MpBragStrip({
  visible,
  gameCode,
  gameMode,
  language,
  isWinner,
  current,
  modeLabel,
  onChallenge,
  onShareStart,
  className,
  t,
  ...rest
}: MpBragStripProps) {
  const [expanded, setExpanded] = useState(false);
  const impressed = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { data, shareUrl, cardText, share } = useMpBrag({ gameCode, gameMode, language, isWinner, ...rest }, t);
  const { score } = rest;

  const scoreline = data.rival ? `${score} - ${data.rival.score}` : `${score}`;

  useEffect(() => {
    if (!visible || impressed.current) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // SSR / no IO — fire once when parent marks visible.
      impressed.current = true;
      trackGrowthEvent('mp_brag_card_viewed', {
        gameMode: gameMode ?? 'unknown',
        outcome: data.outcome,
        language,
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (impressed.current) return;
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.25)) {
          impressed.current = true;
          trackGrowthEvent('mp_brag_card_viewed', {
            gameMode: gameMode ?? 'unknown',
            outcome: data.outcome,
            language,
          });
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, gameMode, data.outcome, language]);

  const handleExpand = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      if (!v) {
        trackGrowthEvent('mp_brag_card_expanded', {
          gameMode: gameMode ?? 'unknown',
          outcome: data.outcome,
          language,
        });
      }
      return next;
    });
  }, [gameMode, data.outcome, language]);

  const handleShare = useCallback(() => {
    onShareStart?.();
    void share('mp_brag_strip').then((result) => {
      if (result !== 'copied') return;
      trackGrowthEvent('mp_brag_card_copy_link', {
        gameMode: gameMode ?? 'unknown',
        outcome: data.outcome,
        language,
        hasRoomLink: !!gameCode,
        surface: 'strip',
      });
    });
  }, [onShareStart, share, gameMode, data.outcome, language, gameCode]);

  if (!visible) return null;

  return (
    <div ref={rootRef} data-testid="mp-brag-strip" className={cn('w-full space-y-2', className)}>
      <div className="w-full flex items-center gap-2">
        <button
          type="button"
          onClick={handleExpand}
          className="flex-1 min-w-0 flex items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2 font-neo-body font-bold text-sm text-neo-white shadow-hard-sm"
          aria-expanded={expanded}
        >
          <Share2 className="w-4 h-4 text-neo-pink shrink-0" aria-hidden="true" />
          <span className="truncate">{t('brag.strip')}</span>
          <span className="font-bold tabular-nums text-neo-lime shrink-0">{scoreline}</span>
          {expanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
        </button>
        <button
          type="button"
          onClick={handleShare}
          data-testid="mp-brag-strip-copy"
          className={cn(
            'shrink-0 flex items-center gap-1.5 border-2 border-neo-black rounded-neo font-neo-body font-bold',
            isWinner
              ? 'py-2.5 px-4 bg-neo-lime text-neo-black text-base uppercase shadow-hard motion-safe:animate-mp-bump active:translate-y-0.5 active:shadow-none'
              : 'py-2 px-3 bg-neo-pink text-neo-white text-sm shadow-hard-sm',
          )}
        >
          {isWinner ? <Trophy className="w-5 h-5" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
          <span>{isWinner ? t('brag2.mp.bragButton') : t('brag.share')}</span>
        </button>
      </div>
      {expanded && (
        <MpBragCard
          data={data}
          current={current}
          opponent={rest.opponent}
          modeLabel={modeLabel}
          shareUrl={shareUrl}
          shareText={cardText}
          onCopyLink={() =>
            trackGrowthEvent('mp_brag_card_copy_link', {
              gameMode: gameMode ?? 'unknown',
              outcome: data.outcome,
              language,
              hasRoomLink: !!gameCode,
            })
          }
          onNativeShare={() => {
            trackGrowthEvent('mp_brag_card_native_share', {
              gameMode: gameMode ?? 'unknown',
              outcome: data.outcome,
              language,
              hasRoomLink: !!gameCode,
            });
            trackShareCompleted('web_share_api', { surface: 'mp_brag_card' });
          }}
          onChallenge={onChallenge}
          t={t}
        />
      )}
    </div>
  );
}

export default MpBragStrip;
