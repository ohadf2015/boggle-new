'use client';

/**
 * Client state for the FOG and BOMB level kinds. Presentation + client rules
 * only — the server scores any valid board word regardless (see rules.ts).
 * ponytail: a bomb penalty only pulls the CLIENT deadline in; settleRun only
 * rejects attempts that run LONG, so finishing early is always accepted.
 * Wiring: GridComponent `onPathSubmit` → `onPath` (fires before onWordSubmit),
 * then `accept()` when the run hook says the word was 'ok'.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayLevel } from '@/lib/adventure/play/levels';
import { makeRng } from '@/lib/adventure/play/rng';
import { defuseBombs, fogVisible, initBombs, tickBombs, type BombState, type Cell } from './rules';

export interface BoardPop { id: number; key: string; kind: 'boom' | 'defused'; seconds?: number }

interface Options {
  lvl: PlayLevel | null;
  playing: boolean;
  grid: string[][];
  /** Seconds penalty sink (negative = lose time). */
  onShiftClock?: (ms: number) => void;
  onBoom?: () => void;
  onDefuse?: () => void;
}

/** Idle this long without a word and the fog starts to thin, one ring per step. */
const FOG_IDLE_MS = 20000;
const FOG_STEP_MS = 12000;

/** The fuse state a player can actually read: which bombs, whole seconds left. */
const shownFuses = (s: BombState) => s.bombs.map((b) => `${b.key}:${Math.ceil(b.leftMs / 1000)}`).join(',');

export function bombSetup(lvl: Pick<PlayLevel, 'world' | 'size' | 'twist'>) {
  const count = 2 + (lvl.size >= 6 ? 1 : 0) + (lvl.twist ? 1 : 0);
  const fuseMs = Math.max(14000, Math.min(22000, 22000 - (lvl.world - 4) * 1000)) - (lvl.twist ? 2000 : 0);
  return { count, fuseMs };
}

export function useLevelVariant({ lvl, playing, grid, onShiftClock, onBoom, onDefuse }: Options) {
  const size = grid.length;
  const isFog = lvl?.kind === 'fog';
  const isBomb = lvl?.kind === 'bomb';
  const seed = useMemo(() => grid.map((r) => r.join('')).join('|'), [grid]);

  const pathRef = useRef<Cell[] | null>(null);
  const randRef = useRef<() => number>(() => 0.5);
  const [lastPath, setLastPath] = useState<Cell[] | null>(null);
  const [expand, setExpand] = useState(0);
  const lastWordAtRef = useRef(0);
  const [bombs, setBombs] = useState<BombState | null>(null);
  const bombsRef = useRef<BombState | null>(null);
  // What the board actually SHOWS of a fuse: the whole seconds left on each
  // live bomb. The fuse is ticked 4×/s for accuracy, but committing all four
  // ticks re-rendered the level screen on top of the run clock's own 5×/s —
  // two out-of-phase render drivers, which is why a bomb level felt heavier
  // than every other kind. Commit only when that displayed state changes.
  const shownRef = useRef('');
  const [pops, setPops] = useState<BoardPop[]>([]);

  // New board: reset everything, seed the fog opening + the bomb dealer.
  useEffect(() => {
    randRef.current = makeRng(`variant:${seed}`);
    pathRef.current = null;
    setLastPath(null);
    setExpand(0);
    setPops([]);
    bombsRef.current = null;
    shownRef.current = '';
    setBombs(null);
  }, [seed]);

  const fogStart = useMemo<Cell>(() => {
    const r = makeRng(`fog:${seed}`);
    const lo = size > 3 ? 1 : 0;
    const span = Math.max(1, size - 2 * lo);
    return [lo + Math.floor(r() * span), lo + Math.floor(r() * span)];
  }, [seed, size]);

  // Arm bombs when play starts.
  useEffect(() => {
    if (!isBomb || !playing || !lvl || bombsRef.current || !size) return;
    const { count, fuseMs } = bombSetup(lvl);
    bombsRef.current = initBombs(size, count, randRef.current, fuseMs);
    shownRef.current = shownFuses(bombsRef.current);
    setBombs(bombsRef.current);
  }, [isBomb, playing, lvl, size]);

  const pop = useCallback((key: string, kind: BoardPop['kind'], seconds?: number) => {
    setPops((p) => [...p.slice(-5), { id: Date.now() + Math.random(), key, kind, seconds }]);
  }, []);

  // Fuse clock.
  useEffect(() => {
    if (!isBomb || !playing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const cur = bombsRef.current;
      if (!cur) return;
      const now = Date.now();
      const { state, exploded, penaltyMs } = tickBombs(cur, now - last, randRef.current);
      last = now;
      bombsRef.current = state;
      const shown = shownFuses(state);
      if (shown !== shownRef.current) { shownRef.current = shown; setBombs(state); }
      if (exploded.length) {
        exploded.forEach((k) => pop(k, 'boom', Math.round(penaltyMs / exploded.length / 1000)));
        onShiftClock?.(-penaltyMs);
        onBoom?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [isBomb, playing, onShiftClock, onBoom, pop]);

  // Fog thins while you're stuck.
  useEffect(() => {
    if (!isFog || !playing) return;
    lastWordAtRef.current = Date.now();
    const id = setInterval(() => {
      const idle = Date.now() - lastWordAtRef.current;
      setExpand(idle < FOG_IDLE_MS ? 0 : 1 + Math.floor((idle - FOG_IDLE_MS) / FOG_STEP_MS));
    }, 1000);
    return () => clearInterval(id);
  }, [isFog, playing]);

  const onPath = useCallback((cells: Array<{ row: number; col: number }>) => {
    pathRef.current = cells.map((c) => [c.row, c.col] as Cell);
  }, []);

  /** The word just submitted was accepted: move the fog, defuse bombs on its path. */
  const accept = useCallback(() => {
    const path = pathRef.current;
    pathRef.current = null;
    if (!path?.length) return;
    if (isFog) {
      setLastPath(path);
      setExpand(0);
      lastWordAtRef.current = Date.now();
    }
    if (isBomb && bombsRef.current) {
      const { state, defused } = defuseBombs(bombsRef.current, path, randRef.current);
      if (defused.length) {
        bombsRef.current = state;
        shownRef.current = shownFuses(state);
        setBombs(state);
        defused.forEach((k) => pop(k, 'defused'));
        onDefuse?.();
      }
    }
  }, [isFog, isBomb, pop, onDefuse]);

  /** The submitted word was rejected: forget its path so it can't defuse anything later. */
  const discard = useCallback(() => { pathRef.current = null; }, []);

  // Fog levels are never combat kinds (levels.ts), so this filter never stacks with frozen tiles.
  const fog = useMemo(() => (isFog && size
    ? fogVisible(size, lastPath, { start: fogStart, blackout: lvl?.twist === 'blackout', expand })
    : null), [isFog, size, lastPath, fogStart, lvl?.twist, expand]);

  const cellFilter = useCallback((r: number, c: number) => !fog || fog.has(`${r}-${c}`), [fog]);

  return { active: isFog || isBomb, fog, fogThinning: isFog && expand > 0, bombs, pops, onPath, accept, discard, cellFilter };
}
