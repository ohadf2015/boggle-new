'use client';

import { useEffect, useRef } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { EduMascot } from '@/components/education/EduMascot';
import { useBlastMascot } from '@/lib/blast/useBlastMascot';
import { useMascotEnabled } from '@/lib/blast/useMascotEnabled';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import type { MascotState } from '@/lib/blast/mascotState';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import type { EduMascotPose } from '@/lib/education/mascotArt';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import { isLeaderboardHidden, shouldSuppressTimerUrgency } from '@/shared/utils/classroomPressure';
import { trackGrowthEvent } from '@/utils/growthTracking';

const POSE: Record<MascotState, EduMascotPose> = {
  idle: 'welcome',
  focused: 'welcome',
  cheer: 'success',
  wow: 'tip',
  awe: 'attack',
  oh: 'empty',
  nervous: 'error',
  'sad-supportive': 'brainBreak',
  proud: 'podium',
  dancing: 'endOfYear',
};

export function eduPoseFor(state: MascotState): EduMascotPose {
  return POSE[state];
}

// Streak dances and the low-time wobble are about speed and standing, which the teacher's calm dials silence.
const PRESSURE_STATES: ReadonlySet<MascotState> = new Set(['dancing', 'nervous']);

const PHONE_SLOT =
  'pointer-events-none fixed end-3 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-50 size-16 [&_*]:pointer-events-none';
const STAGE_SLOT = 'pointer-events-none absolute bottom-[10cqw] start-[2cqw] z-30 w-[13cqw] [&_*]:pointer-events-none';

const SPRING = { type: 'spring', stiffness: 420, damping: 22 } as const;
// Wind-up, fast hit, freeze, recover: the slapstick beat, kept for the projector only.
const BONK = {
  initial: { y: '-60%', scaleX: 1, scaleY: 1, rotate: 0, opacity: 0 },
  animate: {
    y: ['-60%', '0%', '0%', '0%'],
    scaleX: [0.9, 1.35, 1.35, 1],
    scaleY: [1.15, 0.65, 0.65, 1],
    rotate: [0, -8, -8, 6, 0],
    opacity: 1,
  },
  transition: { duration: 0.9, times: [0, 0.3, 0.55, 1] },
};

const CROWD: { pose: EduMascotPose; offbeat?: boolean }[] = [
  { pose: 'podium' },
  { pose: 'endOfYear' },
  { pose: 'empty', offbeat: true },
  { pose: 'endOfYear' },
  { pose: 'podium' },
];

interface EduMascotReactionsProps {
  mode: string;
  comboLevel?: number;
  /** `phone` = small corner pop; `stage` = projector canvas (needs a cqw container). */
  placement?: 'phone' | 'stage';
}

/** The shared mascot bus, drawn in the education art. Decorative only: never takes taps. */
export function EduMascotReactions({ mode, comboLevel = 0, placement = 'phone' }: EduMascotReactionsProps) {
  const mascot = useBlastMascot();
  const pref = useMascotEnabled();
  const reduced = useEduReducedMotion();
  const pressure = useClassroomPressure();
  const calm = pressure ? isLeaderboardHidden(pressure) || shouldSuppressTimerUrgency(pressure) : false;

  const effectiveCombo = calm ? 0 : comboLevel;
  const prevCombo = useRef(effectiveCombo);
  useEffect(() => {
    if (effectiveCombo > prevCombo.current) emitMascotEvent({ kind: 'combo-milestone', level: effectiveCombo });
    prevCombo.current = effectiveCombo;
  }, [effectiveCombo]);

  const show = mascot.visible && pref.enabled && !reduced && !(calm && PRESSURE_STATES.has(mascot.state));
  useEffect(() => {
    if (show) trackGrowthEvent('mascot_reaction_shown', { state: mascot.state, mode });
  }, [show, mascot.state, mode]);

  const stage = placement === 'stage';
  const crowd = stage && mascot.state === 'proud';

  return (
    <AdaptiveAnimatePresence>
      {show && crowd && (
        <div
          key="edu-mascot-crowd"
          data-testid="edu-mascot-crowd"
          className="pointer-events-none absolute inset-x-[4cqw] bottom-[1cqw] z-40 flex items-end justify-between [&_*]:pointer-events-none"
        >
          {CROWD.map((member, i) => (
            <AdaptiveMotion.div
              key={i}
              data-crowd-member={member.offbeat ? 'offbeat' : 'cheer'}
              className="w-[11cqw]"
              initial={{ y: '120%' }}
              animate={member.offbeat ? { y: ['120%', '0%', '0%'], rotate: [0, 0, -14, 10, 0] } : { y: ['120%', '0%', '-18%', '0%', '-18%', '0%'] }}
              exit={{ y: '120%' }}
              transition={{ duration: member.offbeat ? 1.6 : 1.4, delay: member.offbeat ? 0.45 : i * 0.06 }}
            >
              <EduMascot moment={member.pose} size={256} className="size-full" />
            </AdaptiveMotion.div>
          ))}
        </div>
      )}
      {show && !crowd && (
        <AdaptiveMotion.div
          key="edu-mascot-pop"
          data-testid="edu-mascot-reaction"
          data-state={mascot.state}
          className={stage ? STAGE_SLOT : PHONE_SLOT}
          {...(stage && mascot.state === 'awe'
            ? { ...BONK, exit: { opacity: 0, scale: 0.6 } }
            : { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.6 }, transition: SPRING })}
        >
          <EduMascot moment={eduPoseFor(mascot.state)} size={stage ? 256 : 64} className="size-full drop-shadow-[0_0.2rem_0_rgb(var(--neo-black))]" />
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}

export default EduMascotReactions;
