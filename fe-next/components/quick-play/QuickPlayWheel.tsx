'use client';

/**
 * Quick Play mode wheel — the feature's identity interaction.
 * Tap a mode node, or drag the center knob toward one and release, to play it
 * immediately — no separate confirm step. Release the knob without dragging
 * (or drop it inside the dead zone) to play Random. Deliberately NOT a card
 * grid: card grids are multiplayer's mode-select language, quick play must
 * feel physical/arcade.
 *
 * Responsive: scales ring/nodes/knob via scaleWheelLayout so ~360px phones
 * keep all four nodes + knob fully on-screen with tappable hit targets.
 * Motion: entrance pops + ambient orbit glow; all continuous motion gated
 * behind prefers-reduced-motion.
 */
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Shuffle, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics/HapticsManager';
import {
  nearestNode,
  NODE_ANGLES,
  scaleWheelLayout,
  nodeOffset,
  type WheelSelection,
  type WheelLayout,
} from './wheelGeometry';
import { QUICK_MODES, type QuickMode } from './types';
import { NODE_COLORS } from './modeColors';

// Custom sticker-style mode icons (distinct illustrated identity per mode).
const MODE_ICON_SRC: Record<QuickMode, string> = {
  classic: '/modes/quickplay-icons/classic.webp',
  blast: '/modes/quickplay-icons/blast.webp',
  'word-hunt': '/modes/quickplay-icons/hunt.webp',
  'wheel-rush': '/modes/quickplay-icons/wheel.webp',
};

