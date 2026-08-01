'use client';

import { useEffect, useRef } from 'react';
import { ChevronsDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import type { PlacementQuality } from '@/lib/wordTower/cranePlacement';

export interface WordTowerWheelProps {
  /** The ring of letters the player spells from (reused across words). */
  tray: string[];
  /** Indices into `tray`, in drag/tap order, that form the current word. */
  selected: number[];
  /** The word currently being built (selected letters joined). */
  word: string;
  /** True once a word is held for placement — the ring recedes and the hub
   *  becomes the DROP control. */
  placing: boolean;
  /** The band the crane's aim would score RIGHT NOW ('perfect' | 'good' |
   *  'sloppy' | 'miss'), or null when not aiming. The DROP hub wears it so the
   *  player can time the release without looking up at the crane. */
  aimBand?: PlacementQuality | null;
  /** Word is long enough to build (≥ 3). */
  canBuild: boolean;
  /** Pre-formatted height reward ("+3m") shown on the BUILD hub — the player
   *  sees the payoff BEFORE committing the word to the crane. */
  gainPreview?: string;
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

/** How long (ms) a buildable word rests untouched before it auto-hands to the
 *  crane. ~700 ms feels responsive without snatching the word away mid-thought;
 *  the DROP → "keep building" escape hatch covers the case where it fires early. */
const AUTO_BUILD_MS = 700;

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
/** DROP-hub skin per mirrored aim band. `perfect` is unmistakable (the shot you
 *  are waiting for); `miss` reads as a warning without ever disabling the tap —
 *  a bad drop is always allowed, it just scores less. */
const BAND_HUB: Record<PlacementQuality, string> = {
  perfect: 'from-neo-lime-light to-neo-lime text-black ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
  good: 'from-neo-cyan-light to-neo-cyan text-black',
  sloppy: 'from-neo-yellow to-neo-orange text-black',
  miss: 'from-neo-red to-neo-red text-neo-white',
};

/** Aim-arc stroke per band (raw colours: this is an SVG stroke, not a class). */
const AIM_STROKE: Record<PlacementQuality, string> = {
  perfect: '#BFFF00',
  good: '#00FFFF',
  sloppy: '#FFE135',
  miss: '#FF3366',
};

/** Fraction of the aim ring drawn per band — a full circle on a perfect shot,
 *  a stub on a miss, so quality is legible from arc length alone. */
const AIM_ARC: Record<PlacementQuality, number> = {
  perfect: 1,
  good: 0.66,
  sloppy: 0.34,
  miss: 0.12,
};

export function WordTowerWheel({
  tray, selected, word, placing, aimBand = null, canBuild, gainPreview, intensity, accentHex, goldenLetter,
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
  // Guards the auto-build timer (below) from double-firing onSubmit after a
  // manual BUILD tap or a drag-release already submitted this word.
  const submittedRef = useRef(false);

  // Pointer id + surface of the gesture in flight, so capture can be claimed at
  // the exact moment a drag begins (see `onEngage` below) rather than on
  // pointerdown.
  const gestureRef = useRef<{ id: number; el: HTMLElement } | null>(null);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: 3,
    isIndexUsed: (i) => selectedRef.current.includes(i),
    addLetter: (i) => { addedDuringDragRef.current = true; onSelectTile(i); },
    getBuiltLength: () => selectedRef.current.length,
    submit: () => { submittedRef.current = true; onSubmit(); },
    // Claim the pointer the instant a real DRAG starts — not on pointerdown.
    //
    // Capture is needed because sliding a finger past the OUTER edge of a ring
    // tile leaves this 230px box; the box used to treat that as a release and
    // auto-submit whatever was spelled so far. The ring sits at 33% radius with
    // 19%-wide tiles, so the tile edge is only ~17px inside the box — brushing
    // the outside of a letter is the natural motion when tracing a circle, and
    // it silently committed the word.
    //
    // But capturing on pointerdown would retarget the following `click` to this
    // container, and tap-to-select is wired to each letter button's own
    // onClick — so one-at-a-time tapping would stop working entirely. `onEngage`
    // fires only once the pointer has moved to a DIFFERENT letter, i.e. only for
    // gestures that are already drags and will never produce a meaningful click.
    onEngage: () => {
      const g = gestureRef.current;
      if (g) { try { g.el.setPointerCapture(g.id); } catch { /* unsupported */ } }
      // undefined → keep the hook's default "add the start letter" behaviour.
    },
  });

  const onDown = (e: React.PointerEvent) => {
    if (placing) return;
    addedDuringDragRef.current = false;
    // Remember what to capture; the claim itself waits until this is known to be
    // a drag (see `onEngage`), so a plain tap keeps its click.
    gestureRef.current = { id: e.pointerId, el: e.currentTarget as HTMLElement };
    handlePointerDown(e);
  };

  const onUp = () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (g) { try { g.el.releasePointerCapture(g.id); } catch { /* never claimed */ } }
    handlePointerUp();
  };

  // Auto-build: tapping letters one-by-one used to need an EXTRA manual BUILD
  // tap before the DROP tap — a "two taps to place a word" flow. Once the
  // spelled word is buildable, wait AUTO_BUILD_MS of no further tile selection
  // then auto-fire onSubmit (same effect as tapping BUILD) so the hub morphs
  // straight to DROP. A fresh tile pick before it elapses cancels and restarts
  // the wait (join() gives a stable dep key on the selection content, not the
  // array reference). Snappier than the old 1 s so the crane hand-off feels
  // responsive, while still leaving a beat to add another letter (founder ask
  // 2026-07-17); if the beat is too tight the player can DROP → keep building.
  const selectedKey = selected.join(',');
  useEffect(() => {
    submittedRef.current = false;
    if (!canBuild || placing) return;
    const id = setTimeout(() => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      onSubmit();
    }, AUTO_BUILD_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, canBuild, placing]);
  // The hand-off above was INVISIBLE: the word was silently snatched onto the
  // crane after a 700ms pause, so from the player's side the UI changed on its
  // own while they were still thinking. The countdown is the same timer, drawn —
  // a ring sweeping around the BUILD hub. Same key as the timer, so picking
  // another letter restarts both together. (Keyed remount restarts the CSS
  // animation; there is no per-frame work here.)
  const buildArming = canBuild && !placing;

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
      // Centering: `mx-auto` keeps the wheel horizontally centred inside its
      // (symmetric) grid column in both LTR and RTL.
      // Responsive height: the wheel is aspect-square, so a smaller max-WIDTH also
      // makes it SHORTER. Step the cap down on shorter viewports so the wheel +
      // deck chrome + ad-banner band never crowd the upper HUD or get clipped at
      // the bottom on small/landscape phones. Percentage-based letter positions
      // and tile sizes scale with the box, so it just gets proportionally smaller.
      className="relative mx-auto aspect-square w-full max-w-[230px] medium-short:max-w-[200px] short:max-w-[172px] touch-none select-none"
      onPointerDown={onDown}
      onPointerMove={placing ? undefined : handlePointerMove}
      onPointerUp={placing ? undefined : onUp}
      onPointerCancel={placing ? undefined : onUp}
      // NO onPointerLeave — with pointer capture the pointer can legitimately be
      // outside this box mid-drag (tracing the outer edge of a ring tile does
      // exactly that), and treating "left the box" as "let go" submitted words
      // the player had not finished. pointerup/pointercancel end the gesture.
      role="group"
      aria-label={t(placing ? 'wordTower.crane.drop' : 'wordTower.hud.dragToBuild')}
      dir={dir}
    >
      {/* Full-word ribbon — floats above the ring while spelling, so long words
          stay readable end-to-end (the centre hub truncates past ~5 letters:
          "HONE" read as "HO…" in the 2026-07-02 audit). Hidden while placing —
          the crane column already shows the word as bricks. */}
      {!placing && word.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-2 left-1/2 z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-neo border-neo border-black bg-neo-navy px-3 py-0.5 font-neo-display text-lg font-black uppercase tracking-[0.2em] text-neo-white shadow-hard"
        >
          {/* Inner span carries the per-letter re-pop (keyed by length) so the
              keyframe's transform never fights the wrapper's centring translate. */}
          <span key={word.length} className={cn('inline-block', !reducedMotion && 'wt-tile-pop')}>
            {word}
          </span>
        </div>
      )}

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
        // The just-added letter POPS — per-letter feedback so spelling escalates.
        const isLast = isSel && selected[selected.length - 1] === i;
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
                  ? 'bg-gradient-to-b from-neo-yellow to-neo-orange text-black ring-2 ring-neo-yellow wt-golden-shimmer'
                  : 'bg-gradient-to-b from-neo-lime-light to-neo-lime text-black active:translate-y-0.5',
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            {isGolden && !isSel && <span aria-hidden className="absolute -top-2 -right-1 text-[10px]">🌟</span>}
            <span
              key={isLast ? selected.length : 0}
              className={cn('inline-block', isLast && !reducedMotion && 'wt-tile-pop')}
            >
              {letter}
            </span>
          </button>
        );
      })}

      {/* ── AIM RING ──
            This slot used to hold a "crane steering dial": a rim with three
            spokes that span up when a word was held. It steered nothing — it
            implied a control the player did not have, which is exactly what made
            the hand-off feel fake.

            It now shows the crane's REAL live aim. The arc is the placement band
            the drop would score this instant, mirrored from the same
            `alignmentBand` call that scores the verdict, so it can never lie.
            That closes the split where the player had to watch the crane at the
            top of the screen while tapping at the bottom. */}
      {placing && aimBand && (
        <div className="pointer-events-none absolute inset-[6%]" aria-hidden>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <circle cx={50} cy={50} r={45} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={7} />
            <circle
              cx={50}
              cy={50}
              r={45}
              fill="none"
              stroke={AIM_STROKE[aimBand]}
              strokeWidth={7}
              strokeLinecap="round"
              // The arc LENGTH is the quality: a full ring on perfect, a stub on
              // a miss. Readable at a glance in peripheral vision, which is all
              // the attention a thumb-side indicator can ask for.
              strokeDasharray={`${AIM_ARC[aimBand] * 283} 283`}
              transform="rotate(-90 50 50)"
              style={{ transition: reducedMotion ? 'none' : 'stroke-dasharray 90ms linear, stroke 90ms linear' }}
            />
          </svg>
        </div>
      )}

      {/* Centre hub — the single action surface. While spelling it is the BUILD
          button (lifts the spelled word to the crane); once a word is held it
          morphs into the DROP control. The old bottom BUILD button is gone — the
          action lives where the player's eyes already are (centre of the wheel),
          and a drag-release still auto-builds via onSubmit. */}
      <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        {placing ? (
          // DROP — wears the crane's live aim so the release can be timed here,
          // where the thumb already is, instead of by watching the crane sweep
          // at the top of the screen.
          <button
            type="button"
            onClick={onDrop}
            aria-label={t('wordTower.crane.drop')}
            className={cn(
              'pointer-events-auto flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full border-neo-thick border-black bg-gradient-to-b font-neo-display text-[11px] font-black uppercase leading-tight shadow-hard transition-[background-color,box-shadow] duration-100 active:translate-y-0.5',
              BAND_HUB[aimBand ?? 'good'],
              !reducedMotion && 'animate-neo-pop',
            )}
          >
            <ChevronsDown className={cn('h-6 w-6', !reducedMotion && aimBand === 'perfect' && 'animate-bounce')} />
            {t('wordTower.crane.drop')}
          </button>
        ) : canBuild ? (
          <button
            type="button"
            onClick={() => { submittedRef.current = true; onSubmit(); }}
            aria-label={t('wordTower.hud.build')}
            className={cn(
              'pointer-events-auto relative flex h-[66px] min-w-[66px] max-w-[78%] flex-col items-center justify-center gap-0.5 rounded-full border-neo-thick border-black bg-gradient-to-b from-neo-cyan-light to-neo-cyan px-3 font-neo-display font-black uppercase leading-none text-black shadow-hard active:translate-y-0.5',
              !reducedMotion && 'animate-neo-pop',
            )}
          >
            {/* Hand-off countdown — the AUTO_BUILD_MS timer, drawn. Remounted on
                every selection change (same key as the timer's dep), so adding a
                letter visibly restarts the wait instead of the word just
                vanishing onto the crane mid-thought. */}
            {buildArming && !reducedMotion && (
              <svg
                key={selectedKey}
                viewBox="0 0 100 100"
                className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)]"
                aria-hidden
              >
                <circle
                  cx={50}
                  cy={50}
                  r={46}
                  fill="none"
                  stroke="#0b1020"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={289}
                  transform="rotate(-90 50 50)"
                  className="wt-build-arm"
                  style={{ animationDuration: `${AUTO_BUILD_MS}ms` }}
                />
              </svg>
            )}
            <span className="max-w-full truncate text-base tracking-wide">{word}</span>
            <span className="flex items-center gap-0.5 text-[9px] tracking-[0.15em]">
              <ArrowUp className="h-3 w-3" />
              {t('wordTower.hud.build')}
            </span>
            {gainPreview && (
              <span className="text-[10px] font-bold tabular-nums text-black/70">{gainPreview}</span>
            )}
          </button>
        ) : (
          <div
            className={cn(
              'flex h-[34%] min-h-[44px] min-w-[44px] max-w-[60%] items-center justify-center rounded-full border-neo px-3 text-center font-neo-display text-xl font-black uppercase tracking-wide text-neo-white backdrop-blur-sm transition-colors duration-300',
              // Idle "waiting for a letter" state used to read as disabled/washed-out
              // next to the ring's glow + sparks — a soft breathing pulse on the
              // border invites the first tap instead of looking inert.
              word.length > 0
                ? 'border-black/40 bg-neo-navy/70'
                : cn('border-neo-lime/50 bg-neo-navy/70', !reducedMotion && 'animate-pulse'),
            )}
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
