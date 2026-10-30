'use client';

import { useRef } from 'react';
import { useClassroomModeSwitch } from '@/components/education/lobby/useClassroomModeSwitch';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { REHEARSAL_FALLBACK_MODE } from '@/lib/education/rehearsal';
import type { ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { cn } from '@/lib/utils';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface RehearsalBotsBlockedProps {
  gameCode: string;
  currentMode: ClassroomCatalogueId;
  t: Translate;
  onApplied: (mode: ClassroomCatalogueId) => void;
  onRehearse: () => void;
  className?: string;
}

export function RehearsalBotsBlocked({ gameCode, currentMode, t, onApplied, onRehearse, className }: RehearsalBotsBlockedProps) {
  const asked = useRef(false);
  const { pendingMode, switchTo } = useClassroomModeSwitch({
    gameCode,
    currentMode,
    socket: getSharedSocketIfExists(),
    t,
    onApplied: (id) => {
      onApplied(id);
      // The switch hook hears every mode ack for the room; only our own request may start bots.
      if (asked.current && id === REHEARSAL_FALLBACK_MODE) {
        asked.current = false;
        onRehearse();
      }
    },
  });

  return (
    <div data-testid="rehearsal-bots-blocked" className={cn('flex flex-col gap-1', className)}>
      <button
        type="button"
        data-testid="rehearsal-use-classic"
        onClick={() => {
          asked.current = true;
          switchTo(REHEARSAL_FALLBACK_MODE);
        }}
        disabled={!!pendingMode}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 py-2 font-neo-display font-black text-neo-black shadow-hard transition-transform active:translate-y-0.5 active:shadow-none focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:opacity-60 text-[clamp(1rem,min(1.4cqw,2.6cqh),2rem)]"
      >
        {t('education.projectorLobby.rehearseUseClassic')}
      </button>
      <p role="status" className="font-neo-body leading-snug text-neo-cream/75 text-[clamp(0.8125rem,min(1cqw,1.9cqh),1.375rem)]">
        {t('education.projectorLobby.rehearseBotsBlocked')}
      </p>
    </div>
  );
}

export default RehearsalBotsBlocked;
