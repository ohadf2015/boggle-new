'use client';

/**
 * DEV-ONLY boss fight harness: runs the real pure engine in the browser with simulated students, feeding the
 * same store the socket feeds, so the projector stage and phone strip can be watched and screenshotted.
 * /en/dev/boss?students=12&seconds=90&boss=msGrammar&ff=20&view=projector|phone&speed=1
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProjectorBossStage } from '@/components/education/boss/ProjectorBossStage';
import { PhoneBossStrip } from '@/components/education/boss/PhoneBossStrip';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { applyWord, createBoss, endBossRound, tick, toView, type BossState } from '@/backend/services/classroomBoss/engine';
import { isClassroomBossId } from '@/shared/types/classroomBoss';

const NAMES = ['Maya', 'Leo', 'Priya', 'Noor', 'Kai', 'Tess', 'Otto', 'Yael', 'Ibrahim', 'Sofía', 'Hiro', 'Astrid', 'Daniel', 'Lior', 'Zara', 'Mateo', 'Ines', 'Rafael', 'Ava', 'Omer'];
const WORDS = ['cat', 'tea', 'ear', 'ore', 'sun', 'ink', 'rain', 'note', 'star', 'lion', 'moon', 'cart', 'stone', 'tiger', 'notes', 'rains', 'planet', 'garden', 'monster', 'starlight'];
const SCORE: Record<number, number> = { 3: 10, 4: 25, 5: 50, 6: 100, 7: 200, 8: 400, 9: 800 };
const STEP = 100;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export default function DevBossPage() {
  return (
    <Suspense>
      <DevBoss />
    </Suspense>
  );
}

function DevBoss() {
  const q = useSearchParams();
  const students = Number(q.get('students') ?? 12);
  const seconds = Number(q.get('seconds') ?? 90);
  const ff = Number(q.get('ff') ?? 0) * 1000;
  const speed = Number(q.get('speed') ?? 1);
  const bossParam = q.get('boss');
  const bossId = isClassroomBossId(bossParam) ? bossParam : 'lexiconDragon';
  const view = q.get('view') === 'phone' ? 'phone' : 'projector';
  const scene = q.get('scene');
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const store = useClassroomBossStore.getState();
    store.reset();
    const rand = rng(students * 7919 + seconds);
    const me = NAMES[0];
    let simNow = 0;
    let state: BossState = createBoss({ seed: 'dev', bossId, students, roundSeconds: seconds, rows: 5, cols: 5, now: 0 });
    const perStepWordChance = (students * STEP) / 6000;

    const step = (live: boolean) => {
      simNow += STEP;
      if (state.status === 'fighting' && rand() < perStepWordChance) {
        const word = WORDS[Math.floor(rand() * WORDS.length)];
        const username = NAMES[Math.floor(rand() * Math.min(students, NAMES.length))];
        const r = applyWord(state, { username, word, score: SCORE[word.length] ?? 10, now: simNow });
        state = r.state;
        if (live && r.hit) {
          useClassroomBossStore.getState().receiveState(toView(state, simNow));
          if (username === me) {
            useClassroomBossStore.getState().receiveMyHit(word, { ...r.hit, totalDmg: state.damageBy[me] ?? 0 });
          }
        }
      }
      const t = tick(state, simNow);
      state = t.state;
      if (live && t.attack) useClassroomBossStore.getState().receiveAttack(t.attack);
      if (simNow >= seconds * 1000) state = endBossRound(state);
    };

    while (simNow < ff) step(false);
    if (scene === 'exposed') state = { ...state, exposedUntil: simNow + 60_000 };
    if (scene === 'telegraph') state = tick({ ...state, nextTelegraphAt: simNow }, simNow).state;
    if (scene === 'defeated') {
      for (let i = 0; i < 40 && state.status !== 'defeated'; i++) state = applyWord(state, { username: NAMES[i % 5], word: 'starlight', score: 800, now: simNow }).state;
    }
    useClassroomBossStore.getState().receiveState(toView(state, simNow));
    let lastSent = simNow;
    const id = window.setInterval(() => {
      for (let i = 0; i < speed; i++) step(true);
      if (simNow - lastSent >= 1000 || state.status === 'defeated' || state.status === 'escaped') {
        lastSent = simNow;
        useClassroomBossStore.getState().receiveState(toView(state, simNow));
        setLeft(Math.max(0, Math.ceil(seconds - simNow / 1000)));
      }
      if (state.status === 'defeated' || state.status === 'escaped') window.clearInterval(id);
    }, STEP);
    return () => window.clearInterval(id);
  }, [students, seconds, ff, speed, bossId, scene]);

  if (view === 'phone') {
    return (
      <div className="min-h-[100dvh] bg-neo-navy pt-4">
        <PhoneBossStrip />
        <div className="game-board-frame mx-auto mt-4 grid aspect-square w-[88%] max-w-md grid-cols-5 gap-1.5">
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className="grid place-items-center rounded-lg border-2 border-neo-black bg-neo-cream font-neo-display text-2xl font-black text-neo-black">
              {'STARELIONPGDMTEACRHSUBOKW'[i]}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-[100dvh] flex-col bg-neo-navy">
      <ProjectorBossStage remainingTime={left} />
    </div>
  );
}
