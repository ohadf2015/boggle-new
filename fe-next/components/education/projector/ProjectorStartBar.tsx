'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BOSS_BATTLE_ID } from '@/lib/education/classroomCatalogueId';
import { modeAllowsRehearsalBots } from '@/lib/education/rehearsal';
import { PRESS, PRIMARY_BUTTON, RISE, type Translate } from '@/components/education/live/eduLiveStyles';
import { ProjectorQuizBlocked } from './ProjectorQuizBlocked';
import { RehearsalBotsBlocked } from './RehearsalBotsBlocked';
import { canStartProjectorRound, projectorStartLabel } from './projectorLobbyModel';
import type { useProjectorLobbyMode } from './useProjectorLobbyMode';

interface ProjectorStartBarProps {
  gameCode: string;
  t: Translate;
  lobby: ReturnType<typeof useProjectorLobbyMode>;
  /** Real students only: bots seated by a practice round never unlock Start. */
  studentCount: number;
  startLabelKey: string;
  starting: boolean;
  onStartGame: () => void;
  autoStartSecondsLeft: number | null;
  onCancelAutoStart?: () => void;
  onStartPracticeRound?: () => void;
  practiceRoundPending: boolean;
  practiceRoundFailed: boolean;
  /** Sits beside Start in the same row. */
  lockSlot?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function ProjectorStartBar({
  gameCode,
  t,
  lobby,
  studentCount,
  startLabelKey,
  starting,
  onStartGame,
  autoStartSecondsLeft,
  onCancelAutoStart,
  onStartPracticeRound,
  practiceRoundPending,
  practiceRoundFailed,
  lockSlot,
  className,
  style,
}: ProjectorStartBarProps) {
  const canStart = canStartProjectorRound(studentCount);
  const botsCanRehearse = modeAllowsRehearsalBots(lobby.mode);
  const startLocked = !canStart || starting || lobby.quizBlocked;
  // Empty room: rehearsing is the one live action, so the locked Start steps aside for it.
  const rehearseHere = !canStart && !!onStartPracticeRound && botsCanRehearse;
  const botsBlocked = !canStart && !!onStartPracticeRound && !botsCanRehearse && !lobby.quizBlocked;
  const altPrimary = rehearseHere || botsBlocked || lobby.quizBlocked;
  const label = projectorStartLabel({ starting, canStart, isBoss: lobby.modeId === BOSS_BATTLE_ID, switched: lobby.switched, isQuiz: lobby.isQuiz, startLabelKey });

  return (
    <div
      data-testid="projector-start-bar"
      style={style}
      className={cn(
        'flex flex-col gap-2 self-center @max-5xl:sticky @max-5xl:bottom-0 @max-5xl:z-10 @max-5xl:-mx-3 @max-5xl:-mb-3 @max-5xl:border-t-2 @max-5xl:border-neo-cream/40 @max-5xl:bg-neo-navy @max-5xl:p-3',
        RISE,
        className
      )}
    >
      {autoStartSecondsLeft !== null && (
        <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-3 py-2 font-neo-display font-bold text-neo-cream text-[clamp(1rem,min(1.2cqw,2.2cqh),1.75rem)]">
          {t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}
          {onCancelAutoStart && (
            <button type="button" data-testid="projector-autostart-cancel" onClick={onCancelAutoStart} className={cn('min-h-11 rounded-neo border-2 border-neo-cream/60 bg-neo-navy px-3 text-sm text-neo-cream', PRESS)}>
              {t('common.cancel')}
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          data-testid="projector-start"
          data-ready={startLocked ? 'false' : 'true'}
          onClick={onStartGame}
          disabled={startLocked}
          aria-busy={starting}
          className={cn(
            PRIMARY_BUTTON,
            PRESS,
            'normal-case tracking-normal',
            canStart
              ? 'min-h-16 flex-[2_1_14rem] px-6 py-3 text-[clamp(1.5rem,min(3cqw,5.5cqh),4.5rem)]'
              : 'min-h-12 flex-[1_1_14rem] px-4 py-2 text-[clamp(1rem,min(1.4cqw,2.6cqh),2rem)]',
            startLocked
              ? 'border-2 border-neo-cream/40 bg-neo-navy-light font-bold text-neo-cream/75 shadow-none hover:translate-y-0 hover:shadow-none'
              : 'motion-safe:animate-[edu-live-unlock_300ms_cubic-bezier(0.23,1,0.32,1)]',
            (lobby.quizBlocked || (!canStart && altPrimary)) && 'hidden'
          )}
        >
          {starting ? <Loader2 className="size-[0.8em] animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Play className="size-[0.8em]" fill="currentColor" aria-hidden="true" />}
          {t(label)}
          {canStart && (
            <span data-testid="projector-start-count" className="ms-[0.2em] rounded-full border-[3px] border-current bg-neo-black px-[0.45em] py-[0.05em] text-[0.7em] leading-none text-neo-cream tabular-nums">
              {studentCount}
            </span>
          )}
        </button>
        {rehearseHere && (
          <button
            type="button"
            data-testid="projector-practice-round"
            onClick={onStartPracticeRound}
            disabled={practiceRoundPending}
            aria-busy={practiceRoundPending}
            className={cn(PRIMARY_BUTTON, PRESS, 'min-h-12 flex-[1_1_12rem] whitespace-nowrap px-4 py-2 normal-case tracking-normal text-[clamp(1rem,min(1.4cqw,2.6cqh),2rem)]')}
          >
            {practiceRoundPending ? <Loader2 className="size-[0.8em] animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Play className="size-[0.8em]" fill="currentColor" aria-hidden="true" />}
            {t('education.projectorLobby.rehearseCta')}
          </button>
        )}
        {lobby.quizBlocked && (
          <div className="flex-[1_1_12rem]">
            <ProjectorQuizBlocked gameCode={gameCode} currentMode={lobby.modeId} t={t} onApplied={lobby.applyMode} />
          </div>
        )}
        {botsBlocked && onStartPracticeRound && (
          <RehearsalBotsBlocked gameCode={gameCode} currentMode={lobby.modeId} t={t} onApplied={lobby.applyMode} onRehearse={onStartPracticeRound} className="flex-[1_1_12rem]" />
        )}
        {lockSlot}
      </div>
      {!canStart && (
        <p data-testid="projector-start-reason" role="status" className="font-neo-body text-neo-cream/75 text-[clamp(0.8125rem,min(1cqw,1.9cqh),1.375rem)]">
          <span className={cn('block', altPrimary && '@max-5xl:hidden')}>{t('eduLiveRoom.lobby.startBlocked')}</span>
          {rehearseHere && (
            <span data-testid="rehearsal-private-note" className="block">
              {t('education.projectorLobby.rehearsePrivate')}
            </span>
          )}
        </p>
      )}
      {practiceRoundFailed && (
        <p role="alert" className="font-neo-body text-sm font-bold text-neo-pink">
          {t('tvLobby.practiceRoundFailed')}
        </p>
      )}
    </div>
  );
}
