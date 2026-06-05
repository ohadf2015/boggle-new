'use client';

// Authoritative Blast multiplayer standings scene. Owns first-place + the
// player's own position so the generic ResultsPodium can be suppressed for blast
// (see ResultsPage `hideStandings`) — mirroring the wheel-rush "replace" model.
//
// Composition: a pinned YOUR-POSITION chip (instant "where am I", even off-podium)
// + a crowned winner hero + lean runner-up rows. GSAP entrance is scoped to a ref
// (safe under the desktop/mobile double-mount); the Pixi ember backdrop only spins
// up on the visible, non-reduced-motion instance.

import { memo, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { Bomb, Crown, Sparkles, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import {
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

// Place accent: gold → cyan → pink → purple (then purple for the long tail).
const RANK_ACCENT = ['text-neo-yellow', 'text-neo-cyan', 'text-neo-pink', 'text-neo-purple'];
const accentFor = (rank: number) => RANK_ACCENT[Math.min(rank - 1, RANK_ACCENT.length - 1)];

const BlastMpResults = memo<BlastMpResultsProps>(({ results }) => {
  const { t, dir } = useLanguage();
  const prefersReduced = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);

  const { winner, runnersUp, currentPosition, totalPlayers } = useMemo(
    () => rankBlastMpPlayers(results),
    [results],
  );

  useEffect(() => {
    if (prefersReduced || !sceneRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-winner]', { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(1.6)' });
      const rows = sceneRef.current?.querySelectorAll('[data-row]');
      if (rows && rows.length) {
        tl.from(rows, { y: 16, opacity: 0, duration: 0.35, stagger: 0.07 }, '-=0.15');
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
      className="@container relative overflow-hidden rounded-neo border-3 border-neo-black shadow-hard bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy"
      data-testid="blast-mp-results"
    >
      {!prefersReduced && <BlastSparksCanvas />}

      {/* Header: title + pinned position chip */}
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

      {/* Winner hero */}
      {winner && (
        <div
          data-winner
          className="relative z-10 flex flex-col items-center text-center px-4 pt-1 pb-4"
        >
          <div className="relative">
            <Crown className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 text-neo-yellow drop-shadow-[0_0_8px_rgba(255,225,53,0.7)]" />
            <div className="rounded-full shadow-[0_0_26px_rgba(255,225,53,0.5)]">
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

          <div className="text-3xl font-black text-neo-cyan tabular-nums leading-none mt-0.5 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
            <ScoreCountUp to={winner.score} duration={1300} delay={prefersReduced ? 0 : 250} />
          </div>

          <WinnerMeta player={winner} wordsLabel={t('common.words')} />
        </div>
      )}

      {/* Runner-up rows */}
      {runnersUp.length > 0 && (
        <div className="relative z-10 px-3 pb-3 space-y-1.5">
          {runnersUp.map((player) => (
            <RankRow
              key={player.username}
              player={player}
              wordsLabel={t('common.words')}
              youLabel={t('results.you')}
              clearedLabel={t('blast.mpResults.boardCleared')}
            />
          ))}
        </div>
      )}
    </div>
  );
});

BlastMpResults.displayName = 'BlastMpResults';
export default BlastMpResults;

// ── pieces ───────────────────────────────────────────────────────────────────

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
        <span className="block text-neo-white/50">{label}</span>
      </span>
      <span className="text-lg font-black tabular-nums text-neo-lime leading-none">#{position}</span>
      <span className="text-[10px] font-bold tabular-nums text-neo-white/50 leading-none self-end mb-0.5">
        / {total}
      </span>
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
}: {
  player: RankedBlastPlayer;
  wordsLabel: string;
  youLabel: string;
  clearedLabel: string;
}) {
  const isMe = !!player.isCurrentPlayer;
  return (
    <div
      data-row
      className={cn(
        'flex items-center gap-2.5 rounded-neo border-2 px-2.5 py-2 shadow-hard-sm transition-colors',
        isMe
          ? 'border-neo-lime bg-neo-lime/10 scale-[1.015]'
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
        <div className="text-[9px] uppercase tracking-wider text-neo-white/50 tabular-nums">
          <span className="text-neo-cyan font-black">{player.wordsFoundCount}</span> {wordsLabel}
          {player.boardCleared && <span className="text-neo-yellow ml-1.5">· {clearedLabel}</span>}
        </div>
      </div>
      <span className="text-lg font-black tabular-nums text-neo-white">
        {player.score.toLocaleString()}
      </span>
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
