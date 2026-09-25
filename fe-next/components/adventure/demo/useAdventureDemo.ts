'use client';

/**
 * Demo adventure run for guests: World 1, Level 1, read-only.
 * No auth, no tokens, no writeRun/writeCarry, no refreshCoins.
 * Shares scoring + combat + clock logic with useAdventureRun for parity.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isCombatKind, type PlayLevel } from '@/lib/adventure/play/levels';
import { scoreWords } from '@/lib/adventure/play/scoreRun';
import { calculateComboChainWindow } from '@/shared/utils/comboUtils';
import { bossPhase, type BossPhase } from '@/lib/adventure/play/boss';
import {
  initCombat,
  step as combatStep,
  blockedTiles,
  type CombatEvent,
  type CombatFx,
  type CombatState,
} from '@/lib/adventure/play/combat';
import { BASE_HP, POTION_HEAL, POTION_HINTS, POTION_TIME_MS, hintCharges, revealsFullHint, type PotionId } from '@/lib/adventure/play/relics';
import { isWordOnBoard } from '@/utils/clientWordValidator';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { tickClock } from '@/lib/adventure/play/runClock';
import type { RunPhase, SubmitResult, RunResult, EcosystemGains, CombatFxEntry } from '../play/runTypes';

/** The demo is always World 1's first fight. */
const WORLD = 1;

export { type RunPhase, type SubmitResult, type RunResult, type EcosystemGains, type CombatFxEntry };

interface Options {
  language: string;
  isWord: (word: string) => Promise<boolean>;
}

const NO_POTIONS: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
const ATTACK_FX = new Set(['hit', 'drain', 'freeze', 'curse', 'projectile', 'shuffle']);
const FX_FEED = 8;

