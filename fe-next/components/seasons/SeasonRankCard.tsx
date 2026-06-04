'use client';

import React, { useRef } from 'react';
import { Trophy } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { trpc } from '@/lib/trpc';
import { RankTierChip } from './RankTierChip';

/**
 * Current-season standing for any player: "#42 of 1,204 · Gold".
 * Self-contained — reads leaderboard.getCurrentSeasonRank (tier included).
 * Renders an "Unranked" prompt when the player has no current-season entry.
 *
 * Motion: a finite entrance + a count-up on the rank number, gated on
 * prefers-reduced-motion. The number is rendered in JSX so it is correct
 * server-side / under reduced motion; GSAP only overwrites it while animating.
 */
export function SeasonRankCard({ playerId }: { playerId: string }) {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  const q = trpc.leaderboard.getCurrentSeasonRank.useQuery(
    { playerId },
    { staleTime: 60_000, retry: false },
  );
  const rank = q.data?.data ?? null;

  useGSAP(
    () => {
      if (reduced || !containerRef.current) return;
      gsap.from(containerRef.current, { autoAlpha: 0, y: 12, duration: 0.4, ease: 'power2.out' });
      if (rank && numberRef.current) {
        const el = numberRef.current;
        const counter = { v: 0 };
        gsap.to(counter, {
          v: rank.rankPosition,
          duration: 0.8,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = `#${Math.round(counter.v).toLocaleString()}`;
          },
        });
      }
    },
    { scope: containerRef, dependencies: [reduced, rank?.rankPosition] },
  );

  return (
    <div
      ref={containerRef}
      className="rounded-neo-xl p-5 bg-neo-navy-light border-2 border-black shadow-hard-lg"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-2 font-neo-display text-neo-white uppercase text-sm tracking-wide">
          <Trophy className="w-4 h-4 text-neo-yellow" />
          {t('rank.seasonTitle')}
        </span>
        {rank ? <RankTierChip tier={rank.tierId} size="sm" /> : null}
      </div>

      {rank ? (
        <div className="flex items-baseline gap-2">
          <span ref={numberRef} className="font-neo-display text-3xl text-neo-yellow">
            #{rank.rankPosition.toLocaleString()}
          </span>
          <span className="font-neo-body text-sm text-neo-white">
            {t('rank.ofPlayers').replace('{count}', rank.totalPlayers.toLocaleString())}
          </span>
        </div>
      ) : (
        <p className="font-neo-body text-sm text-neo-white/80">{t('rank.unranked')}</p>
      )}
    </div>
  );
}
