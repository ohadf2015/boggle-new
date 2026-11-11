'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthContext, useAuth, type AuthContextValue } from '@/contexts/AuthContext';
import { SocketContext } from '@/utils/SocketContext';
import GridComponent from '@/components/GridComponent';
import { MpRoundLayout } from '@/components/multiplayer/round/MpRoundLayout';
import { MpRoundTraySlot } from '@/components/multiplayer/round/MpRoundTray';
import { MP_ROUND_CONTAINER_CLASS } from '@/components/multiplayer/round/roundContainer';
import { ClassroomRoundDock } from '@/components/education/live/ClassroomRoundDock';
import { LessonClaimToast } from '@/components/education/live/LessonClaimToast';
import { ingestLessonClaim, ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';
import { EduStudentLobby } from '@/components/education/live/EduStudentLobby';
import { JoinNameStep } from '@/components/education/join/JoinNameStep';
import { NAME_NOT_ALLOWED_KEY } from '@/components/education/join/joinFailure';
import type { JoinFlowState } from '@/components/education/join/useJoinFlow';
import { CLASSROOM_ECONOMY_EVENTS as E } from '@/shared/constants/classroomEconomy';
import { RIVAL_EVENTS } from '@/shared/types/rivalry';
import { FakeSocket } from './fakeSocket';
import { fixtureFor, gridOf, raceView, type PreviewFixture } from './fixtures';

type T = (key: string, params?: Record<string, string | number>) => string;
const GAME = 'PRV123';
const noop = () => undefined;

declare global {
  interface Window {
    __eduPreview?: Record<string, () => void>;
  }
}

function rivalDiff(v: string | undefined): number {
  if (v === 'ahead' || v === 'won') return 4;
  if (v === 'level' || v === 'tied') return 0;
  return -4;
}

function useStudentSocket(f: PreviewFixture, v: string | undefined, underdog: boolean) {
  return useMemo(() => {
    const diff = rivalDiff(v);
    return new FakeSocket({
      [RIVAL_EVENTS.sync]: (_p, reply) =>
        reply(RIVAL_EVENTS.update, { gameSessionId: 1, rival: { rivalName: v === 'short' ? f.shortRival : f.rival, rivalAvatar: null, myScore: 37 + diff, rivalScore: 37 } }),
      [E.requestState]: (_p, reply) =>
        reply(E.state, { cash: 140, cashEarned: 60, streak: 3, multiplier: 2, doubleCashMsLeft: 0, shieldHeld: false, hintsHeld: 1, config: { wrongAnswerCost: false, powerUps: true }, lastDelta: { kind: 'correct', delta: 10, multiplier: 2, cost: 0 } }),
      [E.requestReward]: (p, reply) => {
        const { gameCode, roundId } = p as { gameCode: string; roundId: string };
        reply(E.reward, { gameCode, roundId, rarity: underdog ? 'epic' : 'rare', xp: underdog ? 60 : 35, itemId: 'hat-wizard', roundCash: 60, rank: 22, size: 26, underdog });
      },
      [E.requestLocker]: (_p, reply) => reply(E.locker, []),
    });
  }, [f, v, underdog]);
}

function SocketScope({ socket, children }: { socket: FakeSocket; children: ReactNode }) {
  const value = useMemo(() => ({
    socket: socket.asSocket(), isConnected: true, isReconnecting: false, connectionError: null,
    getReconnectAttempt: () => 0, maxReconnectAttempts: 0, manualReconnect: noop,
  }), [socket]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

function GuestAuth({ name, children }: { name: string; children: ReactNode }) {
  const base = useAuth();
  const value = useMemo<AuthContextValue>(() => ({
    ...base,
    loading: false,
    isAuthenticated: true,
    user: { id: 'preview-guest-student', is_anonymous: true } as AuthContextValue['user'],
    profile: { ...base.profile, display_name: name, total_xp: 0 } as AuthContextValue['profile'],
  }), [base, name]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Surfaces 1 + 2: the real round frame with a static board, the round dock and the claim toast. */
export function DockPreview({ v }: { v?: string }) {
  const { t, language } = useLanguage();
  const f = fixtureFor(language);
  const socket = useStudentSocket(f, v, false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ingestLessonClaimsRound({ lessonClaims: raceView(f, 5) });
    let next = 5;
    window.__eduPreview = {
      claim: () => {
        const word = f.words[next];
        ingestLessonClaim({ roundId: 7, index: next, word: word.toUpperCase(), username: f.rival, avatar: { emoji: '🦊' }, teamId: null, claimedCount: next + 1, total: 12, bonus: 3 });
        next += 1;
      },
      mine: () => {
        const word = f.words[next];
        ingestLessonClaim({ roundId: 7, index: next, word: word.toUpperCase(), username: f.me, avatar: { emoji: '🐸' }, teamId: null, claimedCount: next + 1, total: 12, bonus: 3 });
        next += 1;
      },
    };
    setReady(true);
    return () => ingestLessonClaimsRound(null);
  }, [f]);
  const leaderboard = [f.me, f.rival, ...f.classmates].map((username, i) => ({ username, score: 52 - i * 5 }));
  const canvas = (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-2">
      <div className="@container/center [container-type:size] flex min-h-0 min-w-0 flex-1 flex-col justify-start overflow-hidden lg:justify-end">
        <div className="relative -mt-1 mb-0.5 flex h-11 shrink-0 items-center justify-center" />
        <div data-testid="grid-container" className="flex min-h-0 flex-col items-center gap-1 overflow-visible pb-1">
          <div data-testid="grid-frame" className="relative mx-auto aspect-square max-h-full w-[min(720px,100cqi,calc(100cqb-88px))]">
            <GridComponent grid={gridOf(f)} interactive={false} animateOnMount={false} language={language} hideComboIndicator hideWordPreview />
          </div>
        </div>
        <MpRoundTraySlot />
      </div>
    </div>
  );
  if (!ready) return null;
  return (
    <SocketScope socket={socket}>
      <div className="flex h-dvh flex-col">
        <div className={MP_ROUND_CONTAINER_CLASS}>
          <MpRoundLayout
            meId={f.me}
            gameMode="classic"
            remainingTime={74}
            totalTime={120}
            leaderboard={leaderboard}
            foundWords={[{ word: 'magnet', score: 6, isValid: true }, { word: 'orbit', score: 5, isValid: true }]}
            comboLevel={0}
            revealed
            onExit={noop}
            canvas={canvas}
            socket={socket.asSocket() as never}
            dock={<ClassroomRoundDock gameCode={GAME} socket={socket.asSocket()} me={f.me} />}
          />
          <LessonClaimToast socket={socket.asSocket()} me={f.me} t={t as T} dir={language === 'he' ? 'rtl' : 'ltr'} />
        </div>
      </div>
    </SocketScope>
  );
}

/** Surface 4: the real lobby for an anonymous guest with a 3-day local streak. */
export function LobbyHudPreview() {
  const { t, language } = useLanguage();
  const f = fixtureFor(language);
  const [seeded] = useState(() => {
    try {
      window.localStorage.setItem('lexiclash_win_streak', '3');
      window.localStorage.setItem('lexiclash_best_streak', '3');
      window.localStorage.setItem('lexiclash_streak_date', new Date().toISOString());
    } catch {
      return false;
    }
    return true;
  });
  return (
    <GuestAuth name={f.me}>
      <div className="flex h-dvh flex-col" data-seeded={seeded}>
        <EduStudentLobby
          username={f.me}
          avatar={<span className="grid size-full place-items-center text-5xl">🐸</span>}
          onEditAvatar={noop}
          nameSlot={<span dir="auto">{f.me}</span>}
          classmates={[f.me, f.rival, ...f.classmates].map((username) => ({ username }))}
          onExit={noop}
          t={t}
        />
      </div>
    </GuestAuth>
  );
}

/** Surface 5: the name step after the server refused the name, with the fun-name swap. */
export function JoinRefusalPreview() {
  const { t } = useLanguage();
  const [name, setName] = useState('Butthead');
  const flow = {
    code: 'K7Q2WM',
    target: { verdict: 'classroom', label: '7B Science - Physics unit' },
    codeRejected: false,
    isChecking: false,
    showNameField: true,
    name,
    setName,
    nameError: true,
    suggestedName: t('eduStudent.join.funNames').split(/[,،、|]/)[0]?.trim() || 'Bouncy Otter',
    formErrorKey: NAME_NOT_ALLOWED_KEY,
    submit: noop,
    backToCode: noop,
    isSubmitting: false,
    isHolding: false,
    canSubmit: true,
  } as unknown as JoinFlowState;
  return (
    <div className="min-h-dvh bg-neo-navy">
      <main className="mx-auto w-full max-w-md px-4 py-5">
        <JoinNameStep flow={flow} nameRef={{ current: null }} goRef={{ current: null }} />
      </main>
    </div>
  );
}
