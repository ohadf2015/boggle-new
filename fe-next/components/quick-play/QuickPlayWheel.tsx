'use client';

/**
 * Quick Play mode wheel — the feature's identity interaction.
 * Drag the center knob toward a mode node to select it; release inside the
 * dead zone to stay on Random. Deliberately NOT a card grid: card grids are
 * multiplayer's mode-select language, quick play must feel physical/arcade.
 */
import { useRef, useState, useCallback } from 'react';
import { Shuffle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics/HapticsManager';
import { MODE_ICONS } from '@/components/GameModeSelector';
import { nearestNode, NODE_ANGLES, type WheelSelection } from './wheelGeometry';
import { QUICK_MODES, type QuickMode } from './types';

// ponytail: local color map — the two "canonical" maps (MODE_ACTIVE_COLORS,
// BattleModeCard families) disagree and both reuse colors across these 4 modes;
// the wheel needs 4 visually distinct families.
const NODE_COLORS: Record<QuickMode, { bg: string; ring: string; text: string }> = {
  classic: { bg: 'bg-neo-lime', ring: 'ring-neo-lime', text: 'text-neo-lime' },
  blast: { bg: 'bg-neo-pink', ring: 'ring-neo-pink', text: 'text-neo-pink' },
  'word-hunt': { bg: 'bg-neo-cyan', ring: 'ring-neo-cyan', text: 'text-neo-cyan' },
  'wheel-rush': { bg: 'bg-neo-purple', ring: 'ring-neo-purple', text: 'text-neo-purple' },
};

const RING_RADIUS_PX = 132;
const DEAD_ZONE_PX = 28;
const KNOB_TRAVEL_MAX_PX = 96;

interface QuickPlayWheelProps {
  selection: WheelSelection;
  onSelect: (selection: WheelSelection, method: 'drag' | 'tap') => void;
  onPlay: () => void;
}

export function QuickPlayWheel({ selection, onSelect, onPlay }: QuickPlayWheelProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const knobRef = useRef<HTMLButtonElement>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef(0);
  const [hovered, setHovered] = useState<WheelSelection | null>(null);

  const moveKnob = useCallback((dx: number, dy: number) => {
    const knob = knobRef.current;
    if (!knob) return;
    const dist = Math.hypot(dx, dy);
    const scale = dist > KNOB_TRAVEL_MAX_PX ? KNOB_TRAVEL_MAX_PX / dist : 1;
    knob.style.transition = 'none';
    knob.style.translate = `${dx * scale}px ${dy * scale}px`;
  }, []);

  const resetKnob = useCallback(() => {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transition = 'translate 260ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    knob.style.translate = '0px 0px';
  }, []);

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
      const next = nearestNode(dx, dy, DEAD_ZONE_PX);
      setHovered((prev) => {
        if (prev !== next) {
          haptics.selection();
          void playSound('message', { requiresGameActive: false, volume: 0.3 });
        }
        return next;
      });
    },
    [moveKnob, playSound]
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
      onSelect(nearestNode(dx, dy, DEAD_ZONE_PX), 'drag');
    },
    [onSelect, resetKnob]
  );

  const active = hovered ?? selection;
  const playColor = active !== 'random' ? NODE_COLORS[active].bg : 'bg-neo-cozy';

  return (
    <div className="flex flex-col items-center gap-6 bg-neo-navy">
      <div className="relative" style={{ width: RING_RADIUS_PX * 2 + 112, height: RING_RADIUS_PX * 2 + 112 }}>
        <div
          className="absolute inset-14 rounded-full border-[3px] border-dashed border-neo-white/20"
          aria-hidden
        />
        {QUICK_MODES.map((mode, idx) => {
          const rad = (NODE_ANGLES[mode] * Math.PI) / 180;
          const x = Math.sin(rad) * RING_RADIUS_PX;
          const y = -Math.cos(rad) * RING_RADIUS_PX;
          const isActive = active === mode;
          return (
            <button
              key={mode}
              type="button"
              data-testid={`quick-wheel-node-${mode}`}
              onClick={() => onSelect(mode, 'tap')}
              aria-label={t(`quickPlay.solo.mode.${mode}`)}
              aria-pressed={isActive}
              className={`absolute left-1/2 top-1/2 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ${
                isActive ? 'scale-110 z-10' : 'scale-100'
              }`}
              style={{ marginLeft: x, marginTop: y }}
            >
              <span
                className={`animate-neo-pop flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border-neo-thick border-black font-neo-display text-xs font-semibold text-black ${
                  isActive ? 'shadow-hard-lg' : 'shadow-hard'
                } ${NODE_COLORS[mode].bg}`}
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
              >
                <span className="[&>svg]:h-7 [&>svg]:w-7">{MODE_ICONS[mode]}</span>
                {t(`quickPlay.solo.mode.${mode}`)}
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
          aria-label={t('quickPlay.solo.dragHint')}
          className="absolute left-1/2 top-1/2 z-20 h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 touch-none"
        >
          <span
            className="animate-neo-pop flex h-full w-full flex-col items-center justify-center gap-1 rounded-full border-4 border-black bg-neo-navy-elevated text-neo-cream shadow-hard-lg ring-[3px] ring-inset ring-neo-cozy"
            style={{ animationDelay: '380ms', animationFillMode: 'both' }}
          >
            <span className="h-1.5 w-8 rounded-full bg-neo-white/35" aria-hidden />
            <Shuffle className="h-6 w-6" />
            <span className="font-neo-display text-[11px] font-semibold tracking-wide text-neo-cozy">
              {selection === 'random' ? t('quickPlay.solo.random') : t('quickPlay.solo.dragMe')}
            </span>
          </span>
        </button>
      </div>

      <p className="text-sm text-neo-white/55">{t('quickPlay.solo.dragHint')}</p>

      <div className="flex w-full flex-col items-center gap-3 px-5">
        <p className="font-neo-display text-[15px] text-neo-cream">
          {t('quickPlay.solo.selected')}{' '}
          <b className={active !== 'random' ? NODE_COLORS[active].text : 'text-neo-cozy'}>
            {t(active === 'random' ? 'quickPlay.solo.random' : `quickPlay.solo.mode.${active}`)}
          </b>
        </p>
        <button
          type="button"
          data-testid="quick-wheel-play"
          onClick={onPlay}
          className={`h-[64px] w-full max-w-sm rounded-2xl border-4 border-black font-neo-display text-2xl font-bold tracking-[3px] text-black shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed ${playColor}`}
        >
          {t('quickPlay.solo.play')}
        </button>
        <p className="text-xs text-neo-white/50">{t('quickPlay.solo.subCaption')}</p>
      </div>
    </div>
  );
}
