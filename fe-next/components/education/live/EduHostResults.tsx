'use client';

/** Mounts only in the host tree, so no student ever sees the report link; z-[75] clears the lobby's z-[65]. */
import Link from 'next/link';
import { Crown, FileBarChart, LogOut, RotateCcw, Shuffle } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import type { ClassroomTvResultsScreenProps } from '@/host/components/tv-results/ClassroomTvResultsScreen';
import { chipAccent } from '@/components/education/projector/projectorLobbyModel';
import { classStats, hostPodium, type ClassStats, type PodiumSeat } from './eduResultsModel';
import { LIVE_KEYFRAMES, PRESS, PRIMARY_BUTTON, SECONDARY_BUTTON, type Translate } from './eduLiveStyles';

const SEAT_STYLE: Record<number, { order: string; height: string; color: string }> = {
  1: { order: 'order-2', height: 'h-36 md:h-[13vw]', color: 'bg-neo-yellow' },
  2: { order: 'order-1', height: 'h-24 md:h-[9vw]', color: 'bg-neo-cyan' },
  3: { order: 'order-3', height: 'h-16 md:h-[6vw]', color: 'bg-neo-pink' },
};

function Seat({ seat, index }: { seat: PodiumSeat; index: number }) {
  const style = SEAT_STYLE[seat.rank] ?? SEAT_STYLE[3];
  return (
    <li
      data-testid="edu-podium-seat"
      data-name={seat.username}
      style={{ animationDelay: `${(3 - seat.rank) * 120}ms` }}
      className={cn('flex w-1/3 max-w-[16rem] flex-col items-center gap-2 motion-safe:animate-[edu-live-pop_240ms_cubic-bezier(0.23,1,0.32,1)_both]', style.order)}
    >
      <span className="relative inline-flex">
        {seat.rank === 1 && (
          <Crown data-testid="edu-podium-crown" aria-hidden="true" className="absolute -top-7 start-1/2 size-9 -translate-x-1/2 rotate-[-8deg] fill-neo-yellow text-neo-black rtl:translate-x-1/2 md:-top-[2.6vw] md:size-[3.2vw]" />
        )}
        <span className="inline-flex size-16 overflow-hidden rounded-full border-4 border-neo-black bg-neo-cream shadow-hard md:size-[6vw]">
          <Avatar userId={seat.username} customAvatar={seat.avatar?.customAvatar ?? undefined} size="xl" disableEffects className="!h-full !w-full" />
        </span>
      </span>
      <span dir="auto" className={cn('max-w-full truncate rounded-full border-[3px] border-neo-black px-3 py-0.5 font-neo-display text-lg font-black shadow-hard-sm md:px-[0.9vw] md:text-[1.6vw]', chipAccent(seat.username, index))}>
        {seat.username}
      </span>
      <div className={cn('flex w-full flex-col items-center justify-start rounded-t-neo-lg border-4 border-b-0 border-neo-black pt-2 text-neo-black shadow-hard', style.height, style.color)}>
        <span className="font-neo-display text-4xl font-black md:text-[3.5vw]">{seat.rank}</span>
        <span className="font-neo-body text-base font-bold tabular-nums md:text-[1.3vw]">{seat.score.toLocaleString()}</span>
      </div>
    </li>
  );
}

function Stat({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div data-testid={id} className="flex flex-col rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-3 py-2 shadow-hard-sm md:px-[1vw] md:py-[0.6vw]">
      <span className="font-neo-display text-3xl font-black tabular-nums text-neo-lime md:text-[2.6vw]">{value}</span>
      <span className="font-neo-body text-sm font-bold text-neo-cream/80 md:text-[1vw]">{label}</span>
    </div>
  );
}

function Stats({ stats, t }: { stats: ClassStats; t: Translate }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-[1vw]">
      <Stat id="edu-stat-students" label={t('eduLiveRoom.hostResults.statStudents')} value={String(stats.students)} />
      <Stat id="edu-stat-words" label={t('eduLiveRoom.hostResults.statWords')} value={String(stats.words)} />
      <Stat id="edu-stat-avg" label={t('eduLiveRoom.hostResults.statAvg')} value={String(stats.avgScore)} />
      {stats.lesson && <Stat id="edu-stat-lesson" label={t('eduLiveRoom.hostResults.statLesson')} value={`${stats.lesson.found}/${stats.lesson.total}`} />}
    </div>
  );
}

