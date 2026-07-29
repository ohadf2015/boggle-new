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
      className="relative bg-neo-navy-light overflow-hidden mb-4 border-3 border-neo-black rounded-neo shadow-hard-lg p-5"
    >
      {/* Gold halftone ribbon — top edge (matches the profile section language) */}
      <div className="absolute top-0 inset-x-0 h-2.5 bg-neo-yellow">
        <div className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" aria-hidden />
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h2 className="text-2xl font-black font-neo-display uppercase tracking-tight flex items-center gap-2.5 text-neo-white">
          <span className="w-10 h-10 flex items-center justify-center bg-neo-yellow text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm">
            <Trophy strokeWidth={2.75} className="w-5 h-5" />
          </span>
          {t('rank.seasonTitle')}
        </h2>
        {rank ? <RankTierChip tier={rank.tierId} size="sm" /> : null}
      </div>

      <div className="mt-4">
        {rank ? (
          <div className="flex items-baseline gap-2">
            <span
              ref={numberRef}
              className="font-neo-display font-black text-4xl text-neo-yellow tabular-nums leading-none"
            >
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
    </div>
  );
}
