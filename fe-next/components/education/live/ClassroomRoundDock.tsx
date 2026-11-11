'use client';

import { useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import ClassroomStudentDock from '@/components/education/economy/ClassroomStudentDock';
import { MpTrayLead } from '@/components/multiplayer/round/MpRoundTray';
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

/** Phone: duel chip + word race lead the tray under the grid; the economy keeps the tray's foot (thumb zone). */
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
          className="pointer-events-none flex min-w-0 items-stretch gap-1.5 px-3 empty:hidden [@container(min-height:300px)]:flex-col"
        >
          <RivalChip socket={socket} className="max-w-[55%] shrink-0 [@container(min-height:300px)]:min-h-11 [@container(min-height:300px)]:max-w-full" />
          {slots && <LessonTargetStrip slots={slots} race inline t={t} dir={language === 'he' ? 'rtl' : 'ltr'} className="min-w-0 flex-1 [@container(min-height:300px)]:min-h-11 [@container(min-height:300px)]:[&_li]:h-8 [@container(min-height:300px)]:[&_li]:text-sm" />}
        </div>
      </MpTrayLead>
      <ClassroomStudentDock gameCode={gameCode} />
    </div>
  );
}

export default ClassroomRoundDock;