export function useAdventureDemo({ language, isWord }: Options) {
  const [phase, setPhase] = useState<RunPhase>('loading');
  const [grid, setGrid] = useState<string[][]>([]);
  const [lvl, setLvl] = useState<PlayLevel | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [msLeft, setMsLeft] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [combatFx, setCombatFx] = useState<CombatFxEntry[]>([]);
  const fxSeqRef = useRef(0);

  const lastPointsRef = useRef(0);
  const endAtRef = useRef(0);
  const lastTickRef = useRef(0);
  const combatRef = useRef<CombatState | null>(null);
  const hpRef = useRef(BASE_HP);
  const hasTrackedFinishRef = useRef(false);
  const wordsRef = useRef<string[]>([]);
  const timesRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const scoreRef = useRef(0);
  const pointsRef = useRef<number[]>([]);
  const finishedRef = useRef(false);

  // Load demo board.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/adventure/demo?language=${language}`);
        if (!res.ok) throw new Error(`demo ${res.status}`);
        const data = await res.json();
        setGrid(data.grid);
        setLvl(data.level);
        setMsLeft((data.seconds ?? data.level.seconds) * 1000);
        hpRef.current = BASE_HP;

        setPhase('ready');
      } catch (err) {
        console.error('[demo] load failed', err);
        setPhase('error');
      }
    };
    load();
  }, [language]);

  const dispatchCombat = useCallback((ev: CombatEvent) => {
    const cur = combatRef.current;
    if (!cur) return;
    const next = combatStep(cur, ev);
    combatRef.current = next;
    if (next.fx.length) {
      const entry = { id: ++fxSeqRef.current, fx: next.fx };
      setCombatFx((feed) => [...feed.slice(-5), entry]);
    }
    setCombat(next);
  }, []);

  // Clock tick — same cadence and tickClock as the real run; combat ticks let the foe fight back.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const now = Date.now();
      const paused = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const t = tickClock({ now, endAt: endAtRef.current, lastTick: lastTickRef.current, paused });
      endAtRef.current = t.endAt;
      setMsLeft((prev) => (Math.ceil(prev / 1000) === Math.ceil(t.msLeft / 1000) ? prev : t.msLeft));
      if (combatRef.current && t.dt > 0) dispatchCombat({ type: 'tick', dt: t.dt });
      lastTickRef.current = now;
      if (t.expired) setMsLeft(0);
    }, 200);
    return () => clearInterval(id);
  }, [phase, dispatchCombat]);

  const start = useCallback(() => {
    if (!lvl) return;
    trackGrowthEvent('adventure_demo_started', {});
    const now = Date.now();
    endAtRef.current = now + msLeft;
    lastTickRef.current = now;
    startedAtRef.current = now;
    hasTrackedFinishRef.current = false;
    finishedRef.current = false;
    // Same foe rules as the real run (useAdventureRun.begin): an ordinary fight
    // gets a rival whose HP is the top-star bar.
    const combatLvl = isCombatKind(lvl.kind);
    combatRef.current = initCombat({
      enemyId: combatLvl ? lvl.enemyId ?? `${lvl.kind}-w${WORLD}` : `foe-w${WORLD}`,
      world: WORLD,
      enemyHp: combatLvl ? lvl.bossHp : Math.max(1, lvl.stars[2]),
      hp: BASE_HP,
      maxHp: BASE_HP,
      relics: [],
      size: grid.length,
      seed: 'adventure-demo',
    });
    setCombat(combatRef.current);
    setPhase('playing');
  }, [lvl, msLeft, grid.length]);

  // Mirrors useAdventureRun.submitWord exactly (a guest has no relics).
  const submit = useCallback(
    async (raw: string): Promise<SubmitResult> => {
      if (phase !== 'playing' || !lvl) return 'idle';
      const w = raw.toLowerCase().trim();
      if (w.length < lvl.minLength) return 'short';
      if (wordsRef.current.includes(w)) return 'dup';
      if (!isWordOnBoard(w, grid.map((r) => r.map((c) => c.toLowerCase())), language)) return 'invalid';
      if (!(await isWord(w))) return 'invalid';
      if (wordsRef.current.includes(w)) return 'dup';
      wordsRef.current = [...wordsRef.current, w];
      timesRef.current = [...timesRef.current, Math.max(0, Date.now() - startedAtRef.current)];
      setWords(wordsRef.current);
      const pts = scoreWords(wordsRef.current, { relics: [], kind: lvl.kind, language, times: timesRef.current }).points;
      lastPointsRef.current = pts[pts.length - 1] ?? 0;
      pointsRef.current = pts;
      scoreRef.current = pts.reduce((a, b) => a + b, 0);
      if (combatRef.current) dispatchCombat({ type: 'word', word: w, points: lastPointsRef.current });
      return 'ok';
    },
    [phase, lvl, grid, language, isWord, dispatchCombat],
  );

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const won = combatRef.current ? combatRef.current.enemyHp <= 0 : scoreRef.current > 0;
    const stars = lvl ? lvl.stars.filter((bar) => scoreRef.current >= bar).length : 0;
    // A demo result is display-only: nothing here is ever sent to the server.
    const r: RunResult = {
      won,
      score: scoreRef.current,
      stars,
      bestStars: stars,
      rewards: [],
      validWords: wordsRef.current,
      totalStars: stars,
      points: pointsRef.current,
    };

    setResult(r);
    setPhase('done');

    // Track demo finish event.
    if (!hasTrackedFinishRef.current) {
      hasTrackedFinishRef.current = true;
      trackGrowthEvent('adventure_demo_finished', { won, score: scoreRef.current });
    }
  }, [lvl]);

  // Auto-finish when time runs out or enemy defeated.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (msLeft <= 0 || (combat && combat.enemyHp <= 0)) {
      finish();
    }
  }, [phase, msLeft, combat, finish]);

  return {
    phase,
    grid,
    lvl,
    words,
    msLeft,
    result,
    combat,
    combatFx,
    start,
    submit,
  };
}
