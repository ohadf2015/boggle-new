'use client';

import { useRef } from 'react';
import { ChevronsDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';

export interface WordTowerWheelProps {
  /** The ring of letters the player spells from (reused across words). */
  tray: string[];
  /** Indices into `tray`, in drag/tap order, that form the current word. */
  selected: number[];
  /** The word currently being built (selected letters joined). */
  word: string;
  /** True once a word is held for placement — the ring MORPHS into a crane dial. */
  placing: boolean;
  /** Word is long enough to build (≥ 3). */
  canBuild: boolean;
  /**
   * Climb intensity 0..1 (grows with altitude). Higher = brighter ring glow and
   * more orbiting sparks — the wheel itself gets more satisfying the higher you go.
   */
  intensity: number;
  /** Accent colour (the tower's current material) used for the ring glow + path. */
  accentHex: string;
  /** Daily golden-letter mutator — matching tiles glow gold. */
  goldenLetter?: string;
  reducedMotion?: boolean;
  dir: 'ltr' | 'rtl';
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelectTile: (i: number) => void;
  /** Tap an already-selected tile to unselect it (rewinds the path to before it). */
  onDeselectTile?: (i: number) => void;
  /** Build (validate + hand to the crane). Also fired on a drag-release. */
  onSubmit: () => void;
  /** Drop the held word (drives the crane). Fired by the dial's centre button. */
  onDrop: () => void;
}

/** Ring radius as a percentage of half the stage (letters sit on this circle).
 *  Founder ask (2026-06-19): tighten the circle (smaller ring) while the letter
 *  tiles themselves get BIGGER — a denser, punchier wheel that also frees deck
 *  height. */
const RING_PCT = 33;

/** Polar → cartesian on the 0..100 SVG/percent grid (0 = top, clockwise). */
function letterPos(i: number, n: number): { x: number; y: number } {
  const deg = -90 + (i * 360) / n;
  const rad = (deg * Math.PI) / 180;
  return { x: 50 + Math.cos(rad) * RING_PCT, y: 50 + Math.sin(rad) * RING_PCT };
}

/**
 * WordTowerWheel — the word-building surface.
 *
 * Letters sit on a ring; the player drags a path across them (or taps) to spell.
 * There is no chain anchor any more — any word buildable from the ring counts.
 * When a word is held for placement the whole ring MORPHS into a crane steering
 * dial whose centre is the DROP control, selling the "the wheel becomes the
 * crane" transition the design asks for.
 */
export function WordTowerWheel({
  tray, selected, word, placing, canBuild, intensity, accentHex, goldenLetter,
  reducedMotion = false, dir, t, onSelectTile, onDeselectTile, onSubmit, onDrop,
}: WordTowerWheelProps) {
  const n = tray.length;
  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  // Guards a stray post-drag click from re-adding a letter the drag already took.
  const addedDuringDragRef = useRef(false);
  // Latest selection in a ref so the drag hook reads a fresh length at pointer-up.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: 3,
    isIndexUsed: (i) => selectedRef.current.includes(i),
    addLetter: (i) => { addedDuringDragRef.current = true; onSelectTile(i); },
    getBuiltLength: () => selectedRef.current.length,
    submit: onSubmit,
  });

  const onDown = (e: React.PointerEvent) => {
    if (placing) return;
    addedDuringDragRef.current = false;
    handlePointerDown(e);
  };

  const tapLetter = (i: number) => {
    // The drag hook already added letters this gesture — swallow the trailing click.
    if (addedDuringDragRef.current) { addedDuringDragRef.current = false; return; }
    if (placing) return;
    // Tap an already-selected tile to UNSELECT it (founder ask) — rewinds the
    // path to just before that letter. Otherwise add it to the spell path.
    if (selected.includes(i)) { onDeselectTile?.(i); return; }
    onSelectTile(i);
  };

  // Orbiting sparks: more (and brighter) the higher you climb. Pure decoration.
  const sparkCount = reducedMotion ? 0 : Math.round(6 + intensity * 10);
  const glow = 0.25 + intensity * 0.5;

  // Selected-letter centres for the connecting path (percent grid).
  const pts = selected.map((idx) => letterPos(idx, n));

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[178px] touch-none select-none"
      onPointerDown={onDown}
      onPointerMove={placing ? undefined : handlePointerMove}
      onPointerUp={placing ? undefined : handlePointerUp}
      onPointerCancel={placing ? undefined : handlePointerUp}
      onPointerLeave={placing ? undefined : handlePointerUp}
      role="group"
      aria-label={t(placing ? 'wordTower.crane.steer' : 'wordTower.hud.dragToBuild')}
      dir={dir}
    >
      {/* Biome glow — the ring's halo brightens with altitude (more satisfying up high). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%] rounded-full transition-[box-shadow,opacity] duration-500"
        style={{
          boxShadow: `0 0 ${20 + intensity * 60}px ${4 + intensity * 12}px ${accentHex}`,
          opacity: glow,
        }}
      />

      {/* Orbiting sparks — a slow rotating ring of dots; denser as you climb. */}
      {sparkCount > 0 && (
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-0', !reducedMotion && 'wt-wheel-orbit')}
          style={{ opacity: placing ? 0 : 0.8, transition: 'opacity 400ms' }}
        >
          {Array.from({ length: sparkCount }).map((_, i) => {
            const p = letterPos(i, sparkCount);
            const out = (p.x - 50) * 1.18 + 50;
            const outY = (p.y - 50) * 1.18 + 50;
            return (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full"
                style={{
                  left: `${out}%`, top: `${outY}%`, transform: 'translate(-50%,-50%)',
                  background: accentHex, boxShadow: `0 0 4px ${accentHex}`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Connecting path between selected letters (hidden once we morph to the dial). */}
      {!placing && pts.length >= 1 && (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {pts.length >= 2 && (
            <polyline
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={accentHex}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.4} fill={accentHex} />
          ))}
        </svg>
      )}

      {/* Letter tiles on the ring. Kept in the DOM (faded) while placing so the
          morph reads as a transformation, not a swap. */}
      {tray.map((letter, i) => {
        const pos = letterPos(i, n);
        const isSel = selected.includes(i);
        const isGolden = !!goldenLetter && letter.toUpperCase() === goldenLetter.toUpperCase();
        return (
          <button
            key={i}
            type="button"
            data-wheel-letter={letter}
            data-wheel-index={i}
            disabled={placing}
            onClick={() => tapLetter(i)}
            aria-label={t(isGolden ? 'wordTower.a11y.goldenTile' : 'wordTower.a11y.tile', { letter })}
            aria-pressed={isSel}
            className={cn(
              'absolute z-10 flex h-[19%] w-[19%] items-center justify-center rounded-full border-neo-thick border-black font-neo-display text-2xl font-black uppercase shadow-hard transition-all duration-300',
              placing ? 'scale-50 opacity-0' : 'opacity-100',
              isSel
                ? 'bg-neo-cyan text-black ring-2 ring-neo-cyan ring-offset-2 ring-offset-neo-navy'
                : isGolden
                  ? 'bg-gradient-to-b from-neo-yellow to-neo-orange text-black ring-2 ring-neo-yellow'
                  : 'bg-gradient-to-b from-neo-lime-light to-neo-lime text-black active:translate-y-0.5',
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            {isGolden && !isSel && <span aria-hidden className="absolute -top-2 -right-1 text-[10px]">🌟</span>}
            {letter}
          </button>
        );
      })}

      {/* ── Crane steering dial — the morph target. Fades/zooms in over the ring's
            footprint when a word is held, its centre is the DROP control. ── */}
      <div
        aria-hidden={!placing}
        className={cn(
          'pointer-events-none absolute inset-[6%] transition-all duration-400',
          placing ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
      >
        {/* Rotating wheel rim + spokes — reads as a crane control. */}
        <div
          className={cn(
            'absolute inset-0 rounded-full border-[6px] border-black',
            placing && !reducedMotion && 'wt-dial-spin',
          )}
          style={{ background: `radial-gradient(circle, transparent 52%, ${accentHex}22 53%, transparent 70%)` }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            {[0, 60, 120].map((a) => {
              const r = (a * Math.PI) / 180;
              return (
                <line
                  key={a}
                  x1={50 - Math.cos(r) * 42} y1={50 - Math.sin(r) * 42}
                  x2={50 + Math.cos(r) * 42} y2={50 + Math.sin(r) * 42}
                  stroke="#000" strokeWidth={4}
                />
              );
            })}
            <circle cx={50} cy={50} r={44} fill="none" stroke={accentHex} strokeWidth={3} opacity={0.8} />
          </svg>
        </div>
      </div>

      {/* Centre hub — the single action surface. While spelling it is the BUILD
          button (lifts the spelled word to the crane); once a word is held it
          morphs into the DROP control. The old bottom BUILD button is gone — the
          action lives where the player's eyes already are (centre of the wheel),
          and a drag-release still auto-builds via onSubmit. */}
      <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        {placing ? (
          <button
            type="button"
            onClick={onDrop}
            aria-label={t('wordTower.crane.steer')}
            className={cn(
              'pointer-events-auto flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full border-neo-thick border-black bg-gradient-to-b from-neo-lime-light to-neo-lime font-neo-display text-[11px] font-black uppercase leading-tight text-black shadow-hard active:translate-y-0.5',
              !reducedMotion && 'animate-neo-pop',
            )}
          >
            <ChevronsDown className={cn('h-6 w-6', !reducedMotion && 'animate-bounce')} />
            {t('wordTower.crane.steer')}
          </button>
        ) : canBuild ? (
          <button
            type="button"
            onClick={onSubmit}
            aria-label={t('wordTower.hud.build')}
            className={cn(
              'pointer-events-auto flex h-[66px] min-w-[66px] max-w-[78%] flex-col items-center justify-center gap-0.5 rounded-full border-neo-thick border-black bg-gradient-to-b from-neo-cyan-light to-neo-cyan px-3 font-neo-display font-black uppercase leading-none text-black shadow-hard active:translate-y-0.5',
              !reducedMotion && 'animate-neo-pop',
            )}
          >
            <span className="max-w-full truncate text-base tracking-wide">{word}</span>
            <span className="flex items-center gap-0.5 text-[9px] tracking-[0.15em]">
              <ArrowUp className="h-3 w-3" />
              {t('wordTower.hud.build')}
            </span>
          </button>
        ) : (
          <div
            className="flex h-[34%] min-h-[44px] min-w-[44px] max-w-[60%] items-center justify-center rounded-full border-neo border-black/40 bg-neo-navy/70 px-3 text-center font-neo-display text-xl font-black uppercase tracking-wide text-neo-white backdrop-blur-sm"
          >
            {word.length > 0
              ? word
              : <span className="font-neo-body text-[10px] font-bold tracking-[0.15em] text-neo-white/50">{t('wordTower.hud.pickLetters')}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
