'use client';

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { resolvePreset } from '@/lib/education/motion/presets';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { safeCapture } from '@/lib/education/telemetryCore';
import type { ClassStreak } from '@/lib/education/classroomHub';
import { tr, type EduParams, type EduT } from '@/components/education/lobby/eduText';

interface ClassStreakCueProps {
  classroomId: string | undefined;
  /** The reveal has landed: nothing shows (or is counted) before the winner beat. */
  revealed: boolean;
  /** The context translator, `t(key, fallback, params)`; the projector's narrow prop would read the fallback as params. */
  t: (key: string, fallback: string, params?: EduParams) => string;
  className?: string;
}

function isClassStreak(v: unknown): v is ClassStreak {
  const s = v as ClassStreak | null;
  return !!s && typeof s.streak === 'number' && typeof s.playedToday === 'boolean';
}

/** Round-end wall line for the whole room: the class's streak, or an invitation to start one. Silent, positive only. */
export function ClassStreakCue({ classroomId, revealed, t, className }: ClassStreakCueProps) {
  const reduced = useEduReducedMotion();
  const [streak, setStreak] = useState<number | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (!classroomId || !revealed) return;
    let cancelled = false;
    fetch(`/api/education/classroom/${classroomId}/streak`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`streak ${res.status}`);
        const body: unknown = await res.json();
        if (!isClassStreak(body)) throw new Error('streak shape');
        if (!cancelled) setStreak(body.streak);
      })
      .catch(() => {
        if (!cancelled) setStreak(null);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId, revealed]);

  const variant = streak !== null && streak >= 2 ? 'kept' : 'invite';
  const show = revealed && streak !== null;

  useEffect(() => {
    if (!show || sent.current || streak === null) return;
    sent.current = true;
    safeCapture('edu_class_streak_cue_shown', { streak, variant });
  }, [show, streak, variant]);

  if (!show || streak === null) return null;
  const pop = resolvePreset('popIn', reduced);

  return (
    <m.div
      data-testid="class-streak-cue"
      data-variant={variant}
      initial={pop.initial}
      animate={pop.animate}
      transition={pop.transition}
      className={cn(
        '[@container_results_(height<56.25rem)]:hidden flex min-w-0 items-center justify-center gap-[1cqw] self-start rounded-neo-lg border-[3px] border-edu-line bg-edu-surface px-[1.6cqw] py-[0.8cqw] font-neo-display font-black leading-tight text-edu-ink shadow-hard',
        className
      )}
      style={{ fontSize: 'max(14px, 1.6cqw)', minHeight: 'max(40px, 3.4cqw)' }}
    >
      <StreakFlame days={Math.max(streak, 1)} size={24} mood="happy" animated={!reduced} className="shrink-0" />
      <span className="min-w-0">
        {variant === 'kept'
          ? tr(t as unknown as EduT, 'eduLiveRoom.hostResults.streakKept', '{count} days in a row', { count: streak })
          : tr(t as unknown as EduT, 'eduLiveRoom.hostResults.streakInvite', 'Play again tomorrow to start a class streak')}
      </span>
    </m.div>
  );
}

export default ClassStreakCue;
