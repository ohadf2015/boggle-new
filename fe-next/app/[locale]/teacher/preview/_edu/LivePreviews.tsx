'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SocketContext } from '@/utils/SocketContext';
import GridComponent from '@/components/GridComponent';
import { MpRoundLayout } from '@/components/multiplayer/round/MpRoundLayout';
import { MpRoundTraySlot } from '@/components/multiplayer/round/MpRoundTray';
import { MP_ROUND_CONTAINER_CLASS } from '@/components/multiplayer/round/roundContainer';
import { ClassroomRoundDock } from '@/components/education/live/ClassroomRoundDock';
import { EduStudentLobby } from '@/components/education/live/EduStudentLobby';
import { ClassroomStreakFlame } from '@/components/education/economy/ClassroomStreakFlame';
import { LessonClaimToast } from '@/components/education/live/LessonClaimToast';
import { ingestLessonClaim, ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';
import { CLASSROOM_ECONOMY_EVENTS as E } from '@/shared/constants/classroomEconomy';
import { RIVAL_EVENTS } from '@/shared/types/rivalry';
import { FakeSocket } from './fakeSocket';
import { fixtureFor, gridOf, raceView, type PreviewFixture } from './fixtures';

type T = (key: string, params?: Record<string, string | number>) => string;
const GAME = 'PRV123';
const noop = () => undefined;

export const LIVE_PREVIEW_STATES = ['edu-combo', 'edu-rival', 'edu-claim', 'edu-arrivals'] as const;

/** The student lobby while classmates walk in: one arrival every 1.5s, each popping onto the wall. */
export function LobbyArrivalsPreview() {
  const { t, language } = useLanguage();
  const f = fixtureFor(language);
  const everyone = useMemo(() => [f.me, f.shortRival, ...f.classmates], [f]);
  const [count, setCount] = useState(2);
  useEffect(() => {
    if (count >= everyone.length) return undefined;
    const timer = window.setTimeout(() => setCount((n) => n + 1), 1500);
    return () => window.clearTimeout(timer);
  }, [count, everyone.length]);
  return (
    <div className="flex h-dvh flex-col">
      <EduStudentLobby
        username={f.me}
        avatar={<span className="grid size-full place-items-center text-5xl">🐸</span>}
        onEditAvatar={noop}
        nameSlot={<span dir="auto">{f.me}</span>}
        classmates={everyone.slice(0, count).map((username) => ({ username }))}
        readySlot={
          <button type="button" className="min-h-14 w-full rounded-neo border-4 border-neo-black bg-neo-lime font-neo-display text-xl font-black uppercase text-neo-black shadow-hard">
            {t('eduStudent.lobby.readySticker')}
          </button>
        }
        onExit={noop}
        t={t as T}
      />
    </div>
  );
}

interface Scene {
  streak: number;
  multiplier: number;
  rivalDiff: number;
  overtake: boolean;
  claim: 'mine' | 'other' | null;
}

function sceneFor(state: string, v: string | undefined): Scene {
  const base: Scene = { streak: 3, multiplier: 2, rivalDiff: -4, overtake: false, claim: null };
  if (state === 'edu-combo') {
    const streak = Number(v ?? 3) || 0;
    return { ...base, streak, multiplier: streak >= 6 ? 3 : streak >= 3 ? 2 : 1 };
  }
  if (state === 'edu-rival') {
    if (v === 'ahead') return { ...base, rivalDiff: 6 };
    if (v === 'overtake') return { ...base, rivalDiff: 2, overtake: true };
    return { ...base, rivalDiff: -5 };
  }
  if (state === 'edu-claim') return { ...base, claim: v === 'other' ? 'other' : 'mine' };
  return base;
}

function useSceneSocket(f: PreviewFixture, scene: Scene) {
  return useMemo(() => {
    const rival = (diff: number) => ({ rivalName: f.shortRival, rivalAvatar: null, myScore: 37 + diff, rivalScore: 37 });
    const socket = new FakeSocket({
      [RIVAL_EVENTS.sync]: (_p, reply) => reply(RIVAL_EVENTS.update, { gameSessionId: 1, rival: rival(scene.overtake ? -3 : scene.rivalDiff) }),
      [E.requestState]: (_p, reply) =>
        reply(E.state, { cash: 140, cashEarned: 60, streak: scene.streak, multiplier: scene.multiplier, doubleCashMsLeft: 0, shieldHeld: false, hintsHeld: 1, config: { wrongAnswerCost: false, powerUps: true }, lastDelta: { kind: 'correct', delta: 10, multiplier: scene.multiplier, cost: 0 } }),
      [E.requestLocker]: (_p, reply) => reply(E.locker, []),
    });
    return { socket, overtake: () => socket.fire(RIVAL_EVENTS.update, { gameSessionId: 1, rival: rival(scene.rivalDiff), tookLead: true }) };
  }, [f, scene]);
}

/** Round states for the merged rival/race row, the flame and the claim burst; the economy dock needs the student URL flag. */
export function LiveRoundPreview({ state, v }: { state: string; v?: string }) {
  const { t, language } = useLanguage();
  const f = fixtureFor(language);
  const scene = useMemo(() => sceneFor(state, v), [state, v]);
  const { socket, overtake } = useSceneSocket(f, scene);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('classroom') !== 'true') {
      url.searchParams.set('classroom', 'true');
      window.history.replaceState(null, '', url.toString());
    }
    ingestLessonClaimsRound({ lessonClaims: raceView(f, 5) });
    setReady(true);
    const timers: number[] = [];
    if (scene.overtake) timers.push(window.setTimeout(overtake, 900));
    if (scene.claim) {
      timers.push(window.setTimeout(() => {
        const who = scene.claim === 'mine' ? f.me : f.shortRival;
        ingestLessonClaim({ roundId: 7, index: 5, word: f.words[5].toUpperCase(), username: who, avatar: { emoji: scene.claim === 'mine' ? '🐸' : '🦊' }, teamId: null, claimedCount: 6, total: 12, bonus: 3 });
      }, 400));
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      ingestLessonClaimsRound(null);
    };
  }, [f, scene, overtake]);

  const value = useMemo(() => ({
    socket: socket.asSocket(), isConnected: true, isReconnecting: false, connectionError: null,
    getReconnectAttempt: () => 0, maxReconnectAttempts: 0, manualReconnect: noop,
  }), [socket]);

  if (!ready) return null;
  const leaderboard = [f.me, f.shortRival, ...f.classmates].map((username, i) => ({ username, score: 52 - i * 5 }));
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
  return (
    <SocketContext.Provider value={value}>
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
            hudBadge={<ClassroomStreakFlame comboLevel={0} />}
          />
          <LessonClaimToast socket={socket.asSocket()} me={f.me} t={t as T} dir={language === 'he' ? 'rtl' : 'ltr'} />
        </div>
      </div>
    </SocketContext.Provider>
  );
}
