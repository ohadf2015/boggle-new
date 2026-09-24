'use client';

/**
 * Wide-screen side card, docked over the cloud band at the bottom-start of the
 * map: the class, this week's streak, how close the boss is, and the daily
 * chest. On a phone none of this has room — the HUD and the boss island carry
 * the same facts there.
 */

import Image from 'next/image';
import type { ReactNode } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InkPanel, Medallion, Ribbon, INK_TEXT } from './chrome';
import type { AcademyIsland } from './academyIslands';

interface Props {
  title: string;
  streak: number;
  boss: AcademyIsland | null;
  chest: ReactNode;
}

export function AcademySidePanel({ title, streak, boss, chest }: Props) {
  const { t } = useLanguage();
  const lit = Math.min(7, Math.max(0, streak));
  const have = boss?.progress?.have ?? 0;
  const need = boss?.progress?.need ?? 0;
  const pct = need > 0 ? Math.min(100, (have / need) * 100) : 0;

  return (
    <InkPanel tone="night" data-testid="academy-side-panel" className="w-full max-w-[26rem] p-4 pt-6">
      <Ribbon tone="pink" className="absolute -top-4 start-3 max-w-[80%]">
        <p dir="auto" className={`truncate font-neo-display text-sm font-black uppercase tracking-wide text-neo-white ${INK_TEXT}`}>{title}</p>
      </Ribbon>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Streak: this week as seven flames. */}
          <div className="flex items-center gap-2">
            <Medallion tone="ember" size={38} shadow={1}>
              <Flame className="h-4 w-4 fill-neo-yellow text-neo-black" strokeWidth={2.5} />
            </Medallion>
            <div className="min-w-0">
              <p dir="auto" className={`font-neo-display text-base font-black leading-tight text-neo-white ${INK_TEXT}`}>
                <span className="tabular-nums">{streak}</span> {t('education.xp.streak', 'Day Streak')}
              </p>
              <div className="mt-0.5 flex gap-1" aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <span
                    key={i}
                    className="h-3 w-5 rounded-full border-2 border-neo-black"
                    style={{ background: i < lit ? 'linear-gradient(180deg,#ffd23a,#ff6b35)' : '#2a2160' }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Boss: how many words stand between the student and the castle. */}
          {boss && need > 0 && (
            <div className="flex items-center gap-2">
              <span className="relative h-[38px] w-[38px] shrink-0">
                <Image
                  src="/images/education/node-boss.webp"
                  alt=""
                  aria-hidden="true"
                  fill
                  unoptimized
                  sizes="38px"
                  className={`object-contain drop-shadow-[1px_2px_0_#000] ${boss.state === 'locked' ? 'brightness-75 grayscale-[.6]' : ''}`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p dir="auto" className={`truncate font-neo-display text-base font-black leading-tight text-neo-white ${INK_TEXT}`}>
                  {boss.state === 'locked'
                    ? t('academy.student.bossNeed', 'Master {have}/{need} words', { have, need })
                    : t('academy.student.bossReady', 'Unlocked')}
                </p>
                <div
                  className="relative mt-1 h-3 overflow-hidden rounded-full border-2 border-neo-black"
                  style={{ background: '#120d33', boxShadow: 'inset 0 0 0 1px #f5c542' }}
                >
                  <span
                    className="absolute inset-y-0 start-0 rounded-full"
                    style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(180deg,#fff27a,#f39a1c)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 pb-2">{chest}</div>
      </div>
    </InkPanel>
  );
}
