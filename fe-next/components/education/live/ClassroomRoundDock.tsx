'use client';

import { useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import ClassroomStudentDock from '@/components/education/economy/ClassroomStudentDock';
import { MpTrayLead } from '@/components/multiplayer/round/MpRoundTray';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHoldsWordBank } from '@/hooks/gameState/classroomContextStore';
import { cn } from '@/lib/utils';
import { buildRaceSlots } from './lessonTargets';
import { RaceMini } from './RaceMini';
import RivalChip from './RivalChip';
import { useLessonClaims } from './useLessonClaims';

export interface ClassroomRoundDockProps {
  gameCode: string | null | undefined;
  socket: Pick<Socket, 'on' | 'off' | 'emit'> | null | undefined;
  me: string;
}

/** Phone: one row under the grid (rival tug + race count), the economy buttons in the thumb zone below. */
export function ClassroomRoundDock({ gameCode, socket, me }: ClassroomRoundDockProps) {
  const { t, language } = useLanguage();
  const race = useLessonClaims();
  const holdsBank = useHoldsWordBank();
  const slots = useMemo(() => (race && !holdsBank ? buildRaceSlots(race, me) : null), [race, holdsBank, me]);

  return (
    <div data-testid="classroom-round-dock" className={cn('flex min-w-0 flex-col gap-1', holdsBank && 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]')}>
      <MpTrayLead>
        <div
          data-testid="classroom-round-row"
          className="pointer-events-none flex min-w-0 items-stretch gap-1.5 px-3 empty:hidden lg:flex-col"
        >
          <RivalChip socket={socket} className="flex-1" />
          {slots && <RaceMini slots={slots} t={t} dir={language === 'he' ? 'rtl' : 'ltr'} className="overflow-hidden [@container(min-height:300px)]:min-h-14 [@container(min-height:300px)]:[&_[data-testid=lesson-target-count]]:text-base" />}
        </div>
      </MpTrayLead>
      <ClassroomStudentDock gameCode={gameCode} />
    </div>
  );
}

export default ClassroomRoundDock;
