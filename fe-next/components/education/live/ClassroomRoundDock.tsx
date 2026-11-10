'use client';

import { useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import ClassroomStudentDock from '@/components/education/economy/ClassroomStudentDock';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHoldsWordBank } from '@/hooks/gameState/classroomContextStore';
import { cn } from '@/lib/utils';
import { LessonTargetStrip } from './LessonTargetStrip';
import { buildRaceSlots } from './lessonTargets';
import RivalChip from './RivalChip';
import { useLessonClaims } from './useLessonClaims';

export interface ClassroomRoundDockProps {
  gameCode: string | null | undefined;
  socket: Pick<Socket, 'on' | 'off' | 'emit'> | null | undefined;
  me: string;
}

/**
 * The tray under the letter grid on a phone: one compact row for the duel chip and the word race,
 * then the class economy. Nothing here sits over the grid or takes a swipe; a support student's
 * word-bank sheet keeps the screen bottom, so the race shows for them through the claim toast only.
 */
export function ClassroomRoundDock({ gameCode, socket, me }: ClassroomRoundDockProps) {
  const { t, language } = useLanguage();
  const race = useLessonClaims();
  const holdsBank = useHoldsWordBank();
  const slots = useMemo(() => (race && !holdsBank ? buildRaceSlots(race, me) : null), [race, holdsBank, me]);

  return (
    <div data-testid="classroom-round-dock" className={cn('flex min-w-0 flex-col gap-1', holdsBank && 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]')}>
      <div data-testid="classroom-round-row" className="pointer-events-none flex min-w-0 items-center gap-1.5 px-3 empty:hidden">
        <RivalChip socket={socket} className="max-w-[45%] shrink-0" />
        {slots && <LessonTargetStrip slots={slots} race inline t={t} dir={language === 'he' ? 'rtl' : 'ltr'} className="flex-1" />}
      </div>
      <ClassroomStudentDock gameCode={gameCode} />
    </div>
  );
}

export default ClassroomRoundDock;
