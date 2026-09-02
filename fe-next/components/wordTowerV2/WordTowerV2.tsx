'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { generateWheel } from '@/lib/wordTower/wordTowerManager';
import { type CraneSwing, releaseKinematics } from '@/lib/wordTowerV2/crane';
import {
  createTowerWorld,
  getTowerHeightM,
  moveAttachedBlock,
  releaseBlock,
  spawnBlock,
  stepWorld,
} from '@/lib/wordTowerV2/engine';
import { BLOCK_HEIGHT_PX, blockWidthForWord, scoreFromHeightM } from '@/lib/wordTowerV2/scoring';
import TowerCanvas, { type FrameStats } from './TowerCanvas';

/**
 * Word Tower v2.
 *
 * Two beats per turn: spell a word, then time the drop. The word decides how
 * WIDE the block is — long words buy a better platform rather than a number —
 * and physics decides everything after release. Nothing here can topple the
 * tower on a rule; only the simulation can.
 */

const SWING: CraneSwing = { amplitudeRad: 0.62, periodMs: 2200, phase: 0 };
/** How far above the tower top the crane hangs. */
const CRANE_CLEARANCE_PX = 230;
const MIN_WORD_LEN = 3;

type Phase = 'composing' | 'swinging';

function canBuildFromWheel(word: string, wheel: string[]): boolean {
  const pool = new Map<string, number>();
  for (const letter of wheel) pool.set(letter, (pool.get(letter) ?? 0) + 1);

  for (const letter of word) {
    const left = pool.get(letter) ?? 0;
    if (left === 0) return false;
    pool.set(letter, left - 1);
  }

  return true;
}

