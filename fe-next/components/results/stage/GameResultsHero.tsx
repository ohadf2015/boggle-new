'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import useReducedMotion from '@/hooks/useReducedMotion';
import { useHeroCheer } from '@/lib/quickPlay/useHeroCheer';
import { ResultsAvatarStage, type ResultsAvatar } from './ResultsAvatarStage';
import { ResultsStatCards, TONE_BAND, type ResultsStatItem, type ResultsTone } from './ResultsStatCards';

export interface ResultsBadge {
  key: string;
  label: string;
  tone: ResultsTone;
}

interface GameResultsHeroProps {
  title: string;
  subtitle?: ReactNode;
  avatar: ResultsAvatar;
  /** Ray colour: the mode's accent. */
  accentHex: string;
  /** False for a scoreless round: no confetti, the avatar stays calm. */
  cheering: boolean;
  /** Bigger moments (a win, a record) get a fuller burst. */
  bigMoment?: boolean;
  badges?: ResultsBadge[];
  stats: ResultsStatItem[];
  /** Rewards row, goal line, anything that belongs with the numbers. */
  children?: ReactNode;
  /** Move focus to the heading on mount (screens that replace the board). */
  focusHeading?: boolean;
  className?: string;
}

const BADGE_TILT = ['-rotate-2', 'rotate-1', 'rotate-0'];

export function GameResultsHero({
  title,
  subtitle,
  avatar,
  accentHex,
  cheering,
  bigMoment = false,
  badges = [],
  stats,
  children,
  focusHeading = false,
  className = '',
}: GameResultsHeroProps) {
  const animate = !useReducedMotion();
  const mood = useHeroCheer(cheering, animate);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  return (
    <section
      className={`relative mx-auto flex w-full max-w-xl flex-col items-center gap-3 lg:max-w-3xl lg:gap-4 ${className}`}
      data-testid="game-results-hero"
    >
      <ResultsAvatarStage
        avatar={avatar}
        mood={mood}
        accentHex={accentHex}
        animate={animate}
        cheering={cheering}
        confettiCount={bigMoment ? 16 : 10}
        hopping={animate && mood === 'win' && bigMoment}
      />

      <div className="relative z-10 flex flex-col items-center gap-1 text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-neo-display text-[32px] font-bold leading-tight text-neo-yellow outline-none! [text-shadow:0_3px_0_#000] lg:text-5xl"
        >
          {title}
        </h1>
        {subtitle && <p className="text-sm font-semibold text-neo-white/70">{subtitle}</p>}
      </div>

      {badges.length > 0 && (
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2">
          {badges.map((b, i) => (
            <span
              key={b.key}
              data-testid={`results-badge-${b.key}`}
              className={`animate-neo-pop rounded-xl border-[3px] border-black px-3 py-1 font-neo-display text-xs font-bold tracking-wide text-black shadow-hard ${
                TONE_BAND[b.tone]
              } ${BADGE_TILT[i % BADGE_TILT.length]}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}

      <ResultsStatCards items={stats} animate={animate} />
      {children}
    </section>
  );
}
