'use client';

import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { spawnBurst } from '@/components/daily/holiday/holidayBurst';
import { cn } from '@/lib/utils';
import { TV_BTN } from './PartyChrome';
import { seatBg } from './seatColor';
import type { PodiumRow } from './useArcadeParty';
import styles from './party.module.css';
import { useFreshTap } from '../useFreshTap';

const STEP: Record<number, { h: string; medal: string }> = {
  1: { h: 'h-[34cqh]', medal: 'bg-neo-holiday-gold' },
  2: { h: 'h-[24cqh]', medal: 'bg-neo-holiday-snow' },
  3: { h: 'h-[16cqh]', medal: 'bg-neo-orange' },
};

export default function PartyPodium({ rows, mascot, onAgain }: { rows: PodiumRow[]; mascot: string; onAgain: () => void }) {
  const { t } = useLanguage();
  const layer = useRef<HTMLDivElement>(null);
  const { surface, guard } = useFreshTap(3000);
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const rest = rows.slice(3);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const shots = [0, 450, 900, 1600].map((ms, i) =>
      window.setTimeout(() => {
        spawnBurst(el, width * (0.3 + 0.2 * (i % 3)), height * 0.3, 'confetti', 40);
        spawnBurst(el, width * (0.7 - 0.2 * (i % 3)), height * 0.25, 'ribbon', 20);
      }, ms),
    );
    return () => shots.forEach((id) => window.clearTimeout(id));
  }, []);

  return (
    <main {...surface} data-testid="party-podium" className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-end gap-[2cqh] px-[4cqw] pb-[3cqh]">
      <div ref={layer} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />
      <h2 className="text-center font-neo-display text-[9cqh] font-black leading-none text-neo-white [text-shadow:0.06em_0.06em_0_rgb(var(--neo-black))]">
        {rows[0] ? (rows[1]?.place === 1 ? t('holiday.arcade.party.tie') : t('holiday.arcade.party.winner', { name: rows[0].name })) : t('holiday.arcade.family.podium')}
      </h2>
      <div className="flex w-full items-end justify-center gap-[2cqw]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascot} alt="" className={cn('h-[34cqh] w-auto self-end drop-shadow-[0.4cqh_0.4cqh_0_rgb(var(--neo-black))]', styles.cheer)} />
        <ol className="flex items-end gap-[1.4cqw]">
          {order.map((r) => (
            <li key={r.id} className="flex w-[19cqw] flex-col items-center">
              <span className={cn('grid size-[9cqh] place-items-center rounded-full border-[0.45cqh] border-black font-neo-display text-[5.4cqh] font-black text-neo-navy shadow-hard', STEP[r.place]?.medal ?? 'bg-neo-cream', styles.chipIn)}>{r.place}</span>
              <span className={cn('mt-[1cqh] flex w-full flex-col items-center gap-[0.6cqh] rounded-t-[2cqh] border-[0.5cqh] border-b-0 border-black px-[1cqw] pt-[1.6cqh] text-neo-navy shadow-hard-lg', seatBg(r.color), STEP[r.place]?.h ?? 'h-[12cqh]', styles.rise)}>
                <span className="max-w-full truncate font-neo-display text-[4.4cqh] font-black leading-none">{r.name}</span>
                <span className="font-neo-display text-[5.6cqh] font-black leading-none tabular-nums">{r.score}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      {rest.length > 0 && (
        <ol className="flex flex-wrap justify-center gap-[1cqw] text-[3cqh]">
          {rest.map((r) => (
            <li key={r.id} className={cn('rounded-full border-[0.1em] border-black px-[0.6em] font-neo-display font-black text-neo-navy shadow-hard', seatBg(r.color))}>
              {r.place}. {r.name} · {r.score}
            </li>
          ))}
        </ol>
      )}
      <button type="button" data-testid="party-start" onClick={guard(onAgain)} className={cn(TV_BTN, 'flex gap-[0.4em] bg-neo-lime px-[1em] py-[0.25em] font-neo-display text-[6cqh] font-black text-neo-navy shadow-hard-lg')}>
        <RotateCcw className="size-[0.9em]" aria-hidden="true" />
        {t('holiday.arcade.party.again')}
      </button>
    </main>
  );
}
