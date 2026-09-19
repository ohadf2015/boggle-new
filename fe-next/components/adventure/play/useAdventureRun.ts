'use client';

/**
 * One adventure run: fetch a server-dealt board, play the clock, send the
 * word list to /complete. Score shown here uses the same `wordPoints` the
 * server credits, so what the player sees is what they get.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayLevel } from '@/lib/adventure/play/levels';
import { wordPoints } from '@/lib/adventure/play/scoreRun';
import { bossPhase, bossAttackIntervalMs, FREEZE_MS, FROZEN_TILES, type BossPhase } from '@/lib/adventure/play/boss';
import { isWordOnBoard } from '@/utils/clientWordValidator';
import { fetchWithAuth } from '@/utils/authFetch';

export type RunPhase = 'loading' | 'error' | 'ready' | 'playing' | 'saving' | 'done';
export type SubmitResult = 'ok' | 'dup' | 'short' | 'invalid' | 'idle';

export interface RunResult {
  score: number;
  stars: number;
  bestStars: number;
  won: boolean;
  rewards: string[];
  validWords: string[];
  totalStars: number;
}

interface Options {
  world: number;
  level: number;
  language: string;
  isWord: (word: string) => Promise<boolean>;
}

export function useAdventureRun({ world, level, language, isWord }: Options) {
  const [phase, setPhase] = useState<RunPhase>('loading');
  const [grid, setGrid] = useState<string[][]>([]);
  const [lvl, setLvl] = useState<PlayLevel | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [msLeft, setMsLeft] = useState(0);
  const [frozen, setFrozen] = useState<Set<string>>(new Set());
  const [bossHits, setBossHits] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  const tokenRef = useRef('');
  const wordsRef = useRef<string[]>([]);
  const endAtRef = useRef(0);
  const finishingRef = useRef(false);

  const score = useMemo(() => words.reduce((s, w) => s + wordPoints(w), 0), [words]);
  const bossHp = lvl?.isBoss ? Math.max(0, lvl.bossHp - score) : 0;
  const boss: BossPhase | null = lvl?.isBoss ? bossPhase(bossHp, lvl.bossHp) : null;

  // Deal the board.
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setWords([]);
    wordsRef.current = [];
    setResult(null);
    setFrozen(new Set());
    finishingRef.current = false;
    fetchWithAuth('/api/adventure/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ world, level, language }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`start ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        tokenRef.current = data.token;
        setGrid(data.grid);
        setLvl(data.level);
        setMsLeft(data.level.seconds * 1000);
        setPhase('ready');
      })
      .catch((err) => {
        console.error('[adventure] start failed', err);
        if (!cancelled) setPhase('error');
      });
    return () => { cancelled = true; };
  }, [world, level, language, attempt]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase('saving');
    try {
      const res = await fetchWithAuth('/api/adventure/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRef.current, words: wordsRef.current }),
      });
      if (!res.ok) throw new Error(`complete ${res.status}`);
      setResult(await res.json());
      setPhase('done');
    } catch (err) {
      console.error('[adventure] complete failed', err);
      setPhase('error');
    }
  }, []);

  const begin = useCallback(() => {
    if (!lvl) return;
    endAtRef.current = Date.now() + lvl.seconds * 1000;
    setPhase('playing');
  }, [lvl]);

  // Clock.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setMsLeft(left);
      if (left === 0) void finish();
    }, 200);
    return () => clearInterval(id);
  }, [phase, finish]);

  // Boss attacks: freeze tiles for a moment; faster when enraged.
  useEffect(() => {
    if (phase !== 'playing' || !lvl?.isBoss || boss === 'defeated') return;
    const id = setTimeout(() => {
      const keys: string[] = [];
      const size = grid.length;
      while (keys.length < Math.min(FROZEN_TILES, size * size)) {
        const k = `${Math.floor(Math.random() * size)}-${Math.floor(Math.random() * size)}`;
        if (!keys.includes(k)) keys.push(k);
      }
      setFrozen(new Set(keys));
      setBossHits((n) => n + 1);
      setTimeout(() => setFrozen(new Set()), FREEZE_MS);
    }, bossAttackIntervalMs(world, boss === 'enraged'));
    return () => clearTimeout(id);
  }, [phase, lvl, boss, bossHits, grid.length, world]);

  // Boss down = run over.
  useEffect(() => {
    if (phase === 'playing' && boss === 'defeated') void finish();
  }, [phase, boss, finish]);

  const submitWord = useCallback(
    async (raw: string): Promise<SubmitResult> => {
      if (phase !== 'playing' || !lvl) return 'idle';
      const w = raw.toLowerCase().trim();
      if (w.length < lvl.minLength) return 'short';
      if (wordsRef.current.includes(w)) return 'dup';
      if (!isWordOnBoard(w, grid.map((r) => r.map((c) => c.toLowerCase())), language)) return 'invalid';
      if (!(await isWord(w))) return 'invalid';
      if (wordsRef.current.includes(w)) return 'dup';
      wordsRef.current = [...wordsRef.current, w];
      setWords(wordsRef.current);
      return 'ok';
    },
    [phase, lvl, grid, language, isWord],
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    phase, grid, lvl, words, score, msLeft, frozen, bossHp, boss, bossHits, result,
    begin, submitWord, retry,
  };
}
