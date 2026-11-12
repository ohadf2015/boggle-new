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

/** The lesson's words are not loaded yet (no local copy on this device): Start waits for them. */
export interface LessonWordsBlock {
  status: 'loading' | 'error';
  onRetry: () => void;
}

interface ProjectorStartBarProps {
  gameCode: string;
  t: Translate;
  lobby: ReturnType<typeof useProjectorLobbyMode>;
  /** Real students only: bots seated by a practice round never unlock Start. */
  studentCount: number;
  /** Students who have not finished the word deck; Start stays pressable as an override. */
  stillLearning?: number;
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
  lessonWordsBlock?: LessonWordsBlock;
  className?: string;
  style?: CSSProperties;
}

export function ProjectorStartBar({
  gameCode,
  t,
  lobby,
  studentCount,
  stillLearning = 0,
  startLabelKey,
  starting,
  onStartGame,
  autoStartSecondsLeft,
  onCancelAutoStart,
  onStartPracticeRound,
  practiceRoundPending,
  practiceRoundFailed,
  lockSlot,
  lessonWordsBlock,
  className,
  style,
}: ProjectorStartBarProps) {
  const canStart = canStartProjectorRound(studentCount);
  const botsCanRehearse = modeAllowsRehearsalBots(lobby.mode);
  const startLocked = !canStart || starting || lobby.quizBlocked || !!lessonWordsBlock;
  // Empty room: the locked Start stays on screen with its reason, and the rehearsal option sits under it.
  const rehearseHere = !canStart && !!onStartPracticeRound && botsCanRehearse;
  const botsBlocked = !canStart && !!onStartPracticeRound && !botsCanRehearse && !lobby.quizBlocked;
  const waitingOnClass = canStart && stillLearning > 0 && !starting;
  const label = waitingOnClass ? 'education.projectorLobby.startAnyway' : projectorStartLabel({ starting, canStart, isBoss: lobby.modeId === BOSS_BATTLE_ID, switched: lobby.switched, isQuiz: lobby.isQuiz, startLabelKey });

  return (
    <div
      data-testid="projector-start-bar"
      style={style}
      className={cn(
        'flex flex-col gap-2 self-center [@container(max-height:800px)]:sticky [@container(max-height:800px)]:bottom-0 [@container(max-height:800px)]:z-10 [@container(max-height:800px)]:bg-neo-navy [@container(max-height:800px)]:py-2 @max-5xl:sticky @max-5xl:bottom-0 @max-5xl:z-10 @max-5xl:-mx-3 @max-5xl:-mb-3 @max-5xl:border-t-[3px] @max-5xl:border-neo-cream/50 @max-5xl:bg-neo-navy @max-5xl:p-3',
        RISE,
        className
      )}
    >
      {autoStartSecondsLeft !== null && (
        <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-neo border-[3px] border-neo-black bg-neo-cream px-3 py-2 font-neo-display font-black text-neo-black shadow-hard text-[clamp(1rem,min(1.2cqw,2.2cqh),1.75rem)]">
          {t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}
          {onCancelAutoStart && (
            <button type="button" data-testid="projector-autostart-cancel" onClick={onCancelAutoStart} className={cn('min-h-11 rounded-neo border-[3px] border-neo-black bg-neo-white px-3 text-sm text-neo-black shadow-hard-sm', PRESS)}>
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
            canStart && !waitingOnClass
              ? 'min-h-16 flex-[2_1_14rem] px-6 py-3 text-[clamp(1.5rem,min(3cqw,5.5cqh),4.5rem)]'
              : cn('min-h-12 px-4 py-2 text-[clamp(1rem,min(1.4cqw,2.6cqh),2rem)]', canStart ? 'flex-[1_1_14rem]' : 'flex-[1_1_100%]'),
            startLocked
              ? 'border-[3px] border-dashed border-neo-cream/50 bg-neo-navy-light font-bold text-neo-cream/80 shadow-none hover:translate-y-0 hover:shadow-none'
              : waitingOnClass
                ? 'border-[3px] border-neo-cream/50 bg-neo-navy-elevated font-bold text-neo-cream shadow-hard'
                : 'motion-safe:animate-[edu-live-unlock_300ms_cubic-bezier(0.23,1,0.32,1)]',
            lobby.quizBlocked && 'hidden'
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
            <ProjectorQuizBlocked gameCode={gameCode} reasonKey={lobby.blockedReasonKey} currentMode={lobby.modeId} t={t} onApplied={lobby.applyMode} />
          </div>
        )}
        {botsBlocked && onStartPracticeRound && (
          <RehearsalBotsBlocked gameCode={gameCode} currentMode={lobby.modeId} t={t} onApplied={lobby.applyMode} onRehearse={onStartPracticeRound} showNote={false} className="flex-[1_1_12rem]" />
        )}
        {lockSlot}
      </div>
      {waitingOnClass && (
        <p data-testid="projector-still-learning" role="status" className="font-neo-display font-bold text-neo-cream text-[clamp(1rem,min(1.3cqw,2.4cqh),1.875rem)]">
          {t('education.projectorLobby.stillLearning', { count: stillLearning })}
        </p>
      )}
      {!canStart && (
        <p data-testid="projector-start-reason" role="status" className="font-neo-body text-neo-cream/75 text-[clamp(0.8125rem,min(1cqw,1.9cqh),1.375rem)]">
          <span className="block">{t('eduLiveRoom.lobby.startBlocked')}</span>
          {rehearseHere && (
            <span data-testid="rehearsal-private-note" className="block">
              {t('education.projectorLobby.rehearsePrivate')}
            </span>
          )}
        </p>
      )}
      {lessonWordsBlock && (
        <p data-testid="projector-lesson-words" role="alert" className="flex flex-wrap items-center gap-2 font-neo-body font-bold text-neo-yellow text-[clamp(0.8125rem,min(1cqw,1.9cqh),1.375rem)]">
          {t(lessonWordsBlock.status === 'loading' ? 'education.projectorLobby.lessonWordsLoading' : 'education.projectorLobby.lessonWordsFailed')}
          {lessonWordsBlock.status === 'error' && (
            <button type="button" data-testid="projector-lesson-words-retry" onClick={lessonWordsBlock.onRetry} className={cn('min-h-11 rounded-neo border-[3px] border-neo-black bg-neo-cream px-3 text-sm font-black text-neo-black shadow-hard-sm', PRESS)}>
              {t('education.projectorLobby.lessonWordsRetry')}
            </button>
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
