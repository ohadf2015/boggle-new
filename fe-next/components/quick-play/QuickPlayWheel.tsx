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
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Shuffle, Sparkles, Zap } from 'lucide-react';
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

const MODE_ICON_SRC: Record<QuickMode, string> = {
  classic: '/modes/quickplay-icons/classic-v2.webp',
  blast: '/modes/quickplay-icons/blast-v2.webp',
  'word-hunt': '/modes/quickplay-icons/hunt.webp',
  'wheel-rush': '/modes/quickplay-icons/wheel.webp',
};

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
function useWheelLayout(hostRef: React.RefObject<HTMLElement | null>): WheelLayout {
  const [avail, setAvail] = useState(376);
  useEffect(() => {
    const host = hostRef.current?.parentElement ?? hostRef.current;
    const measure = () => {
      const rect = host?.getBoundingClientRect();
      const w = rect?.width || (typeof window !== 'undefined' ? window.innerWidth : 376);
      const h =
        rect?.height || (typeof window !== 'undefined' ? window.innerHeight : 640);
      // Leave gutters on width and room for the caption cluster on height.
      setAvail(Math.max(280, Math.min(w - 24, h - CAPTION_RESERVE)));
    };
    measure();
    if (host && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(host);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
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
      className="flex h-full w-full flex-col items-center justify-center gap-5 bg-neo-navy sm:gap-6"
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
          className={`pointer-events-none absolute inset-[4%] rounded-full transition-[background] duration-500 ${
            !reduceMotion && !strikeMode ? 'animate-pulse' : ''
          }`}
          style={{ background: `radial-gradient(circle at 50% 42%, ${activeHex}33 0%, transparent 62%)` }}
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
              disabled={locked}
              aria-label={t(`quickPlay.solo.mode.${mode}`)}
              aria-pressed={isActive}
              className={`absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 touch-manipulation disabled:cursor-wait ${
                entered && !reduceMotion && !strikeMode ? 'animate-neo-pop' : ''
              } ${isActive || isStrike ? 'z-10' : ''} ${isStrike && !reduceMotion ? 'quick-node-zap' : ''}`}
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
                } ${NODE_COLORS[mode].bg} ${isStrike ? 'brightness-110' : ''} ${
                  locked && !isStrike ? 'opacity-45' : ''
                }`}
                data-testid={`quick-wheel-node-face-${mode}`}
                style={{
                  // Chunky beveled arcade keycap: top highlight + bottom shade
                  // (inset) + a solid drop that lifts on the active node.
                  boxShadow:
                    isActive || isStrike
                      ? `0 6px 0 rgba(0,0,0,0.8), inset 0 3px 0 rgba(255,255,255,0.5), inset 0 -4px 0 rgba(0,0,0,0.22), 0 0 26px ${NODE_COLORS[mode].hex}66`
                      : '0 5px 0 rgba(0,0,0,0.7), inset 0 3px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(0,0,0,0.22)',
                }}
              >
                <span
                  className="relative flex items-center justify-center rounded-xl border-2 border-black/20 bg-white/25"
                  style={{ width: iconPx + 10, height: iconPx + 10 }}
                >
                  <Image
                    src={MODE_ICON_SRC[mode]}
                    alt=""
                    aria-hidden
                    className="object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.4)]"
                    width={iconPx}
                    height={iconPx}
                    style={{ width: iconPx, height: iconPx }}
                    priority={idx < 2}
                  />
                </span>
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
              strikeMode ? 'ring-neo-yellow' : 'ring-neo-cozy'
            } ${entered && !reduceMotion && !strikeMode ? 'animate-neo-pop' : ''} ${
              strikeMode && !reduceMotion ? 'quick-knob-pulse' : ''
            }`}
            style={{
              // Tactile joystick knob: domed radial fill + raised bevel.
              background: 'radial-gradient(circle at 50% 34%, #33335a, #1a1a30 70%)',
              boxShadow: '0 6px 0 rgba(0,0,0,0.8), inset 0 3px 0 rgba(255,255,255,0.22)',
              animationDelay: reduceMotion || strikeMode ? undefined : '360ms',
              animationFillMode: 'both',
            }}
          >
            {/* Grip ring — reads as a physical, draggable knob. */}
            <span aria-hidden className="pointer-events-none absolute inset-[14%] rounded-full border-2 border-dashed border-white/15" />
            {isLoading ? (
              <Zap
                className={`text-neo-yellow ${!reduceMotion ? 'animate-pulse' : ''}`}
                style={{ width: layout.iconSize * 0.75, height: layout.iconSize * 0.75 }}
                aria-hidden
              />
            ) : (
              <>
                <Sparkles
                  className={`text-neo-cozy ${selection === 'random' && !reduceMotion ? 'animate-pulse' : ''}`}
                  style={{ width: layout.iconSize * 0.55, height: layout.iconSize * 0.55 }}
                  aria-hidden
                />
                <Shuffle
                  className={selection === 'random' && !reduceMotion ? 'animate-pulse' : ''}
                  style={{ width: layout.iconSize * 0.7, height: layout.iconSize * 0.7 }}
                />
              </>
            )}
            <span
              className={`font-neo-display font-semibold tracking-wide ${
                isLoading ? 'text-neo-yellow' : 'text-neo-cozy'
              } ${selection === 'random' && !isLoading && !reduceMotion ? 'animate-pulse' : ''}`}
              style={{ fontSize: Math.max(9, Math.round(11 * layout.scale)) }}
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
      ) : (
        <p className="px-4 text-center text-sm text-neo-white/55">{t('quickPlay.solo.dragHint')}</p>
      )}

      <div className="flex w-full flex-col items-center gap-2 px-5 sm:gap-3">
        <p className="flex items-center justify-center gap-2.5 font-neo-display text-[15px] text-neo-cream">
          <span
            aria-hidden
            className={`h-3.5 w-3.5 rounded border-2 border-black ${active !== 'random' ? NODE_COLORS[active].bg : 'bg-neo-cozy'}`}
          />
          {t('quickPlay.solo.selected')}{' '}
          <b className={active !== 'random' ? NODE_COLORS[active].text : 'text-neo-cozy'}>
            {t(active === 'random' ? 'quickPlay.solo.random' : `quickPlay.solo.mode.${active}`)}
          </b>
        </p>
        {!isLoading && (
          <p className="text-xs text-neo-white/50">{t('quickPlay.solo.subCaption')}</p>
        )}
      </div>
    </div>
  );
}
