'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TvClassroomStage } from '@/host/components/tv-broadcast/TvClassroomStage';
import TvLeaderboard from '@/host/components/tv-broadcast/TvLeaderboard';
import RivalTicker from '@/components/education/projector/RivalTicker';
import { ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';
import { RIVAL_EVENTS } from '@/shared/types/rivalry';
import type { Language } from '@/shared/types/game';
import { FakeSocket } from './fakeSocket';
import { fixtureFor, gridOf, raceView } from './fixtures';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Surface 6: the classroom stage (board, race board under it, live panel) with the rival ticker above, as TvBroadcastView lays it out. v=full claims all 12. */
export function ProjectorPreview({ v }: { v?: string }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const f = fixtureFor(language);
  const socket = useMemo(() => new FakeSocket(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ingestLessonClaimsRound({ lessonClaims: raceView(f, v === 'full' ? 12 : 5) });
    const flipNames = [f.classmates[1], f.rival, f.classmates[3]];
    let i = 0;
    const flip = () => {
      socket.fire(RIVAL_EVENTS.flip, { gameSessionId: 1, winnerName: flipNames[i % flipNames.length], winnerAvatar: null });
      i += 1;
    };
    window.__eduPreview = { flip, flips: () => { flip(); flip(); } };
    setReady(true);
    return () => ingestLessonClaimsRound(null);
  }, [f, socket, v]);

  useEffect(() => {
    if (!ready) return undefined;
    const id = window.setTimeout(() => {
      socket.fire('playerFoundWordBatch', { words: [{ username: f.classmates[0], word: f.words[11] }, { username: f.me, word: f.words[0] }] });
      window.__eduPreview?.flips();
    }, 300);
    return () => window.clearTimeout(id);
  }, [ready, socket, f]);

  const players = [f.me, f.rival, ...f.classmates, 'Gabriel', 'Lior', 'Maya', 'Tom'].map((username, i) => ({
    username, score: 64 - i * 4, avatar: { emoji: '🦊', color: '#fff' }, isHost: false, wordsFound: 14 - i,
  }));

  if (!ready) return null;
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neo-navy text-neo-cream">
      <div className="flex h-16 shrink-0 items-center justify-center border-b-4 border-neo-cream/40 bg-neo-navy-light font-neo-display text-2xl font-black text-neo-cream/50">
        header / timer (not part of this review)
      </div>
      <RivalTicker socket={socket.asSocket()} className="shrink-0 px-2 md:px-4" />
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
