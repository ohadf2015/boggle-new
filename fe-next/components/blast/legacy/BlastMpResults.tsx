'use client';

// Blast MP standings: owns first place + the player's position, so the generic podium is hidden for blast.

import { memo, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { Bomb, Crown, Sparkles, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { BonusChip, CategoryAwards, CollectionCounts } from '../results/BlastMpCollection';
import type { BlastTranslate } from '../results/types';
import {
  pickBlastCategoryWinners,
  rankBlastMpPlayers,
  type BlastMpPlayerResult,
  type RankedBlastPlayer,
} from './blastMpRanking';

export { buildBlastMpResults } from './blastMpRanking';
export type { BlastMpPlayerResult } from './blastMpRanking';

const BlastSparksCanvas = dynamic(() => import('./BlastSparksCanvas'), { ssr: false });

interface BlastMpResultsProps {
  results: BlastMpPlayerResult[];
  gameMode: string;
}

const RANK_ACCENT = ['text-neo-yellow', 'text-neo-cyan', 'text-neo-pink', 'text-neo-purple'];
const accentFor = (rank: number) => RANK_ACCENT[Math.min(rank - 1, RANK_ACCENT.length - 1)];

const BlastMpResults = memo<BlastMpResultsProps>(({ results }) => {
  const { t, dir } = useLanguage();
  const prefersReduced = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);

  const { ranked, winner, runnersUp, currentPosition, totalPlayers } = useMemo(
    () => rankBlastMpPlayers(results),
    [results],
  );
  const awards = useMemo(() => pickBlastCategoryWinners(ranked), [ranked]);

  useEffect(() => {
    if (prefersReduced || !sceneRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-winner]', { scale: 0.6, duration: 0.5, ease: 'back.out(1.6)' });
      const rows = sceneRef.current?.querySelectorAll('[data-row]');
      if (rows && rows.length) {
        tl.from(rows, { y: 16, duration: 0.35, stagger: 0.07 }, '-=0.15');
      }
      const bonuses = sceneRef.current?.querySelectorAll('[data-bonus]');
      if (bonuses && bonuses.length) {
        tl.from(bonuses, { scale: 0, y: -14, duration: 0.3, ease: 'back.out(3)', stagger: 0.08 })
          .to(bonuses, { x: 10, y: 4, scale: 0.85, duration: 0.18, ease: 'power2.in', yoyo: true, repeat: 1, stagger: 0.08 })
          .fromTo('[data-total]', { scale: 1.18 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', stagger: 0.08 }, '<0.18');
      }
      const awardEls = sceneRef.current?.querySelectorAll('[data-award]');
      if (awardEls && awardEls.length) {
        tl.from(awardEls, { scale: 0, rotation: -12, duration: 0.4, ease: 'back.out(2.5)', stagger: 0.1 });
      }
    }, sceneRef);
    return () => ctx.revert();
  }, [prefersReduced, results]);

  if (results.length === 0) {
    return (
      <div className="text-center py-6 text-neo-white/60 text-sm">
        {t('mpModeBreakdown.emptyState')}
      </div>
    );
  }

  return (
    <div
      ref={sceneRef}
      dir={dir}
      className="@container relative overflow-hidden rounded-neo border-3 border-neo-black shadow-hard bg-neo-navy"
      data-testid="blast-mp-results"
    >
      {!prefersReduced && <BlastSparksCanvas />}

      <div className="relative z-10 flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <Bomb className="w-4 h-4 text-neo-pink" />
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-neo-white">
            {t('blast.results.sceneTitle')}
          </h3>
        </div>
        {currentPosition !== null && (
          <PositionChip
            position={currentPosition}
            total={totalPlayers}
            label={t('blast.mpResults.yourPosition')}
            youLabel={t('results.you')}
          />
        )}
      </div>

      {winner && (
        <div
          data-winner
          className="relative z-10 flex flex-col items-center text-center px-4 pt-1 pb-4"
        >
          <div className="relative">
            <Crown className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 text-neo-yellow fill-neo-yellow drop-shadow-[2px_2px_0_rgb(var(--neo-black))]" />
            <div className="rounded-full ring-4 ring-neo-yellow">
              <Avatar
                customAvatar={winner.avatar?.customAvatar ?? null}
                userId={winner.username}
                size="xl"
                mode="multiplayer"
              />
            </div>
            {winner.boardCleared && <BoardClearedBadge label={t('blast.mpResults.boardCleared')} />}
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-neo-yellow" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neo-yellow">
              {t('blast.mpResults.champion')}
            </span>
          </div>

          <div
            className={cn(
              'mt-0.5 text-base font-black truncate max-w-[220px]',
              winner.isCurrentPlayer
                ? 'text-neo-white underline decoration-neo-lime decoration-2 underline-offset-2'
                : 'text-neo-white',
            )}
          >
            {winner.username}
            {winner.isCurrentPlayer && <YouTag label={t('results.you')} />}
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <div data-total className="text-3xl font-black text-neo-cyan tabular-nums leading-none [text-shadow:3px_3px_0_rgb(var(--neo-black))]">
              <ScoreCountUp to={winner.score} duration={1300} delay={prefersReduced ? 0 : 250} />
            </div>
            <BonusChip player={winner} t={t} />
          </div>

          <WinnerMeta player={winner} wordsLabel={t('common.words')} />
          <CollectionCounts player={winner} className="mt-1 text-xs" />
        </div>
      )}

      <CategoryAwards winners={awards} t={t} />

      {runnersUp.length > 0 && (
        <div className="relative z-10 px-3 pb-3 space-y-1.5">
          {runnersUp.map((player) => (
            <RankRow
              key={player.username}
              player={player}
              wordsLabel={t('common.words')}
              youLabel={t('results.you')}
              clearedLabel={t('blast.mpResults.boardCleared')}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
});

BlastMpResults.displayName = 'BlastMpResults';
export default BlastMpResults;

function PositionChip({
  position,
  total,
  label,
  youLabel,
}: {
  position: number;
  total: number;
  label: string;
  youLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-neo border-2 border-neo-lime/70 bg-neo-lime/10 px-2 py-1">
      <span className="text-[8px] font-black uppercase tracking-wider text-neo-lime leading-none">
        {youLabel}
        <span className="block text-neo-white/60">{label}</span>
      </span>
      <bdi className="flex items-end gap-1 leading-none">
        <span className="text-lg font-black tabular-nums text-neo-lime">#{position}</span>
        <span className="text-[10px] font-bold tabular-nums text-neo-white/60 mb-0.5">/ {total}</span>
      </bdi>
    </div>
  );
}

function WinnerMeta({ player, wordsLabel }: { player: RankedBlastPlayer; wordsLabel: string }) {
  return (
    <div className="mt-1.5 flex items-center justify-center gap-3 text-[10px] uppercase tracking-wider text-neo-white/70">
      <span className="tabular-nums">
        <span className="text-neo-cyan font-black">{player.wordsFoundCount}</span> {wordsLabel}
      </span>
      {player.bestWord && (
        <span className="font-black text-neo-lime normal-case tracking-normal">
          {player.bestWord.toUpperCase()}
        </span>
      )}
      {!!player.maxCombo && player.maxCombo > 0 && (
        <span className="flex items-center gap-0.5 text-neo-orange font-black tabular-nums">
          <Zap className="w-3 h-3" />
          {player.maxCombo}x
        </span>
      )}
    </div>
  );
}

function RankRow({
  player,
  wordsLabel,
  youLabel,
  clearedLabel,
  t,
}: {
  player: RankedBlastPlayer;
  wordsLabel: string;
  youLabel: string;
  clearedLabel: string;
  t: BlastTranslate;
}) {
  const isMe = !!player.isCurrentPlayer;
  return (
    <div
      data-row
      className={cn(
        'flex items-center gap-2.5 rounded-neo border-2 px-2.5 py-2 shadow-hard-sm transition-colors',
        isMe
          ? 'border-neo-lime bg-neo-lime/10'
          : 'border-neo-black/50 bg-neo-navy/70',
      )}
    >
      <span className={cn('text-base font-black tabular-nums w-7 text-center', accentFor(player.rank))}>
        #{player.rank}
      </span>
      <Avatar
        customAvatar={player.avatar?.customAvatar ?? null}
        userId={player.username}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-neo-white truncate">{player.username}</span>
          {isMe && <YouTag label={youLabel} />}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-neo-white/60 tabular-nums">
          <span className="text-neo-cyan font-black">{player.wordsFoundCount}</span> {wordsLabel}
          {player.boardCleared && <span className="text-neo-yellow ms-1.5">· {clearedLabel}</span>}
        </div>
        <CollectionCounts player={player} className="text-[11px]" />
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span data-total className="text-lg font-black tabular-nums text-neo-white">
          {player.score.toLocaleString()}
        </span>
        <BonusChip player={player} t={t} />
      </div>
    </div>
  );
}

function YouTag({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded bg-neo-lime px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-neo-black">
      {label}
    </span>
  );
}

function BoardClearedBadge({ label }: { label: string }) {
  return (
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-neo bg-neo-yellow px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-neo-black shadow-hard-sm">
      {label}
    </div>
  );
}
