'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeHebrewFinalForms } from '@/lib/word-vault/engine/wordConstraintEngine';

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

const GRID_SIZE = 5;
const TARGET_WORDS = ['אש', 'שלהבת', 'אור', 'בער'] as const;
const SECRET_WORD = 'אש';

const HE_FILLER_LETTERS = [
  'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ת',
];

type Cell = {
  row: number;
  col: number;
  letter: string;
  /** Faint glow level — 0 = invisible, 1 = brightest. The two target letters get a higher seed. */
  seedGlow: number;
};

/** Build a 5×5 grid where א and ש are adjacent and faintly brighter than others. */
function buildGrid(): Cell[] {
  // Pick a random spot for א, then place ש in an adjacent cell.
  const total = GRID_SIZE * GRID_SIZE;
  const indices = Array.from({ length: total }, (_, i) => i);
  shuffle(indices);

  const fillLetters = [...HE_FILLER_LETTERS];
  shuffle(fillLetters);

  // Random anchor for א
  const aleph = indices[0];
  const aleph_r = Math.floor(aleph / GRID_SIZE);
  const aleph_c = aleph % GRID_SIZE;
  // Adjacent for ש
  const adj = adjacentIndices(aleph_r, aleph_c);
  shuffle(adj);
  const shin = adj[0];

  const cells: Cell[] = [];
  for (let i = 0; i < total; i += 1) {
    const r = Math.floor(i / GRID_SIZE);
    const c = i % GRID_SIZE;
    let letter: string;
    let seedGlow = 0.06; // very dim base
    if (i === aleph) {
      letter = 'א';
      seedGlow = 0.22;
    } else if (i === shin) {
      letter = 'ש';
      seedGlow = 0.22;
    } else {
      letter = fillLetters[i % fillLetters.length];
    }
    cells.push({ row: r, col: c, letter, seedGlow });
  }
  return cells;
}

function adjacentIndices(r: number, c: number): number[] {
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        out.push(nr * GRID_SIZE + nc);
      }
    }
  }
  return out;
}

function isAdjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / GRID_SIZE);
  const ac = a % GRID_SIZE;
  const br = Math.floor(b / GRID_SIZE);
  const bc = b % GRID_SIZE;
  return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1 && !(ar === br && ac === bc);
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function DarkDoorScene({ onSolved, onExit }: Props) {
  const [cells] = useState<Cell[]>(() => buildGrid());
  const [trace, setTrace] = useState<number[]>([]);
  const [tracing, setTracing] = useState(false);
  const [emberLevel, setEmberLevel] = useState(0); // 0..1 brightness of room
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [whisper, setWhisper] = useState<string | null>(null);
  const traceRef = useRef<number[]>([]);

  const word = useMemo(
    () => trace.map((i) => cells[i]?.letter ?? '').join(''),
    [trace, cells],
  );

  // Reveal hint after 25s of inactivity
  useEffect(() => {
    if (solved) return;
    const t = setTimeout(() => setShowHint(true), 25_000);
    return () => clearTimeout(t);
  }, [solved]);

  const startTrace = useCallback((idx: number) => {
    if (solved) return;
    setTracing(true);
    traceRef.current = [idx];
    setTrace([idx]);
  }, [solved]);

  const extendTrace = useCallback((idx: number) => {
    if (!tracing || solved) return;
    const last = traceRef.current[traceRef.current.length - 1];
    if (last === idx) return;
    if (traceRef.current.includes(idx)) {
      // Walking backward — pop
      if (traceRef.current[traceRef.current.length - 2] === idx) {
        traceRef.current = traceRef.current.slice(0, -1);
        setTrace([...traceRef.current]);
      }
      return;
    }
    if (!isAdjacent(last, idx)) return;
    traceRef.current = [...traceRef.current, idx];
    setTrace([...traceRef.current]);
  }, [tracing, solved]);

  const endTrace = useCallback(() => {
    if (!tracing) return;
    setTracing(false);

    const traced = traceRef.current.map((i) => cells[i]?.letter ?? '').join('');
    const norm = normalizeHebrewFinalForms(traced);

    // Secret word — full solve
    if (norm === normalizeHebrewFinalForms(SECRET_WORD)) {
      setSolved(true);
      setEmberLevel(1);
      setWhisper('"חזור, קטנטן!"');
      setTimeout(() => onSolved(), 2400);
      return;
    }

    // Other valid target word — small ember bloom (encouragement)
    const isOther = TARGET_WORDS.some(
      (w) => normalizeHebrewFinalForms(w) === norm,
    );
    if (isOther) {
      setEmberLevel((e) => Math.min(0.7, e + 0.25));
      setWhisper('משהו נשרף בעדינות. אבל לא הדלת.');
      setTimeout(() => setWhisper(null), 1800);
    }

    // Reset trace either way (after a small beat for visual feedback)
    setTimeout(() => setTrace([]), 250);
    traceRef.current = [];
  }, [tracing, cells, onSolved]);

  const traceSet = useMemo(() => new Set(trace), [trace]);

  return (
    <div
      className="relative h-full min-h-[100dvh] w-full overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 65%, rgba(255,107,53,${
          0.03 + emberLevel * 0.45
        }) 0%, transparent 60%), #050309`,
        transition: 'background 800ms ease',
      }}
      onPointerUp={endTrace}
      onPointerLeave={endTrace}
    >
      {/* Atmospheric line at top */}
      <div className="relative z-10 px-6 pt-6 text-center" dir="rtl">
        <p
          className="font-rubik text-base leading-relaxed"
          style={{
            color: `rgba(255,235,180,${0.4 + emberLevel * 0.5})`,
            textShadow: `0 0 ${8 + emberLevel * 24}px rgba(255,107,53,${
              0.3 + emberLevel * 0.5
            })`,
            transition: 'all 800ms',
          }}
        >
          {emberLevel < 0.05
            ? 'כאן חשוך מאוד.'
            : emberLevel < 0.95
            ? 'משהו זוהה. עוד לא מספיק.'
            : 'הדלת חמה. היא נפתחת.'}
        </p>
        {showHint && !solved && emberLevel < 0.95 && (
          <p
            className="mt-2 text-xs italic"
            style={{ color: 'rgba(255,200,160,0.45)' }}
          >
            (גרור בין אותיות סמוכות)
          </p>
        )}
      </div>

      {/* The grid */}
      <div className="relative z-10 mt-4 flex flex-col items-center justify-center select-none">
        <div
          className="grid touch-none gap-2"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 56px)` }}
        >
          {cells.map((cell, i) => {
            const inTrace = traceSet.has(i);
            const traceIdx = trace.indexOf(i);
            const seedAlpha = cell.seedGlow + emberLevel * 0.6;
            const litAlpha = inTrace ? 1 : seedAlpha;
            const fontShadow = inTrace
              ? '0 0 24px rgba(255,180,80,1), 0 0 6px rgba(255,255,255,0.9)'
              : `0 0 ${4 + seedAlpha * 16}px rgba(255,180,80,${seedAlpha * 0.8})`;
            return (
              <button
                key={i}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startTrace(i);
                }}
                onPointerEnter={() => extendTrace(i)}
                disabled={solved}
                className={
                  'flex h-14 w-14 select-none items-center justify-center rounded-lg font-fredoka text-2xl font-black transition-all '
                }
                style={{
                  color: `rgba(255,235,180,${litAlpha})`,
                  textShadow: fontShadow,
                  background: inTrace
                    ? 'rgba(255,107,53,0.22)'
                    : `rgba(80,40,20,${0.12 + seedAlpha * 0.3})`,
                  border: inTrace
                    ? '2px solid rgba(255,180,80,0.95)'
                    : `1px solid rgba(255,180,80,${0.05 + seedAlpha * 0.4})`,
                  transform: inTrace ? 'scale(1.05)' : 'scale(1)',
                }}
                aria-label={`אות ${cell.letter}${
                  traceIdx >= 0 ? `, נבחרה (${traceIdx + 1})` : ''
                }`}
              >
                {cell.letter}
              </button>
            );
          })}
        </div>

        {/* Current trace word display */}
        <div className="mt-6 flex h-12 items-center justify-center" dir="rtl">
          <span
            className="font-fredoka text-3xl font-black tracking-widest"
            style={{
              color: 'rgba(255,200,140,0.9)',
              textShadow: '0 0 20px rgba(255,107,53,0.5)',
            }}
          >
            {word || ' '}
          </span>
        </div>
      </div>

      {/* Whisper */}
      {whisper && (
        <div
          className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 px-6 text-center"
          dir="rtl"
        >
          <p
            className="font-fredoka text-2xl font-black"
            style={{
              color: 'rgba(255,180,80,0.95)',
              textShadow: '2px 2px 0 #000, 0 0 24px rgba(255,107,53,0.8)',
              animation: 'wv-whisper 2.4s ease-out forwards',
            }}
          >
            {whisper}
          </p>
        </div>
      )}

      {/* Door bloom on solve */}
      {solved && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(255,180,80,0.55) 0%, transparent 70%)',
              animation: 'wv-doorBloom 2.2s ease-out forwards',
            }}
          />
          <div
            className="relative flex h-72 w-48 flex-col items-center justify-center rounded-md border-4 border-amber-300 bg-[#3a1a0e]"
            style={{
              boxShadow:
                '0 0 80px rgba(255,180,80,0.9), inset 0 0 40px rgba(0,0,0,0.6)',
              animation: 'wv-doorOpen 2.2s ease-out forwards',
            }}
          >
            <span className="font-fredoka text-6xl font-black text-amber-200 drop-shadow-[3px_3px_0_#000]">
              אש
            </span>
          </div>
        </div>
      )}

      {/* Subtle exit */}
      <button
        type="button"
        onClick={onExit}
        className="absolute left-3 top-3 z-20 rounded border-2 border-white/20 px-3 py-1 text-xs text-white/40 hover:text-white"
      >
        ←
      </button>

      <style jsx global>{`
        @keyframes wv-whisper {
          0% {
            opacity: 0;
            transform: translate(-50%, 8px);
          }
          15%,
          80% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
        }
        @keyframes wv-doorBloom {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          60% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.85;
            transform: scale(1.05);
          }
        }
        @keyframes wv-doorOpen {
          0% {
            opacity: 0;
            transform: scaleY(0.1) scaleX(0.5);
          }
          70% {
            opacity: 1;
            transform: scaleY(1) scaleX(1);
          }
          100% {
            opacity: 1;
            transform: scaleY(1) scaleX(1.02);
          }
        }
      `}</style>
    </div>
  );
}
