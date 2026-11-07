'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Hammer } from 'lucide-react';
import TvLeaderboard from '@/host/components/tv-broadcast/TvLeaderboard';
import { tr } from '@/components/education/lobby/eduText';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import { isLeaderboardHidden, isStudentTimerHidden, trimLeaderboardForPressure } from '@/shared/utils/classroomPressure';
import type { WordcraftLiveSocket } from '@/components/multiplayer/wordcraft/useWordcraftLive';
import { useWordcraftFeed, type FeedTarget } from './ProjectorWordcraftFeed';
import { LatestPlay, LessonWordWall, WaitingForFirstWord } from './ProjectorWordcraftPlay';
import type { Translate } from './eduLiveStyles';

type LeaderboardProps = ComponentProps<typeof TvLeaderboard>;

interface ProjectorWordcraftStageProps {
  socket: WordcraftLiveSocket | null;
  players: LeaderboardProps['players'];
  teams?: LeaderboardProps['teams'];
  hostUsername?: string;
  remainingTime?: number | null;
  language: string;
  /** The team tug-of-war, in a team round. */
  battleBar?: ReactNode;
  t: Translate;
}

const CARD = 'rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light shadow-hard-lg';

function formatClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function LessonMeter({ targets, t }: { targets: FeedTarget[]; t: Translate }) {
  if (targets.length === 0) return <div className="flex-1" />;
  const built = targets.filter((x) => x.built).length;
  return (
    <div data-testid="wordcraft-lesson-meter" className="flex min-w-0 flex-1 items-center gap-3 max-md:order-last max-md:basis-full">
      <span className="shrink-0 whitespace-nowrap font-neo-display text-sm font-black uppercase md:text-xl 2xl:text-2xl">
        {t('education.wordcraftLive.lessonWords')} <span className="tabular-nums text-neo-lime">{built}/{targets.length}</span>
      </span>
      <div className="flex h-4 min-w-0 flex-1 gap-1 md:h-6" aria-hidden="true">
        {targets.map((x) => (
          <span key={x.word} className={`flex-1 rounded-sm border-2 border-neo-black ${x.built ? 'bg-neo-lime' : 'bg-neo-navy'}`} />
        ))}
      </div>
    </div>
  );
}

/** The teacher's wall during a live Wordcraft race: the newest word as tiles, the lesson checklist, and the class standings. */
export function ProjectorWordcraftStage({ socket, players, teams, hostUsername, remainingTime, language, battleBar, t }: ProjectorWordcraftStageProps) {
  const feed = useWordcraftFeed(socket);
  const pressure = useClassroomPressure();
  const leaderboardHidden = pressure ? isLeaderboardHidden(pressure) : false;
  const timerHidden = pressure ? isStudentTimerHidden(pressure) : false;
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const standings = pressure ? trimLeaderboardForPressure(ranked, pressure) : ranked;
  const [latest, ...older] = feed.plays;
  const latestAvatar = latest ? players.find((p) => p.username === latest.username)?.avatar : null;

  return (
    <div data-testid="projector-wordcraft-stage" className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-neo-navy p-3 max-md:overflow-y-auto max-md:overscroll-contain font-neo-body text-neo-cream md:gap-4 md:p-5">
      <div className="flex shrink-0 flex-wrap items-center gap-3 md:flex-nowrap md:gap-5">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-cyan px-3 py-1.5 font-neo-display text-base font-black uppercase text-neo-black shadow-hard md:text-2xl">
          <Hammer className="size-5 md:size-7" aria-hidden="true" />
          {t('academy.hq.modes.wordcraft')}
        </span>
        <LessonMeter targets={feed.targets} t={t} />
        {!timerHidden && (
          <span data-testid="race-clock" className="ms-auto shrink-0 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-4 py-1 font-neo-display text-2xl font-black tabular-nums shadow-hard md:text-5xl">
            {formatClock(remainingTime)}
          </span>
        )}
      </div>
      {battleBar}

      <div className="grid gap-3 md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-4">
        <div className="flex min-h-0 flex-col gap-3 md:gap-4">
          <div data-testid="wordcraft-latest-play" className={`h-60 shrink-0 overflow-hidden [container-type:size] md:h-auto md:min-h-0 md:flex-1 ${CARD}`}>
            {latest ? <LatestPlay play={latest} avatar={latestAvatar} language={language} t={t} /> : <WaitingForFirstWord t={t} />}
          </div>
          {feed.targets.length > 0 && (
            <div className="shrink-0">
              <LessonWordWall targets={feed.targets} />
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-3 md:gap-4">
          <div className={`h-72 shrink-0 overflow-hidden md:h-auto md:min-h-[8rem] md:flex-1 ${CARD}`}>
            {leaderboardHidden ? (
              <p data-testid="leaderboard-reveal-note" className="grid h-full place-items-center p-4 text-center font-neo-display text-xl font-black md:text-3xl">
                {t('education.classroomGame.pressure.revealAtEnd')}
              </p>
            ) : (
              <TvLeaderboard players={standings} teams={teams} classroom hostUsername={hostUsername} gameMode="wordcraft" t={t} />
            )}
          </div>
          {older.length > 0 && (
            <ol data-testid="wordcraft-ticker" className="flex shrink-0 flex-col gap-2">
              {older.slice(0, 3).map((a) => (
                <li key={a.key} className="flex items-center gap-2 rounded-neo border-[3px] border-neo-cream/50 bg-neo-navy-light px-3 py-1.5 shadow-hard-sm text-base font-bold md:text-xl">
                  <span className="min-w-0 flex-1 truncate">
                    {t('education.wordcraftLive.builtBy', { name: a.username, word: a.words[0]?.word ?? '' })}
                  </span>
                  <span dir="ltr" className="font-neo-display font-black tabular-nums text-neo-lime">+{a.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectorWordcraftStage;