export default function WordTowerV2() {
  const { t, language } = useLanguage();

  const worldRef = useRef(createTowerWorld({ seed: 1 }));
  const labelsRef = useRef(new Map<string, string>());
  const dictRef = useRef<Set<string> | null>(null);

  const [dictReady, setDictReady] = useState(false);
  const [dictError, setDictError] = useState(false);
  const [wheel, setWheel] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('composing');
  const [heightM, setHeightM] = useState(0);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [rejected, setRejected] = useState(false);

  // The hanging block, tracked outside React state: the rAF loop moves it every
  // frame and must never trigger a re-render to do so.
  const hangingRef = useRef<{ id: string; startedAt: number } | null>(null);
  const droppedRef = useRef(0);
  const seededRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // Language covers more locales than the word-craft dictionary ships; an
    // unsupported one simply never resolves and the Hoist button stays disabled.
    setDictError(false);
    loadWordCraftDictionary(language as Parameters<typeof loadWordCraftDictionary>[0])
      .then((set) => {
        if (cancelled) return;
        dictRef.current = set;
        setDictReady(true);
      })
      .catch(() => {
        // Without this the Hoist button just stays disabled forever with no
        // explanation — the screen reads as broken rather than as "retry me".
        if (!cancelled) {
          setDictReady(false);
          setDictError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    setWheel(generateWheel('word-tower-v2', 'local', language, 0));
  }, [language]);

  /**
   * `?demo=1` builds a tower before first paint.
   *
   * Without it the page opens on an empty field, which makes the mode
   * impossible to review against a screenshot of any other stacking game — the
   * comparison would be "empty screen versus game" every time.
   */
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('demo')) return;
    // Seeding must be idempotent. React StrictMode double-invokes effects, which
    // ran this twice: the block ids collided so the Map kept 8 entries while the
    // world held 16 bodies, and the tower silently reported double height.
    if (seededRef.current) return;
    seededRef.current = true;

    const world = worldRef.current;
    const words = ['tower', 'slab', 'anchor', 'crane', 'brick', 'ledge', 'beam', 'stack'];

    words.forEach((word, index) => {
      const id = `demo-${index}`;
      labelsRef.current.set(id, word);
      spawnBlock(world, {
        id,
        // A slight alternating drift so the stack reads as hand-placed rather
        // than as a column snapped to a grid.
        x: (index % 2 === 0 ? 1 : -1) * index * 2.6,
        y: -(getTowerHeightM(world) * 32 + 170),
        widthPx: blockWidthForWord(word),
        heightPx: BLOCK_HEIGHT_PX,
        vx: 0,
      });
      for (let t = 0; t < 900; t += 16.667) stepWorld(world, 16.667);
    });

    droppedRef.current = words.length;
    setHeightM(getTowerHeightM(world));
  }, []);

  /** Drives the crane: the hanging block follows the swing until released. */
  const onBeforeStep = useCallback((nowMs: number) => {
    const hanging = hangingRef.current;
    if (!hanging) return;

    const world = worldRef.current;
    const { x } = releaseKinematics(nowMs - hanging.startedAt, SWING, 0);
    const y = -(getTowerHeightM(world) * 32 + CRANE_CLEARANCE_PX);

    moveAttachedBlock(world, hanging.id, x, y);
  }, []);

  const submitWord = useCallback(() => {
    const word = typed.toLowerCase();

    if (word.length < MIN_WORD_LEN || !canBuildFromWheel(word, wheel) || !dictRef.current?.has(word)) {
      setRejected(true);
      window.setTimeout(() => setRejected(false), 420);
      return;
    }

    const id = `b${droppedRef.current}`;
    droppedRef.current += 1;
    labelsRef.current.set(id, word);

    spawnBlock(worldRef.current, {
      id,
      x: 0,
      y: -(getTowerHeightM(worldRef.current) * 32 + CRANE_CLEARANCE_PX),
      widthPx: blockWidthForWord(word),
      heightPx: BLOCK_HEIGHT_PX,
      vx: 0,
      attached: true,
    });

    hangingRef.current = { id, startedAt: performance.now() };
    setTyped('');
    setPhase('swinging');
  }, [typed, wheel]);

  const drop = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging) return;

    const { vx, spin } = releaseKinematics(performance.now() - hanging.startedAt, SWING, 0);
    releaseBlock(worldRef.current, hanging.id, vx, spin);
    hangingRef.current = null;
    setPhase('composing');
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (phase === 'swinging') drop();
        else submitWord();
        return;
      }
      if (phase !== 'composing') return;

      if (event.key === 'Backspace') setTyped((w) => w.slice(0, -1));
      else if (event.key === 'Enter') submitWord();
      else if (/^[a-zA-Z]$/.test(event.key)) setTyped((w) => w + event.key.toLowerCase());
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, drop, submitWord]);

  // Poll measured height for the HUD. The tower's height is whatever physics
  // says it is, so there is no running total that can disagree with the screen.
  useEffect(() => {
    const id = window.setInterval(() => setHeightM(getTowerHeightM(worldRef.current)), 120);
    return () => window.clearInterval(id);
  }, []);

  const score = useMemo(() => scoreFromHeightM(heightM), [heightM]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neo-navy">
      <TowerCanvas
        world={worldRef.current}
        labels={labelsRef.current}
        onFrameStats={setStats}
        onBeforeStep={onBeforeStep}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border-4 border-neo-navy bg-neo-lime px-3 py-1 font-fredoka text-2xl font-bold text-neo-navy shadow-[4px_4px_0_0_#12162b]">
            {heightM.toFixed(1)}m
          </div>
          {/* This mode is a beta preview — say so on the screen, not just in
              the route gate, so testers know what they are reporting on. */}
          <div className="rounded-md border-2 border-neo-navy bg-neo-pink px-2 py-0.5 font-fredoka text-xs font-bold uppercase tracking-widest text-neo-white shadow-[3px_3px_0_0_#12162b]">
            {t('common.beta', 'Beta')}
          </div>
        </div>
        <div className="font-fredoka text-lg font-bold text-neo-white">{score}</div>
        {stats ? (
          <div className="font-mono text-[11px] text-neo-white/60">
            {stats.fps}fps · p95 {stats.p95Ms}ms · {stats.bodies}
          </div>
        ) : null}
      </div>

      {/* Opaque dock. The canvas reserves this height, but a tall tower still
          extends past it — without a solid surface the blocks show through
          between the letter buttons. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 border-t-4 border-[#2a3050] bg-neo-navy px-4 pb-5 pt-4">
        {phase === 'composing' ? (
          <>
            {/* Only render the word slate once there is a word. An always-on
                empty box floated over the tower as a blank white rectangle. */}
            {typed ? (
              <div
                className={`rounded-xl border-4 border-neo-navy px-5 py-2 font-fredoka text-3xl font-bold uppercase tracking-widest text-neo-navy shadow-[5px_5px_0_0_#12162b] ${
                  rejected ? 'animate-shake bg-neo-pink' : 'bg-neo-white'
                }`}
              >
                {typed}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-center gap-2">
              {wheel.map((letter, index) => (
                <button
                  key={`${letter}-${index}`}
                  type="button"
                  onClick={() => setTyped((w) => w + letter)}
                  className="h-14 w-14 rounded-xl border-4 border-neo-navy bg-neo-cyan font-fredoka text-2xl font-bold uppercase text-neo-navy shadow-[4px_4px_0_0_#12162b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#12162b]"
                >
                  {letter}
                </button>
              ))}
            </div>

            {dictError ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border-4 border-neo-navy bg-neo-red px-8 py-3 font-fredoka text-base font-bold uppercase text-neo-navy shadow-[5px_5px_0_0_#12162b]"
              >
                {t('wordTower.loadError')}
              </button>
            ) : (
              <button
                type="button"
                onClick={submitWord}
                disabled={!dictReady}
                className="rounded-xl border-4 border-neo-navy bg-neo-lime px-8 py-3 font-fredoka text-xl font-bold uppercase text-neo-navy shadow-[5px_5px_0_0_#12162b] disabled:opacity-50"
              >
                {t('wordTowerV2.hoist', 'Hoist')}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={drop}
            className="rounded-2xl border-4 border-neo-navy bg-neo-pink px-16 py-5 font-fredoka text-3xl font-bold uppercase text-neo-white shadow-[6px_6px_0_0_#12162b] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0_0_#12162b]"
          >
            {t('wordTowerV2.drop', 'Drop')}
          </button>
        )}
      </div>
    </div>
  );
}
