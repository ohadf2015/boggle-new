'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TvClassroomStage } from '@/host/components/tv-broadcast/TvClassroomStage';
import TvLeaderboard from '@/host/components/tv-broadcast/TvLeaderboard';
import TvJoinBar from '@/host/components/tv-broadcast/TvJoinBar';
import TvGameHeader from '@/host/components/tv-broadcast/TvGameHeader';
import TvNotificationQueue from '@/host/components/tv-broadcast/TvNotificationQueue';
import { TvFormatChip, TvRoundLabel } from '@/host/components/tv-broadcast/TvBattleBar';
import type { TvNotificationData } from '@/host/components/tv-broadcast/TvNotification';
import RivalTicker from '@/components/education/projector/RivalTicker';
import ProjectorLobby from '@/components/education/projector/ProjectorLobby';
import { ingestLessonClaim, ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';
import { RIVAL_EVENTS } from '@/shared/types/rivalry';
import type { Language } from '@/shared/types/game';
import { FakeSocket } from './fakeSocket';
import { fixtureFor, gridOf, raceView, type PreviewFixture } from './fixtures';

type T = (key: string, params?: Record<string, string | number>) => string;

const EXTRA_EN = ['Gabriel', 'Lior', 'Maya', 'Tom', 'Ada', 'Eli', 'Rina', 'Omer', 'Talia', 'Yonatan', 'Hila', 'Gil', 'Noam', 'Dafna', 'Amit', 'Roni', 'Sivan', 'Erez', 'Tamar', 'Yuval', 'Michal', 'Nadav', 'Keren', 'Asaf'];
const EXTRA_HE = ['גבריאל', 'ליאור', 'מאיה', 'תום', 'עדה', 'אלי', 'רינה', 'עומר', 'טליה', 'יונתן', 'הילה', 'גיל', 'נועם', 'דפנה', 'עמית', 'רוני', 'סיון', 'ארז', 'תמר', 'יובל', 'מיכל', 'נדב', 'קרן', 'אסף'];

function roster(f: PreviewFixture, language: string, count: number): string[] {
  return [f.me, f.rival, ...f.classmates, ...(language === 'he' ? EXTRA_HE : EXTRA_EN)].slice(0, count);
}

/** Projector batch: the real classroom wall (join bar, header with a long-name toast, rival ticker, stage, leaderboard). v = feed | claim | full | norival | p3 | p30 | lobby | lobby-empty. */
export function ProjectorPreview({ v }: { v?: string }) {
  if (v === 'lobby' || v === 'lobby-empty') return <ProjectorLobbyPreview empty={v === 'lobby-empty'} />;
  return <ProjectorRoundPreview v={v ?? 'feed'} />;
}

function ProjectorRoundPreview({ v }: { v: string }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const f = fixtureFor(language);
  const socket = useMemo(() => new FakeSocket(), []);
  const [ready, setReady] = useState(false);
  const count = v === 'p3' ? 3 : v === 'p30' ? 30 : 12;
  const names = useMemo(() => roster(f, language, count), [f, language, count]);
  const rivalry = v !== 'norival';

  useEffect(() => {
    ingestLessonClaimsRound(rivalry ? { lessonClaims: raceView(f, v === 'full' ? 12 : 5) } : null);
    setReady(true);
    return () => ingestLessonClaimsRound(null);
  }, [f, v, rivalry]);

  useEffect(() => {
    if (!ready) return undefined;
    const plain = language === 'he' ? ['חתול', 'אבן', 'נהר', 'שמש', 'הר', 'ספר'] : ['cat', 'stone', 'river', 'planet', 'mountain', 'sun'];
    const pool = [plain[0], f.words[6], plain[1], plain[2], plain[3], f.words[8], plain[4], plain[5]];
    let i = 0;
    const drop = () => {
      const word = pool[i % pool.length];
      socket.fire('playerFoundWordBatch', { words: [{ username: names[(i * 5 + 1) % names.length], word }] });
      i += 1;
    };
    for (let k = 0; k < 6; k += 1) drop();
    const timers = [window.setInterval(drop, 1600)];
    if (rivalry) {
      const flip = (name: string) => socket.fire(RIVAL_EVENTS.flip, { gameSessionId: 1, winnerName: name, winnerAvatar: null });
      timers.push(window.setTimeout(() => { flip(f.classmates[1]); flip(f.rival); }, 200));
    }
    if (v === 'claim') {
      timers.push(window.setTimeout(() => {
        ingestLessonClaim({ roundId: 7, index: 5, word: f.words[5], username: f.rival, avatar: { emoji: '🦊' }, teamId: null, claimedCount: 6, total: 12, bonus: 3 });
      }, 900));
    }
    return () => timers.forEach((id) => { window.clearInterval(id); window.clearTimeout(id); });
  }, [ready, socket, f, names, rivalry, v, language]);

  const players = names.map((username, i) => ({ username, score: 64 - i * 2, wordCount: 14 - (i % 14), avatar: { emoji: '🦊', color: '#fff' }, isHost: false }));
  const classroom = { round: 2, lessonName: f.className, playStyle: 'ffa' as const };
  const toast: TvNotificationData[] = [{
    id: 'preview-toast', type: 'comeback', tier: 'major', layout: 'mascot', mascotVariant: 'winner',
    player: f.rival, headline: t('tvBroadcast.notifications.comeback'), duration: 600_000, timestamp: 0,
  } as unknown as TvNotificationData];

  if (!ready) return null;
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neo-navy text-neo-cream">
      <TvJoinBar gameCode="S32RH6" playerCount={players.length} language={language} t={t} dense />
      <TvGameHeader
        compact
        leading={<TvRoundLabel classroom={classroom as never} t={t} />}
        toastSlot={(
          <div className="flex min-w-0 flex-col items-end gap-2">
            <span className="whitespace-nowrap max-md:hidden"><TvFormatChip classroom={classroom as never} t={t} /></span>
            <TvNotificationQueue notifications={toast} onDismiss={() => {}} maxVisible={1} placement="inline" />
          </div>
        )}
        remainingTime={92}
        timerValue={3}
        gameMode="classic"
        t={t}
      />
      {rivalry && <RivalTicker socket={socket.asSocket()} className="shrink-0 px-2 md:px-4" />}
      <div className="mx-auto grid w-full max-w-[2000px] shrink-0 grid-cols-1 grid-rows-[auto_auto] gap-2 p-2 md:min-h-0 md:flex-1 md:shrink md:grid-cols-[minmax(0,8fr)_minmax(0,7fr)] md:grid-rows-[1fr] md:gap-4 md:p-4">
        <div className="md:min-h-0 md:overflow-hidden">
          <TvClassroomStage
            gameMode="classic"
            grid={gridOf(f)}
            wheelPuzzle={null}
            activityPanel={null}
            socket={socket.asSocket()}
            totalWords={137}
            lessonWords={f.words}
            language={language as Language}
            hostUsername="Teacher"
            players={players}
            t={t}
          />
        </div>
        <div data-testid="tv-leaderboard-card" className="min-h-[120px] rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light text-neo-cream shadow-hard-lg md:min-h-0 md:overflow-auto md:border-4">
          <TvLeaderboard players={players as never} classroom hostUsername="Teacher" gameMode="classic" t={t} />
        </div>
      </div>
    </div>
  );
}

function ProjectorLobbyPreview({ empty }: { empty: boolean }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const f = fixtureFor(language);
  const all = useMemo(() => roster(f, language, 14), [f, language]);
  const shown = empty ? 0 : 9;

  const students = all.slice(0, shown).map((username) => ({ username }));
  return (
    <ProjectorLobby
      gameCode="S32RH6"
      language={language}
      students={students}
      readyUsernames={students.slice(0, 2).map((s) => s.username)}
      t={t}
      onStartGame={() => {}}
      startLabelKey="hostView.startClassGame"
      lessonName={f.className}
      classroomGameMode="classic"
      templateSettings={{ timerSeconds: 180, difficulty: 'normal', minWordLength: 3, allowLateJoin: true }}
    />
  );
}
