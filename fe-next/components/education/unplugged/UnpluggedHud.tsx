/**
 * Projector HUD strip: who we are, where we are, what the class has banked.
 *
 * Fixed-height (never scrolls, never wraps into the word stage). Score and
 * streak are the two numbers a back-row student must be able to read.
 */
'use client';

import Link from 'next/link';
import { ArrowLeft, Flame, Volume2, VolumeX } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { UnpluggedMascot, type UnpluggedMood } from './UnpluggedMascot';

export interface UnpluggedHudProps {
  lesson: string;
  teacher?: string;
  progressLabel: string;
  scoreLabel: string;
  score: number;
  streak: number;
  streakLabel: string;
  mood: UnpluggedMood;
  mascotAlt: string;
  homeHref: string;
  exitLabel: string;
  muted: boolean;
  muteLabel: string;
  onToggleMute: () => void;
  reducedMotion?: boolean;
}

export function UnpluggedHud({
  lesson,
  teacher,
  progressLabel,
  scoreLabel,
  score,
  streak,
  streakLabel,
  mood,
  mascotAlt,
  homeHref,
  exitLabel,
  muted,
  muteLabel,
  onToggleMute,
  reducedMotion = false,
}: UnpluggedHudProps) {
  const onFire = streak >= 3;

  return (
    <header
      data-testid="unplugged-hud"
      className="shrink-0 flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b-neo border-neo-black bg-neo-navy-light"
    >
      <Link
        href={homeHref}
        aria-label={exitLabel}
        title={exitLabel}
        data-testid="unplugged-exit"
        // Cream edge, not black: a black border on this navy-light header scores
        // ~1.2:1 and the control disappears (DESIGN-ADDENDUM). `border-[3px]`,
        // not `border-neo` — see the BTN note in UnpluggedStage.
        className="shrink-0 grid place-items-center w-9 h-9 sm:w-11 sm:h-11 rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-cream shadow-hard-sm"
      >
        <DirectionalIcon icon={ArrowLeft} className="w-4 h-4 sm:w-5 sm:h-5" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate font-neo-display font-bold text-neo-white text-[clamp(0.85rem,1.6vw,1.5rem)] leading-tight">
          {lesson}
        </p>
        <p className="truncate font-neo-body text-neo-cyan font-bold text-[clamp(0.6rem,1vw,0.95rem)]">
          {progressLabel}
          {teacher ? <span className="text-neo-white/50"> · {teacher}</span> : null}
        </p>
      </div>

      <div
        data-testid="unplugged-streak"
        data-streak={streak}
        className={cn(
          'shrink-0 flex items-center gap-1 px-2 sm:px-3 py-1 rounded-neo shadow-hard-sm',
          onFire
            ? 'border-[3px] border-neo-black bg-neo-orange text-neo-black'
            : 'border-[3px] border-neo-cream bg-neo-navy text-neo-cream',
        )}
      >
        <Flame
          className={cn('w-4 h-4 sm:w-5 sm:h-5', onFire && !reducedMotion && 'animate-neo-wobble')}
          aria-hidden
        />
        <span className="font-neo-display font-bold text-[clamp(0.9rem,1.8vw,1.6rem)] tabular-nums">
          {streak}
        </span>
        <span className="sr-only">{streakLabel}</span>
      </div>

      <div
        data-testid="unplugged-score"
        className="shrink-0 px-2 sm:px-4 py-1 rounded-neo border-[3px] border-neo-black bg-neo-lime text-neo-black shadow-hard-sm text-center"
      >
        <span className="block font-neo-body font-bold uppercase tracking-widest text-[clamp(0.4rem,0.7vw,0.65rem)] leading-none">
          {scoreLabel}
        </span>
        <span className="block font-neo-display font-bold tabular-nums leading-none text-[clamp(1.1rem,2.4vw,2.2rem)]">
          {score}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muteLabel}
        title={muteLabel}
        data-testid="unplugged-mute"
        className="shrink-0 grid place-items-center w-9 h-9 sm:w-11 sm:h-11 rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-cream shadow-hard-sm"
      >
        {muted ? (
          <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
        ) : (
          <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
        )}
      </button>

      <UnpluggedMascot
        mood={mood}
        alt={mascotAlt}
        animate={!reducedMotion}
        priority
        sizes="(max-width: 640px) 44px, 72px"
        className="w-11 h-11 sm:w-[72px] sm:h-[72px]"
      />
    </header>
  );
}