function Actions({ t, language, onRematch, onClose, onExitRoom }: Pick<ClassroomTvResultsScreenProps, 't' | 'onRematch' | 'onClose' | 'onExitRoom'> & { language: string }) {
  return (
    <div className="flex flex-col gap-3 md:gap-[0.8vw]">
      {onRematch && (
        <button type="button" data-testid="edu-results-play-again" onClick={onRematch} className={cn(PRIMARY_BUTTON, PRESS, 'min-h-14 px-6 py-3 text-2xl md:text-[2vw]')}>
          <RotateCcw className="size-[0.9em]" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.playAgain')}
        </button>
      )}
      <div className="grid grid-cols-2 gap-3 md:gap-[0.8vw]">
        {onClose && (
          <button type="button" data-testid="edu-results-next-mode" onClick={onClose} className={cn(SECONDARY_BUTTON, PRESS, 'md:text-[1.1vw]')}>
            <Shuffle className="size-4" aria-hidden="true" />
            {t('eduLiveRoom.hostResults.nextMode')}
          </button>
        )}
        <Link href={`/${language}/teacher/reports`} data-testid="edu-results-report" className={cn(SECONDARY_BUTTON, PRESS, 'md:text-[1.1vw]')}>
          <FileBarChart className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.viewReport')}
        </Link>
      </div>
      {onExitRoom && (
        <button type="button" data-testid="edu-results-end" onClick={onExitRoom} className={cn(SECONDARY_BUTTON, PRESS, 'border-neo-cream/50 bg-transparent md:text-[1vw]')}>
          <LogOut className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.endGame')}
        </button>
      )}
    </div>
  );
}

const TITLE = 'font-neo-display font-black text-neo-white [-webkit-text-stroke:2px_#000] [paint-order:stroke_fill] drop-shadow-[3px_3px_0_#000]';
const HALFTONE = '[background-image:radial-gradient(rgba(255,255,255,0.07)_1.5px,transparent_1.5px)] [background-size:14px_14px]';

export function EduHostResults({ summary, players, t, onRematch, onClose, onExitRoom }: ClassroomTvResultsScreenProps) {
  const { language } = useLanguage();
  const stats = classStats(summary, players);
  const podium = hostPodium(summary, players).filter((s) => s.score > 0);
  const actions = <Actions t={t} language={language} onRematch={onRematch} onClose={onClose} onExitRoom={onExitRoom} />;

  return (
    <div data-testid="edu-host-results" className="fixed inset-0 z-[75] flex flex-col overflow-y-auto bg-neo-navy text-neo-cream">
      <style>{LIVE_KEYFRAMES}</style>
      {podium.length === 0 ? (
        <div className="m-auto w-full max-w-2xl p-4 pt-16 md:pt-[5vw]">
          <section data-testid="edu-results-empty" className="flex flex-col gap-4 rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light p-5 shadow-hard-lg md:gap-[1.2vw] md:p-[2vw]">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
              <img src={EDU_MASCOT.empty} alt="" aria-hidden="true" className="size-24 shrink-0 select-none md:size-[8vw]" />
              <div className="min-w-0">
                <h1 data-testid="edu-results-no-scores" className={cn(TITLE, 'text-3xl md:text-[2.6vw]')}>{t('eduLiveRoom.hostResults.noScores')}</h1>
                <p className="mt-1 font-neo-body text-base font-bold text-neo-cream/85 md:text-[1.2vw]">{t('eduLiveRoom.hostResults.noScoresHint')}</p>
              </div>
            </div>
            <Stats stats={stats} t={t} />
            {actions}
          </section>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4 p-4 pt-16 md:gap-[1.5vw] md:p-[2vw] md:pt-[5vw]">
          <header className="flex items-center justify-center gap-4 md:gap-[1.5vw]">
            {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
            <img src={EDU_MASCOT.podium} alt="" aria-hidden="true" className="size-20 shrink-0 select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite] md:size-[8vw]" />
            <h1 className={cn(TITLE, 'text-4xl md:text-[3.6vw]')}>{t('eduLiveRoom.hostResults.title')}</h1>
          </header>
          <div className="grid flex-1 items-center gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-[2vw]">
            <section data-testid="edu-podium" className={cn('flex min-h-[18rem] items-end justify-center rounded-neo-lg border-4 border-neo-cream bg-neo-purple/40 px-4 pt-10 shadow-hard-lg md:min-h-[26vw] md:px-[2vw] md:pt-[4vw]', HALFTONE)}>
              <ol className="flex w-full items-end justify-center gap-3 md:gap-[1.5vw]">
                {podium.map((seat, i) => <Seat key={seat.username} seat={seat} index={i} />)}
              </ol>
            </section>
            <section className="flex flex-col gap-4 md:justify-center md:gap-[1.2vw]">
              <Stats stats={stats} t={t} />
              {actions}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default EduHostResults;
