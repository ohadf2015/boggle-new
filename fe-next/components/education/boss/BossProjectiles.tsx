'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomBossHit } from '@/shared/types/classroomBoss';
import styles from './boss.module.css';

const MAX_IN_FLIGHT = 8;
const COLORS = ['text-neo-cyan', 'text-neo-lime', 'text-neo-purple-light', 'text-neo-orange', 'text-neo-cyan-light'];
const LAUNCH = [
  { x: '-38vw', y: '26vw', r: '-30deg' },
  { x: '36vw', y: '25vw', r: '28deg' },
  { x: '-24vw', y: '30vw', r: '-18deg' },
  { x: '22vw', y: '31vw', r: '20deg' },
  { x: '-44vw', y: '14vw', r: '-36deg' },
  { x: '42vw', y: '15vw', r: '34deg' },
];

interface Flight extends ClassroomBossHit {
  slot: number;
}

export const BossProjectiles = memo(function BossProjectiles({ hits }: { hits: ClassroomBossHit[] }) {
  const { t } = useLanguage();
  const [flights, setFlights] = useState<Flight[]>([]);
  const land = (id: number) => setFlights((cur) => cur.filter((f) => f.id !== id));
  const seen = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    if (hits.length === 0) seen.current = 0;
    const fresh = hits.filter((h) => h.id > seen.current).reverse();
    if (fresh.length === 0) return;
    seen.current = Math.max(seen.current, ...fresh.map((h) => h.id));
    setFlights((cur) => [...cur, ...fresh.map((h) => ({ ...h, slot: h.id % LAUNCH.length }))].slice(-MAX_IN_FLIGHT));
    // Reduced motion runs no animation, so nothing fires animationend: the timer retires the number instead.
    for (const h of fresh) timers.current.push(window.setTimeout(() => land(h.id), 1700));
  }, [hits]);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {flights.map((f) => {
        const from = LAUNCH[f.slot];
        return (
          <div key={f.id} className="absolute left-1/2 top-[38%]">
            <span
              className={cn(
                'absolute -translate-x-1/2 whitespace-nowrap font-neo-display font-black uppercase tracking-wide [text-shadow:0.15vw_0.15vw_0_#000]',
                f.crit ? 'text-[3vw] text-neo-pink' : cn('text-[2.8vw]', COLORS[f.id % COLORS.length]),
                styles.projectile,
              )}
              style={{ '--x0': from.x, '--y0': from.y, '--r0': from.r } as React.CSSProperties}
            >
              {f.word}
            </span>
            <span
              className={cn(
                'absolute -translate-x-1/2 whitespace-nowrap text-center font-neo-display font-black leading-none [text-shadow:0.18vw_0.18vw_0_#000]',
                f.crit ? 'text-[3.4vw] text-neo-pink' : 'text-[2.6vw] text-neo-white',
                styles.pop,
              )}
              style={{ animationDelay: '600ms', animationFillMode: 'both', marginInlineStart: `${(f.slot % 2 ? 1 : -1) * 5}vw` }}
            >
              -{f.dmg}
              {f.crit && <span className="block text-[2.2vw] text-neo-yellow">{t('classroomBoss.crit')}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
});