interface QuickPlayWheelProps {
  selection: WheelSelection;
  onSelect: (selection: WheelSelection, method: 'drag' | 'tap') => void;
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

function useWheelLayout(): WheelLayout {
  const [width, setWidth] = useState(376);
  useEffect(() => {
    const measure = () => {
      // Hub uses px-5 (20px) each side + a little breathing room.
      const w = typeof window !== 'undefined' ? window.innerWidth : 376;
      setWidth(Math.max(280, w - 40));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return useMemo(() => scaleWheelLayout(width), [width]);
}

export function QuickPlayWheel({ selection, onSelect }: QuickPlayWheelProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const layout = useWheelLayout();
  const reduceMotion = usePrefersReducedMotion();
  const knobRef = useRef<HTMLButtonElement>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef(0);
  const [hovered, setHovered] = useState<WheelSelection | null>(null);
  const [entered, setEntered] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setEntered(true);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);

  const moveKnob = useCallback(
    (dx: number, dy: number) => {
      const knob = knobRef.current;
      if (!knob) return;
      const dist = Math.hypot(dx, dy);
      const max = layout.knobTravel;
      const scale = dist > max ? max / dist : 1;
      knob.style.transition = 'none';
      knob.style.translate = `${dx * scale}px ${dy * scale}px`;
    },
    [layout.knobTravel]
  );

  const resetKnob = useCallback(() => {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transition = reduceMotion
      ? 'translate 120ms ease-out'
      : 'translate 260ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    knob.style.translate = '0px 0px';
  }, [reduceMotion]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    knobRef.current?.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragOrigin.current) return;
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
    [moveKnob, playSound, layout.deadZone]
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
      onSelect(nearestNode(dx, dy, layout.deadZone), 'drag');
    },
    [onSelect, resetKnob, layout.deadZone]
  );

  const active = hovered ?? selection;
  const size = layout.containerSize;
  const iconPx = Math.round(layout.iconSize);

  return (
    <div
      className="flex flex-col items-center gap-5 bg-neo-navy sm:gap-6"
      data-testid="quick-play-wheel"
      data-wheel-scale={layout.scale.toFixed(3)}
    >
      <div
        className="relative mx-auto"
        data-testid="quick-wheel-stage"
        style={{ width: size, height: size }}
      >
        {/* Ambient outer glow — static under reduced motion */}
        <div
          aria-hidden
          data-testid="quick-wheel-ambient"
          className={`pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,214,102,0.18)_0%,transparent_62%)] ${
            !reduceMotion ? 'animate-pulse' : ''
          }`}
        />

        {/* Solid energy ring */}
        <div
          aria-hidden
          className="absolute inset-[12%] rounded-full border-[3px] border-neo-cozy/40 shadow-[0_0_24px_rgba(255,214,102,0.15)]"
        />
        {/* Dashed orbit track */}
        <div
          aria-hidden
          data-testid="quick-wheel-orbit"
          className={`absolute inset-[14%] rounded-full border-[3px] border-dashed border-neo-white/25 ${
            !reduceMotion ? 'wt-wheel-orbit' : ''
          }`}
        />
        {/* Inner hub plate */}
        <div
          aria-hidden
          className="absolute inset-[28%] rounded-full border-2 border-black/40 bg-neo-navy-elevated/80 shadow-hard-sm"
        />

        {active !== 'random' && (
          <div
            aria-hidden
            data-testid="quick-wheel-tether"
            className={`absolute left-1/2 top-1/2 z-[1] w-1.5 origin-top border-2 border-black ${NODE_COLORS[active].tether} ${
              !reduceMotion ? 'transition-transform duration-200' : ''
            }`}
            style={{
              height: layout.tetherHeight,
              transform: `translateX(-50%) rotate(${NODE_ANGLES[active] - 180}deg)`,
            }}
          />
        )}

        {QUICK_MODES.map((mode, idx) => {
          const { x, y } = nodeOffset(mode, layout.ringRadius);
          const isActive = active === mode;
          const node = layout.nodeSize;
          return (
            <button
              key={mode}
              type="button"
              data-testid={`quick-wheel-node-${mode}`}
              onClick={() => onSelect(mode, 'tap')}
              aria-label={t(`quickPlay.solo.mode.${mode}`)}
              aria-pressed={isActive}
              className={`absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 touch-manipulation ${
                entered && !reduceMotion ? 'animate-neo-pop' : ''
              } ${isActive ? 'z-10' : ''}`}
              style={{
                width: node,
                height: node,
                marginLeft: x,
                marginTop: y,
                animationDelay: reduceMotion ? undefined : `${idx * 90}ms`,
                animationFillMode: 'both',
                transform: isActive && !reduceMotion ? 'scale(1.12)' : undefined,
                transition: reduceMotion ? undefined : 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <span
                className={`flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl border-neo-thick border-black font-neo-display font-bold text-black ${
                  isActive
                    ? `shadow-hard-lg ring-4 ${NODE_COLORS[mode].ring}`
                    : 'shadow-hard'
                } ${NODE_COLORS[mode].bg}`}
                data-testid={`quick-wheel-node-face-${mode}`}
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
              onSelect('random', 'tap');
            }
          }}
          aria-label={t('quickPlay.solo.random')}
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 touch-none"
          style={{ width: layout.knobSize, height: layout.knobSize }}
        >
          <span
            className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full border-4 border-black bg-neo-navy-elevated text-neo-cream shadow-hard-lg ring-[3px] ring-inset ring-neo-cozy ${
              entered && !reduceMotion ? 'animate-neo-pop' : ''
            }`}
            style={{
              animationDelay: reduceMotion ? undefined : '360ms',
              animationFillMode: 'both',
            }}
          >
            <Sparkles
              className={`text-neo-cozy ${selection === 'random' && !reduceMotion ? 'animate-pulse' : ''}`}
              style={{ width: layout.iconSize * 0.55, height: layout.iconSize * 0.55 }}
              aria-hidden
            />
            <Shuffle
              className={selection === 'random' && !reduceMotion ? 'animate-pulse' : ''}
              style={{ width: layout.iconSize * 0.7, height: layout.iconSize * 0.7 }}
            />
            <span
              className={`font-neo-display font-semibold tracking-wide text-neo-cozy ${
                selection === 'random' && !reduceMotion ? 'animate-pulse' : ''
              }`}
              style={{ fontSize: Math.max(9, Math.round(11 * layout.scale)) }}
            >
              {selection === 'random' ? t('quickPlay.solo.random') : t('quickPlay.solo.dragMe')}
            </span>
          </span>
        </button>
      </div>

      <p className="px-4 text-center text-sm text-neo-white/55">{t('quickPlay.solo.dragHint')}</p>

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
        <p className="text-xs text-neo-white/50">{t('quickPlay.solo.subCaption')}</p>
      </div>
    </div>
  );
}
