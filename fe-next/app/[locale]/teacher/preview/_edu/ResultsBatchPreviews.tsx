'use client';

import { useMemo, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SocketContext } from '@/utils/SocketContext';
import EduStudentResults from '@/components/education/live/EduStudentResults';
import { EduHostResults } from '@/components/education/live/EduHostResults';
import { samplePreviewRound } from '@/components/education/results/resultsPreviewFixtures';
import { CLASSROOM_ECONOMY_EVENTS as E } from '@/shared/constants/classroomEconomy';
import { RIVAL_EVENTS } from '@/shared/types/rivalry';
import { FakeSocket } from './fakeSocket';

type T = (key: string, params?: Record<string, string | number>) => string;
const GAME = 'PRV123';
const SESSION = 7;
const CLASS_SIZE = 26;
const noop = () => undefined;

/** v = won | tied | lost | norival. Reduced motion: turn on the browser's reduce-motion setting; the screen paints its final state. */
type StudentCase = 'won' | 'tied' | 'lost' | 'norival';

function caseOf(v: string | undefined): StudentCase {
  return v === 'tied' || v === 'lost' || v === 'norival' ? v : 'won';
}

const RIVAL_DIFF: Record<StudentCase, number | null> = { won: 4, tied: 0, lost: -6, norival: null };
/** Where I sit in the class for each case: a duel winner far from the podium, a comeback near the back. */
const MY_INDEX: Record<StudentCase, number> = { won: 6, tied: 2, lost: CLASS_SIZE - 3, norival: 1 };

function SocketScope({ socket, children }: { socket: FakeSocket; children: ReactNode }) {
  const value = useMemo(() => ({
    socket: socket.asSocket(), isConnected: true, isReconnecting: false, connectionError: null,
    getReconnectAttempt: () => 0, maxReconnectAttempts: 0, manualReconnect: noop,
  }), [socket]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/** The real EduStudentResults on a fake room: rival duel and chest come back over the fake socket like the live server's. */
export function StudentResultsPreview({ v }: { v?: string }) {
  const c = caseOf(v);
  const round = useMemo(() => samplePreviewRound('winner', { count: CLASS_SIZE }), []);
  const ranked = useMemo(() => [...round.players].sort((a, b) => b.score - a.score), [round]);
  const lastScorer = ranked.filter((p) => p.score > 0).length - 1;
  const mine = Math.min(MY_INDEX[c], lastScorer - 1);
  const me = ranked[mine];
  const rival = ranked[mine === ranked.length - 1 ? mine - 1 : mine + 1];
  const socket = useMemo(() => {
    const diff = RIVAL_DIFF[c];
    return new FakeSocket({
      [RIVAL_EVENTS.sync]: (_p, reply) =>
        reply(RIVAL_EVENTS.update, {
          gameSessionId: SESSION,
          rival: diff === null ? null : { rivalName: rival.username, rivalAvatar: null, myScore: me.score, rivalScore: me.score - diff },
        }),
      [E.requestState]: (_p, reply) =>
        reply(E.state, { cash: 140, cashEarned: 60, streak: 3, multiplier: 2, doubleCashMsLeft: 0, shieldHeld: false, hintsHeld: 1, config: { wrongAnswerCost: false, powerUps: true }, lastDelta: null }),
      [E.requestReward]: (p, reply) => {
        const { gameCode, roundId } = p as { gameCode: string; roundId: string };
        const underdog = c === 'lost';
        reply(E.reward, { gameCode, roundId, rarity: underdog ? 'epic' : 'rare', xp: underdog ? 60 : 35, itemId: 'hat-wizard', roundCash: 60, rank: MY_INDEX[c] + 1, size: CLASS_SIZE, underdog });
      },
      [E.requestLocker]: (_p, reply) => reply(E.locker, []),
    });
  }, [c, me.score, rival.username]);
  return (
    <SocketScope socket={socket}>
      <div className="fixed inset-0 flex flex-col bg-neo-navy">
        <EduStudentResults
          finalScores={ranked}
          username={me.username}
          socket={socket.asSocket() as never}
          gameCode={GAME}
          gameSessionId={SESSION}
          classroomSummary={round.summary}
        />
      </div>
    </SocketScope>
  );
}

/** The one host results layout, live or not: the same real screen, with players carrying their word lists. */
export function HostResultsBatchPreview({ v }: { v?: string }) {
  const { t } = useLanguage();
  const round = useMemo(() => (v === 'zero' ? samplePreviewRound('zero') : samplePreviewRound('winner', { count: 12 })), [v]);
  return (
    <div className="flex h-dvh flex-col bg-neo-navy">
      <EduHostResults summary={round.summary} players={round.players} t={t as T} onRematch={noop} onClose={noop} onExitRoom={noop} gameCode={GAME} socket={null} />
    </div>
  );
}
