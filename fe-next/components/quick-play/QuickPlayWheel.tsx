'use client';

/**
 * Quick Play mode wheel — the feature's identity interaction.
 * Tap a mode node, or drag the center knob toward one and release, to play it
 * immediately — no separate confirm step. Release the knob without dragging
 * (or drop it inside the dead zone) to play Random.
 *
 * On select the hub keeps this wheel mounted with strikeMode + isLoading:
 * electric lightning bolt hub→mode, shockwave rings, then board fetch hold
 * before gameplay mounts (so the transition never feels instant).
 */
import { useRef, useState, useCallback, useEffect, useMemo, type CSSProperties } from 'react';
import { Shuffle, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics/HapticsManager';
import {
  nearestNode,
  scaleWheelLayout,
  nodeOffset,
  type WheelSelection,
  type WheelLayout,
} from './wheelGeometry';
import { QuickPlayStrikeFx } from './QuickPlayStrikeFx';
import { QuickPlayTetherFx } from './QuickPlayTetherFx';
import { QUICK_MODES, type QuickMode } from './types';
import { NODE_COLORS } from './modeColors';
import { ModeGlyph } from './ModeGlyph';

interface QuickPlayWheelProps {
  selection: WheelSelection;
  onSelect: (selection: WheelSelection, method: 'drag' | 'tap') => void;
  /** Mode receiving the electric strike (resolved mode, never 'random'). */
  strikeMode?: QuickMode | null;
  /** Hub is fetching the board — block input, keep strike + loading chrome. */
  isLoading?: boolean;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/**
 * Vertical space (px) the caption cluster below the stage needs (drag hint +
 * "Selected" row + sub-caption + gaps). Reserved so the stage sizes off the
 * space it can actually own, never pushing the captions off-screen.
 */
const CAPTION_RESERVE = 132;

/**
 * Size the wheel to the box it actually lives in — both width AND height — so
 * it fills a tall phone or a wide TV instead of capping at a small 376 disc.
 * Observes the wheel root's parent cell; falls back to the viewport pre-mount.
 */
/**
 * Bottom chrome (tab bar + page padding) the stage must stay clear of. The
 * viewport clamp below is measured from the top of the wheel, so this is the
 * only part of the page it cannot see.
 */
const BOTTOM_CHROME = 92;

function useWheelLayout(hostRef: React.RefObject<HTMLElement | null>): WheelLayout {
  const [avail, setAvail] = useState(376);
  useEffect(() => {
    const host = hostRef.current?.parentElement ?? hostRef.current;
    const measure = () => {
      const rect = host?.getBoundingClientRect();
      const w = rect?.width || (typeof window !== 'undefined' ? window.innerWidth : 376);
      const h =
        rect?.height || (typeof window !== 'undefined' ? window.innerHeight : 640);
      // The parent's own height is NOT a safe ceiling: this cell grows to fit
      // the stage, so sizing off it is circular and let the wheel push the
      // caption cluster (the only thing that says what a mode IS) below the
      // fold. Clamp against the viewport from the wheel's own top edge, which
      // only depends on the header above it.
      const top = rect?.top ?? 0;
      const viewportRoom =
        typeof window !== 'undefined'
          ? window.innerHeight - top - CAPTION_RESERVE - BOTTOM_CHROME
          : Infinity;
      // Leave gutters on width and room for the caption cluster on height.
      setAvail(Math.max(280, Math.min(w - 24, h - CAPTION_RESERVE, viewportRoom)));
    };
    measure();
    // Always listen for resize too: the clamp above reads viewport HEIGHT, and
    // a height-only viewport change never resizes the parent box.
    window.addEventListener('resize', measure);
    if (host && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(host);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', measure);
      };
    }
    return () => window.removeEventListener('resize', measure);
  }, [hostRef]);
  return useMemo(() => scaleWheelLayout(avail), [avail]);
}

export function QuickPlayWheel({
  selection,
  onSelect,
  strikeMode = null,
  isLoading = false,
}: QuickPlayWheelProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const rootRef = useRef<HTMLDivElement>(null);
  const layout = useWheelLayout(rootRef);
  const reduceMotion = usePrefersReducedMotion();
  const knobRef = useRef<HTMLButtonElement>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef(0);
  const [hovered, setHovered] = useState<WheelSelection | null>(null);
  const [entered, setEntered] = useState(reduceMotion);
  const strikeFired = useRef<string | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      setEntered(true);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);

  // Haptic + sound once when a new strike locks in
  useEffect(() => {
    if (!strikeMode) {
      strikeFired.current = null;
      return;
    }
    if (strikeFired.current === strikeMode) return;
    strikeFired.current = strikeMode;
    try {
      const r = haptics.success() as void | Promise<void>;
      if (r && typeof (r as Promise<void>).then === 'function') {
        void (r as Promise<void>).catch(() => undefined);
      }
    } catch {
      /* haptics optional in tests */
    }
    void playSound('message', { requiresGameActive: false, volume: 0.55 });
  }, [strikeMode, playSound]);

  const locked = isLoading || Boolean(strikeMode);

  const commit = useCallback(
    (sel: WheelSelection, method: 'drag' | 'tap') => {
      if (locked) return;
      onSelect(sel, method);
    },
    [locked, onSelect]
  );

  const moveKnob = useCallback(
    (dx: number, dy: number) => {
      const knob = knobRef.current;
      if (!knob || locked) return;
      const dist = Math.hypot(dx, dy);
      const max = layout.knobTravel;
      const scale = dist > max ? max / dist : 1;
      knob.style.transition = 'none';
      knob.style.translate = `${dx * scale}px ${dy * scale}px`;
    },
    [layout.knobTravel, locked]
  );

  const resetKnob = useCallback(() => {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transition = reduceMotion
      ? 'translate 120ms ease-out'
      : 'translate 260ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    knob.style.translate = '0px 0px';
  }, [reduceMotion]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (locked) return;
      dragOrigin.current = { x: e.clientX, y: e.clientY };
      knobRef.current?.setPointerCapture?.(e.pointerId);
    },
    [locked]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragOrigin.current || locked) return;
      const dx = e.clientX - dragOrigin.current.x;
      const dy = e.clientY - dragOrigin.current.y;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => moveKnob(dx, dy));
      const next = nearestNode(dx, dy, layout.deadZone);
      setHovered((prev) => {
        if (prev !== next) {
          haptics.selection();
          void playSound('message', { requiresGameActive: false, volume: 0.3 });
        }
        return next;
      });
    },
    [moveKnob, playSound, layout.deadZone, locked]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragOrigin.current) return;
      const dx = e.clientX - dragOrigin.current.x;
      const dy = e.clientY - dragOrigin.current.y;
      dragOrigin.current = null;
      cancelAnimationFrame(rafId.current);
      resetKnob();
      setHovered(null);
      if (locked) return;
      commit(nearestNode(dx, dy, layout.deadZone), 'drag');
    },
    [commit, resetKnob, layout.deadZone, locked]
  );

  const active: WheelSelection = strikeMode ?? hovered ?? selection;
  // Drives the arcade rim glow + ambient halo — the whole wheel re-themes to
  // the mode under the knob. Cozy gold on Random.
  const activeHex = active !== 'random' ? NODE_COLORS[active].hex : '#FFD666';
  const size = layout.containerSize;
  const iconPx = Math.round(layout.iconSize);

  return (
    <div
      ref={rootRef}
      /* No background fill here — the hub paints its atmosphere blobs behind
         this cell, and an opaque one covered them with a hard-edged rectangle. */
      className="flex h-full w-full flex-col items-center justify-center gap-4 sm:gap-5"
      data-testid="quick-play-wheel"
      data-wheel-scale={layout.scale.toFixed(3)}
      data-loading={isLoading ? 'true' : 'false'}
      aria-busy={isLoading || undefined}
    >
      <div
        className="relative mx-auto"
        data-testid="quick-wheel-stage"
        style={{ width: size, height: size }}
      >
        {/* Mode-tinted ambient glow — halos the whole disc in the active color. */}
        <div
          aria-hidden
          data-testid="quick-wheel-ambient"
          className={`pointer-events-none absolute inset-[4%] rounded-full transition-[background] ${
            !reduceMotion && !strikeMode ? 'quick-wheel-breathe' : ''
          }`}
          style={{
            background: `radial-gradient(circle at 50% 42%, ${activeHex}33 0%, transparent 62%)`,
            transitionDuration: '500ms',
            // Tailwind v4's `duration-*` sets animation-duration as well as
            // transition-duration. `duration-500` on this element is what made
            // the old ambient `animate-pulse` run at 0.5s — a strobe, not a
            // glow. Keep the transition timing off the class list entirely.
            animationDuration: '6.5s',
          }}
        />
        {/* Arcade bezel — layered dark rim with real depth (drop + inset). */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full border-4 border-black"
          style={{
            background: 'conic-gradient(from 0deg,#2a2a44,#15152a,#2a2a44,#15152a,#2a2a44)',
            boxShadow: '0 9px 0 rgba(0,0,0,0.5), inset 0 0 0 6px #0c0c1a, inset 0 8px 20px rgba(0,0,0,0.7)',
          }}
        />
        {/* Neon glow rim in the active mode color. */}
        <div
          aria-hidden
          className="absolute inset-[13%] rounded-full border-[3px] transition-[border-color,box-shadow] duration-500"
          style={{ borderColor: `${activeHex}8c`, boxShadow: `0 0 26px ${activeHex}66, inset 0 0 22px rgba(0,0,0,0.6)` }}
        />
        <div
          aria-hidden
          data-testid="quick-wheel-orbit"
          className={`absolute inset-[15%] rounded-full border-[3px] border-dashed border-neo-white/20 ${
            !reduceMotion && !strikeMode ? 'wt-wheel-orbit' : ''
          }`}
        />
        {/* Inner well — recessed center the knob sits in. */}
        <div
          aria-hidden
          className="absolute inset-[29%] rounded-full border-2 border-black/50"
          style={{
            background: 'radial-gradient(circle at 50% 35%, #242440, #0e0e1e 75%)',
            boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.8)',
          }}
        />

        {strikeMode && (
          <QuickPlayStrikeFx
            mode={strikeMode}
            size={size}
            ringRadius={layout.ringRadius}
            scale={layout.scale}
            knobSize={layout.knobSize}
            reduceMotion={reduceMotion}
          />
        )}

        {active !== 'random' && !strikeMode && (
          <QuickPlayTetherFx
            mode={active}
            size={size}
            ringRadius={layout.ringRadius}
            scale={layout.scale}
            reduceMotion={reduceMotion}
          />
        )}

        {QUICK_MODES.map((mode, idx) => {
          const { x, y } = nodeOffset(mode, layout.ringRadius);
          const isActive = active === mode;
          const isStrike = strikeMode === mode;
          const node = layout.nodeSize;
          return (
            <button
              key={mode}
              type="button"
              data-testid={`quick-wheel-node-${mode}`}
              onClick={() => commit(mode, 'tap')}
              // Pointing at a mode re-themes the whole wheel and swaps the
              // blurb, so a desktop player learns what each mode is by moving
              // the mouse. Previously `hovered` only ever moved during a knob
              // drag, which touch can do and a mouse basically never does.
              onMouseEnter={() => !locked && setHovered(mode)}
              onMouseLeave={() => !locked && setHovered((h) => (h === mode ? null : h))}
              onFocus={() => !locked && setHovered(mode)}
              onBlur={() => !locked && setHovered((h) => (h === mode ? null : h))}
              disabled={locked}
              aria-label={t(`quickPlay.solo.mode.${mode}`)}
              aria-pressed={isActive}
              className={`absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 touch-manipulation disabled:cursor-wait ${
                entered && !reduceMotion && !strikeMode ? 'animate-neo-pop' : ''
              } ${isActive || isStrike ? 'z-10' : ''}`}
              style={{
                width: node,
                height: node,
                marginLeft: x,
                marginTop: y,
                animationDelay: reduceMotion || strikeMode ? undefined : `${idx * 90}ms`,
                animationFillMode: 'both',
                transform: isActive && !reduceMotion ? 'scale(1.12)' : undefined,
                transition: reduceMotion ? undefined : 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <span
                className={`flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl border-neo-thick border-black font-neo-display font-bold text-black ${
                  isActive || isStrike ? `ring-4 ${NODE_COLORS[mode].ring}` : ''
                } ${NODE_COLORS[mode].bg} ${locked && !isStrike ? 'opacity-45' : ''} ${
                  // Idle float and the strike zap both live on the FACE, never
                  // on the button: the button owns the centering `translate`,
                  // and the float animates that same property.
                  reduceMotion
                    ? ''
                    : isStrike
                      ? 'quick-node-zap'
                      : locked
                        ? ''
                        : 'quick-node-float'
                }`}
                data-testid={`quick-wheel-node-face-${mode}`}
                style={{
                  animationDelay: reduceMotion || isStrike ? undefined : `${idx * 620}ms`,
                  // Chunky beveled arcade keycap: top highlight + bottom shade
                  // (inset) + a solid drop that lifts on the active node.
                  boxShadow:
                    isActive || isStrike
                      ? `0 6px 0 rgba(0,0,0,0.8), inset 0 3px 0 rgba(255,255,255,0.5), inset 0 -4px 0 rgba(0,0,0,0.22), 0 0 26px ${NODE_COLORS[mode].hex}66`
                      : '0 5px 0 rgba(0,0,0,0.7), inset 0 3px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(0,0,0,0.22)',
                }}
              >
                {/* Black ink straight on the accent keycap — the palette rule
                    for every accent fill in this system. The old raster icons
                    needed a white plate to survive; a drawn glyph does not. */}
                <ModeGlyph mode={mode} size={iconPx} />
                <span
                  className="max-w-[92%] truncate px-0.5 text-center leading-tight"
                  style={{ fontSize: Math.max(10, Math.round(11 * layout.scale)) }}
                >
                  {t(`quickPlay.solo.mode.${mode}`)}
                </span>
              </span>
            </button>
          );
        })}

        <button
          ref={knobRef}
          type="button"
          data-testid="quick-wheel-knob"
          disabled={locked}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragOrigin.current = null;
            resetKnob();
            setHovered(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              commit('random', 'tap');
            }
          }}
          aria-label={t('quickPlay.solo.random')}
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 touch-none disabled:cursor-wait"
          style={{ width: layout.knobSize, height: layout.knobSize }}
        >
          <span
            className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full border-4 border-black text-neo-cream ring-[3px] ring-inset ${
              entered && !reduceMotion && !strikeMode ? 'animate-neo-pop' : ''
            } ${strikeMode && !reduceMotion ? 'quick-knob-pulse' : ''}`}
            style={{
              // Tactile joystick knob: domed radial fill + raised bevel. The
              // rim and halo carry the ACTIVE mode's color, so dragging toward
              // a node re-themes the control in your hand — that live response
              // is the interaction, not decoration.
              background: `radial-gradient(circle at 50% 32%, ${activeHex}2e, #23233f 46%, #14142a 78%)`,
              boxShadow: `0 6px 0 rgba(0,0,0,0.8), inset 0 3px 0 rgba(255,255,255,0.22), 0 0 22px ${activeHex}59`,
              // Tailwind can't take a runtime ring color; drive it off the same hex.
              '--tw-ring-color': `${activeHex}d9`,
              animationDelay: reduceMotion || strikeMode ? undefined : '360ms',
              animationFillMode: 'both',
            } as CSSProperties}
          >
            {/* Grip ring — reads as a physical, draggable knob. */}
            <span aria-hidden className="pointer-events-none absolute inset-[14%] rounded-full border-2 border-dashed border-white/15" />
            {isLoading ? (
              <Zap
                className="text-neo-yellow"
                style={{ width: layout.iconSize * 0.8, height: layout.iconSize * 0.8 }}
                aria-hidden
              />
            ) : (
              <Shuffle
                style={{ width: layout.iconSize * 0.82, height: layout.iconSize * 0.82, color: activeHex }}
              />
            )}
            <span
              className="font-neo-display font-bold uppercase tracking-wide"
              style={{
                fontSize: Math.max(9, Math.round(11 * layout.scale)),
                color: isLoading ? '#FFE135' : activeHex,
              }}
            >
              {isLoading
                ? t('quickPlay.solo.loading')
                : selection === 'random'
                  ? t('quickPlay.solo.random')
                  : t('quickPlay.solo.dragMe')}
            </span>
          </span>
        </button>
      </div>

      {isLoading ? (
        <p
          className="flex items-center gap-2 px-4 text-center font-neo-display text-sm font-semibold text-neo-yellow"
          data-testid="quick-play-loading"
          role="status"
          aria-live="polite"
        >
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 rounded-full bg-neo-yellow ${!reduceMotion ? 'animate-ping' : ''}`}
          />
          {t('quickPlay.solo.loading')}
          {strikeMode ? (
            <>
              {' · '}
              <span className={NODE_COLORS[strikeMode].text}>{t(`quickPlay.solo.mode.${strikeMode}`)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {/* Caption cluster. Was three near-identical grey lines with no
          hierarchy; now name → what you'll do → how to pick. The blurb is the
          point: most arrivals have never played any of these four modes, and
          the picker previously named them without ever saying what they are. */}
      <div className="flex w-full flex-col items-center gap-1.5 px-5">
        <p
          className="flex items-center justify-center gap-2.5 font-neo-display text-lg font-bold tracking-wide sm:text-xl"
          style={{ color: activeHex }}
        >
          <span
            aria-hidden
            className="h-3.5 w-3.5 rounded-sm border-2 border-black"
            style={{ background: activeHex }}
          />
          {t(active === 'random' ? 'quickPlay.solo.random' : `quickPlay.solo.mode.${active}`)}
        </p>
        <p
          data-testid="quick-mode-blurb"
          className="min-h-[2.6em] max-w-[44ch] text-balance text-center text-sm leading-snug text-neo-cream/85"
        >
          {t(`quickPlay.solo.blurb.${active}`)}
        </p>
        {!isLoading && (
          <p className="text-center text-xs text-neo-white/45">{t('quickPlay.solo.dragHint')}</p>
        )}
      </div>
    </div>
  );
}
