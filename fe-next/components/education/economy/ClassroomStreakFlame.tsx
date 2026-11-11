'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { MpComboMeter } from '@/components/multiplayer/round/MpComboMeter';
import { useLanguage } from '@/contexts/LanguageContext';
import { isClassroomStudentPlay } from '@/lib/education/classroomPlaySurface';
import { cn } from '@/lib/utils';
import { ROUND_BAR_KEYFRAMES } from '@/components/education/live/roundBarStyles';
import { claimHudFlame, flameTier, useEconomyStreakStore } from './streakFlame';

const ICON_SIZE = ['', 'size-4', 'size-5', 'size-6'] as const;
const TONE = [
  '',
  'border-neo-cream/50 bg-neo-navy-light text-neo-cream',
  'border-neo-black bg-neo-orange text-neo-black',
  'border-neo-black bg-neo-pink text-neo-black shadow-hard-sm',
] as const;

/** The class streak as a flame that grows: small from the first word, hot at 3, blazing at 6. */
export function StreakFlame({ streak, multiplier, compact = false, className }: { streak: number; multiplier: number; compact?: boolean; className?: string }) {
  const { t } = useLanguage();
  const tier = flameTier(streak);
  if (tier === 0) return null;
  return (
    <span
      key={`flame-${streak}`}
      data-testid="streak-flame"
      data-tier={tier}
      role="img"
      dir="ltr"
      aria-label={t('economy.hud.streak', { streak })}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full border-2 font-neo-display font-black leading-none tabular-nums motion-safe:animate-[edu-flame-bump_260ms_cubic-bezier(0.34,1.56,0.64,1)]',
        compact ? 'h-8 gap-0 px-1 text-sm lg:h-10 lg:gap-0.5 lg:px-2.5 lg:text-lg' : cn('h-9 px-2', tier === 3 ? 'text-lg' : 'text-base'),
        TONE[tier],
        className,
      )}
    >
      <style>{ROUND_BAR_KEYFRAMES}</style>
      <Flame
        data-testid="streak-flame-icon"
        aria-hidden="true"
        strokeWidth={3}
        className={cn(compact ? 'size-4 lg:size-6' : ICON_SIZE[tier], 'shrink-0', tier >= 2 && 'fill-neo-yellow motion-safe:animate-[edu-flame-flicker_700ms_ease-in-out_infinite]')}
      />
      <span aria-hidden="true">{streak}</span>
      {multiplier > 1 && <span aria-hidden="true" className={cn('ms-0.5 text-[0.8em]', compact && 'max-lg:hidden')}>{t('economy.hud.multiplier', { multiplier })}</span>}
    </span>
  );
}

function HudFlame() {
  const streak = useEconomyStreakStore((s) => s.streak);
  const multiplier = useEconomyStreakStore((s) => s.multiplier);
  useEffect(() => claimHudFlame(), []);
  return <StreakFlame streak={streak} multiplier={multiplier} compact />;
}

/** HUD badge beside the score: the class streak for a classroom student, the plain combo meter for everyone else. */
export function ClassroomStreakFlame({ comboLevel }: { comboLevel: number }) {
  const [student, setStudent] = useState(false);
  useEffect(() => {
    setStudent(isClassroomStudentPlay(new URLSearchParams(window.location.search)));
  }, []);
  return student ? <HudFlame /> : <MpComboMeter level={comboLevel} />;
}

export default ClassroomStreakFlame;
