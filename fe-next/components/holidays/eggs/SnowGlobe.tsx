'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { celebrateHolidayEgg } from '@/lib/holidays/holidayClient';
import { isHeavyGamePath } from '@/lib/perf/heavyGamePath';
import { SNOWGLOBE_EVENT, emitHolidayFx } from './eggEvents';

const SHAKE_ACCEL = 24;
const SHAKE_HITS = 3;
const SHAKE_WINDOW_MS = 1000;
const COOLDOWN_MS = 8000;
const FLAKES = Array.from({ length: 18 }, (_, i) => ({
  left: 18 + ((i * 37) % 64),
  dur: 2.4 + (i % 5) * 0.5,
  delay: (i % 9) * 0.3,
  drift: ((i % 7) - 3) * 6,
}));

type MotionCtor = { requestPermission?: () => Promise<'granted' | 'denied'> };

const motionCtor = (): MotionCtor | null =>
  typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? (window.DeviceMotionEvent as unknown as MotionCtor) : null;

export function useShakeToGlobe(enabled: boolean) {
  const [listening, setListening] = useState(() => !!motionCtor() && !motionCtor()?.requestPermission);

  useEffect(() => {
    if (!enabled || !listening) return;
    let hits: number[] = [];
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (mag < SHAKE_ACCEL || isHeavyGamePath(window.location.pathname)) return;
      const now = Date.now();
      hits = [...hits.filter((t) => now - t < SHAKE_WINDOW_MS), now];
      if (hits.length >= SHAKE_HITS && now - last > COOLDOWN_MS) {
        last = now;
        hits = [];
        emitHolidayFx(SNOWGLOBE_EVENT);
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [enabled, listening]);

  const needsPermission = !listening && !!motionCtor()?.requestPermission;
  const askPermission = async () => {
    try {
      if ((await motionCtor()?.requestPermission?.()) === 'granted') setListening(true);
    } catch {
      setListening(false);
    }
  };
  return { needsPermission, askPermission };
}

export default function SnowGlobe({ needsPermission, askPermission }: { needsPermission: boolean; askPermission: () => void }) {
  const { t } = useLanguage();
  const { playWordRevealSound } = useSoundEffects();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onGlobe = () => {
      setOpen(true);
      playWordRevealSound();
      celebrateHolidayEgg('snowglobe');
    };
    window.addEventListener(SNOWGLOBE_EVENT, onGlobe);
    return () => window.removeEventListener(SNOWGLOBE_EVENT, onGlobe);
  }, [playWordRevealSound]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={t('holiday.eggs.globeTitle')} className="fixed inset-0 z-[95] flex items-center justify-center p-6" onClick={() => setOpen(false)}>
      <div className="holiday-globe-in relative w-[min(78vw,340px)]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holidays/m-snowglobe.webp" alt="" width={340} height={340} className="h-auto w-full drop-shadow-[6px_6px_0_var(--neo-black)]" />
        <div className="pointer-events-none absolute inset-x-[18%] top-[10%] h-[55%] overflow-hidden rounded-full" aria-hidden="true">
          {FLAKES.map((f, i) => (
            <span
              key={i}
              className="holiday-globe-flake absolute top-0 size-1.5 rounded-full bg-neo-holiday-snow"
              style={{ left: `${f.left}%`, ['--hfx-dur' as string]: `${f.dur}s`, ['--hfx-delay' as string]: `${f.delay}s`, ['--hfx-drift' as string]: `${f.drift}px` }}
            />
          ))}
        </div>
        <p className="mt-3 rounded-xl border-2 border-black bg-neo-cream px-3 py-2 text-center font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm">
          {t('holiday.eggs.globeTitle')}
        </p>
        <div className="mt-2 flex justify-center gap-2">
          {needsPermission && (
            <button type="button" onClick={askPermission} className="rounded-lg border-2 border-black bg-neo-holiday-red px-3 py-1 text-xs font-bold text-neo-white">
              {t('holiday.eggs.globeShake')}
            </button>
          )}
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border-2 border-black bg-neo-cream px-3 py-1 text-xs font-bold text-neo-navy">
            {t('holiday.eggs.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
