/**
 * End sticker: the class cleared the list.
 *
 * Renders INSIDE the existing shell (HUD + tools strip stay put), so it is not
 * a lazy-mounted fullscreen layer — no entrance opacity tween on the card
 * itself (Class-5); only the small mascot pops. Confetti + the victory stinger
 * are fired once by `useUnpluggedRun`, never from here.
 */
'use client';

import { RotateCcw, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnpluggedMascot } from './UnpluggedMascot';

export interface UnpluggedFinishCardProps {
  headline: string;
  subline: string;
  perfect: boolean;
  cleared: number;
  total: number;
  bestStreak: number;
  score: number;
  labels: {
    clearedLabel: string;
    streakLabel: string;
    scoreLabel: string;
    playAgain: string;
    mascotAlt: string;
    perfectBadge: string;
  };
  reducedMotion?: boolean;
  onReplay: () => void;
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: 'lime' | 'orange' | 'yellow';
}) {
  const toneClass =
    tone === 'lime'
      ? 'bg-neo-lime text-neo-black'
      : tone === 'orange'
        ? 'bg-neo-orange text-neo-black'
        : 'bg-neo-yellow text-neo-black';
  return (
    <div
      className={cn(
        // `border-[3px]`, never `border-neo-thick`: inside cn() the width and the
        // colour collapse into one twMerge group and the width is dropped.
        'flex-1 min-w-0 px-2 sm:px-4 py-2 sm:py-3 rounded-neo border-[3px] border-neo-black shadow-hard text-center',
        toneClass,
      )}
    >
      <span className="block font-neo-display font-bold leading-none tabular-nums text-[clamp(1.4rem,4vw,3.5rem)]">
        {value}
      </span>
      <span className="block mt-1 font-neo-body font-bold uppercase tracking-widest leading-tight text-[clamp(0.5rem,0.9vw,0.8rem)]">
        {label}
      </span>
    </div>
  );
}

export function UnpluggedFinishCard({
  headline,
  subline,
  perfect,
  cleared,
  total,
  bestStreak,
  score,
  labels,
  reducedMotion = false,
  onReplay,
}: UnpluggedFinishCardProps) {
  return (
    <div
      data-testid="unplugged-finish"
      data-perfect={String(perfect)}
      className={cn(
        'flex-1 min-h-0 flex flex-col items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 py-3',
        'rounded-neo border-[3px] border-neo-black bg-neo-navy-light shadow-hard overflow-hidden',
      )}
    >
      <UnpluggedMascot
        mood="celebration"
        alt={labels.mascotAlt}
        animate={!reducedMotion}
        priority
        sizes="(max-width: 640px) 160px, 250px"
        className="w-[clamp(96px,22vh,250px)] h-[clamp(96px,22vh,250px)]"
      />

      {perfect ? (
        <span className="flex items-center gap-1 px-3 py-1 rounded-neo border-neo border-neo-black bg-neo-yellow text-neo-black font-neo-display font-bold uppercase tracking-widest text-[clamp(0.6rem,1.1vw,0.95rem)] shadow-hard-sm">
          <Star className="w-4 h-4" aria-hidden />
          {labels.perfectBadge}
        </span>
      ) : null}

      <h2 className="font-neo-display font-bold text-neo-white text-center leading-none text-[clamp(1.6rem,5vw,4.5rem)]">
        {headline}
      </h2>
      <p className="font-neo-body text-neo-white/70 text-center text-[clamp(0.75rem,1.3vw,1.2rem)] max-w-[48ch]">
        {subline}
      </p>

      <div className="w-full max-w-3xl flex gap-2 sm:gap-4">
        <Stat value={`${cleared}/${total}`} label={labels.clearedLabel} tone="lime" />
        <Stat value={String(bestStreak)} label={labels.streakLabel} tone="orange" />
        <Stat value={String(score)} label={labels.scoreLabel} tone="yellow" />
      </div>

      <button
        type="button"
        data-testid="unplugged-play-again"
        onClick={onReplay}
        className="w-full max-w-md flex items-center justify-center gap-2 py-3 sm:py-4 font-neo-display font-bold uppercase text-[clamp(1rem,2vw,1.6rem)] bg-neo-pink text-neo-black border-neo border-neo-black rounded-neo shadow-hard active:shadow-hard-pressed active:translate-y-[1px]"
      >
        <RotateCcw className="w-5 h-5 sm:w-7 sm:h-7" aria-hidden />
        {labels.playAgain}
      </button>
    </div>
  );
}
