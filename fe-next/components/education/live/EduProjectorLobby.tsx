'use client';

/** Same props as the shared ProjectorLobby, so TvLobbyView's mode seed, practice round and auto-start run unchanged. */
import { memo } from 'react';
import Image from 'next/image';
import { ArrowLeft, Clock, Loader2, Play } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { LobbyModeSwitcher } from '@/components/education/lobby/LobbyModeSwitcher';
import { ProjectorQuizBlocked } from '@/components/education/projector/ProjectorQuizBlocked';
import { canStartProjectorRound } from '@/components/education/projector/projectorLobbyModel';
import type { ProjectorLobbyProps } from '@/components/education/projector/ProjectorLobby';
import { catalogueEntry } from '@/components/education/ClassroomModeCatalogueData';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { EduJoinCard } from './EduJoinCard';
import { EduLobbyRoster } from './EduLobbyRoster';
import { useEduLobbyMode } from './useEduLobbyMode';
import { LIVE_KEYFRAMES, PRESS, PRIMARY_BUTTON, SECONDARY_BUTTON } from './eduLiveStyles';

const BRAND = 'LexiClash';

export const EDU_LOBBY_BG = '/images/education/v2/live-lobby-bg.webp';

export const EduProjectorLobby = memo<ProjectorLobbyProps>(function EduProjectorLobby({
  gameCode,
  language,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live',
  students,
  readyUsernames = [],
  t,
  onStartGame,
  onExitRoom,
  startLabelKey,
  starting = false,
  classroomGameMode,
  templateSettings = null,
  autoStartSecondsLeft = null,
  onCancelAutoStart,
  onStartPracticeRound,
  practiceRoundPending = false,
  practiceRoundFailed = false,
}) {
  const lobbyMode = useEduLobbyMode({ gameCode, classroomGameMode, templateSettings, t });
  const entry = catalogueEntry(lobbyMode.modeId);
  const canStart = canStartProjectorRound(students.length);
  const startLocked = !canStart || starting || lobbyMode.quizBlocked;

  return (
    <div data-testid="edu-projector-lobby" className="fixed inset-0 z-[65] flex flex-col overflow-y-auto bg-neo-navy md:overflow-hidden">
      <style>{LIVE_KEYFRAMES}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed art, eager */}
      <img src={EDU_LOBBY_BG} alt="" aria-hidden="true" loading="eager" decoding="async" className="pointer-events-none fixed inset-0 h-full w-full select-none object-cover" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-neo-navy/35" />

      <div className="relative grid min-h-full flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-rows-[auto_minmax(0,1fr)_auto] md:gap-[1.4vw] md:p-[2vw]">
        <header className="flex flex-wrap items-center gap-3 md:col-span-2 md:gap-[1vw]">
          {onExitRoom && (
            <button type="button" data-testid="edu-lobby-leave" onClick={onExitRoom} aria-label={t('eduLiveRoom.lobby.leave')} title={t('eduLiveRoom.lobby.leave')} className={cn('grid size-11 shrink-0 place-items-center rounded-neo border-[3px] border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard-sm hover:bg-neo-navy', PRESS)}>
              <DirectionalIcon icon={ArrowLeft} className="size-5" />
            </button>
          )}
          <p className="whitespace-nowrap font-neo-display text-3xl font-black leading-none text-neo-white [-webkit-text-stroke:2px_#000] [paint-order:stroke_fill] md:text-[3vw]">
            {BRAND}
            <span className="ms-2 inline-block -rotate-3 rounded-neo border-[3px] border-neo-black bg-neo-purple px-3 py-0.5 align-middle text-xl text-neo-cream shadow-hard-sm [-webkit-text-stroke:0] md:text-[1.8vw]">
              {t('eduLiveRoom.lobby.brand')}
            </span>
          </p>
          {lobbyMode.className && (
            <span dir="auto" className="ms-auto max-w-full truncate rounded-full border-[3px] border-neo-black bg-neo-cyan px-4 py-1 font-neo-display text-base font-black text-neo-black shadow-hard-sm md:text-[1.2vw]">
              {lobbyMode.className}
            </span>
          )}
        </header>

        <div className="md:row-start-2">
          <EduJoinCard gameCode={gameCode} language={language} baseUrl={baseUrl} t={t} />
        </div>

        <div className="flex min-h-[16rem] flex-col md:row-start-2 md:min-h-0">
          <EduLobbyRoster students={students} readyUsernames={readyUsernames} t={t} />
        </div>

        <div data-testid="edu-lobby-mode" className="flex flex-wrap items-center gap-3 rounded-neo-lg border-4 border-neo-black bg-neo-cyan px-4 py-3 text-neo-black shadow-hard-lg md:row-start-3 md:gap-[1vw] md:px-[1.2vw] md:py-[0.8vw]">
          {entry?.poster && (
            <Image src={entry.poster} alt="" width={96} height={96} className="size-14 shrink-0 rounded-neo border-[3px] border-neo-black object-cover md:size-[4.5vw]" />
          )}
          <div className="min-w-[9rem] flex-1">
            <p className="truncate font-neo-display text-2xl font-black leading-tight md:text-[2vw]">{t(entry?.nameKey ?? 'teacher.classroom.gameModes.classic')}</p>
            {lobbyMode.timerMinutes != null && (
              <p className="inline-flex items-center gap-1.5 font-neo-body text-base font-bold md:text-[1.2vw]">
                <Clock className="size-[1em]" aria-hidden="true" />
                {t('eduLiveRoom.lobby.minutes', { count: lobbyMode.timerMinutes })}
              </p>
            )}
          </div>
          <LobbyModeSwitcher gameCode={gameCode} currentMode={lobbyMode.modeId} socket={getSharedSocketIfExists()} t={t} onModeApplied={lobbyMode.applyMode} />
        </div>

        <div className="relative flex flex-col items-stretch gap-2 md:row-start-3 md:flex-row md:items-center md:gap-[1vw] md:pe-[11vw]">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {lobbyMode.quizBlocked && <ProjectorQuizBlocked gameCode={gameCode} currentMode={lobbyMode.modeId} t={t} onApplied={lobbyMode.applyMode} />}
            {autoStartSecondsLeft !== null && (
              <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-2 font-neo-display font-black text-neo-black shadow-hard-sm md:text-[1.1vw]">
                {t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}
                {onCancelAutoStart && (
                  <button type="button" data-testid="edu-lobby-autostart-cancel" onClick={onCancelAutoStart} className={cn('rounded-neo border-2 border-neo-black bg-neo-cream px-3 py-1 text-sm uppercase', PRESS)}>
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              data-testid="edu-lobby-start"
              data-ready={startLocked ? 'false' : 'true'}
              onClick={onStartGame}
              disabled={startLocked}
              aria-busy={starting}
              className={cn(PRIMARY_BUTTON, PRESS, 'min-h-16 w-full px-6 py-3 text-4xl md:min-h-0 md:py-[0.9vw] md:text-[3vw]', startLocked && 'border-neo-cream bg-neo-navy-light text-neo-cream shadow-none hover:translate-y-0 hover:shadow-none')}
            >
              {starting ? <Loader2 className="size-[0.8em] animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Play className="size-[0.8em]" fill="currentColor" aria-hidden="true" />}
              {t(startLabelKey)}
            </button>
            {!canStart && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p data-testid="edu-lobby-start-reason" role="status" className="font-neo-body text-sm font-bold text-neo-cream/85 md:text-[1vw]">
                  {t('eduLiveRoom.lobby.startBlocked')}
                </p>
                {onStartPracticeRound && (
                  <button type="button" data-testid="edu-lobby-practice" onClick={onStartPracticeRound} disabled={practiceRoundPending} aria-busy={practiceRoundPending} className={cn(SECONDARY_BUTTON, PRESS, 'md:text-[0.95vw]')}>
                    {practiceRoundPending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {t('tvLobby.tryPracticeRound')}
                  </button>
                )}
              </div>
            )}
            {practiceRoundFailed && (
              <p role="alert" className="font-neo-body text-sm font-bold text-neo-pink md:text-[1vw]">{t('tvLobby.practiceRoundFailed')}</p>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
          <img src={EDU_MASCOT.gameStart} alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-[1vw] end-0 hidden w-[12vw] select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite] md:block" />
        </div>
      </div>
    </div>
  );
});

export default EduProjectorLobby;
