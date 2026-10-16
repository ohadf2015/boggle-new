'use client';

import { memo } from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const BAR = ['bg-neo-lime', 'bg-neo-purple', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-orange'];

interface Props {
  hitters: Array<{ username: string; dmg: number }>;
}

export const BossTopHitters = memo(function BossTopHitters({ hitters }: Props) {
  const { t } = useLanguage();
  const top = hitters[0]?.dmg ?? 1;
  return (
    <section
      data-testid="boss-top-hitters"
      className="rounded-[0.8vw] border-[0.25vw] border-neo-black bg-neo-navy-light/95 p-[1vw] shadow-hard-xl"
    >
      <h3 className="flex items-center gap-[0.5vw] font-neo-display text-[2.3vw] font-black uppercase tracking-wide text-neo-white">
        <Crown className="size-[2.3vw] text-neo-yellow" strokeWidth={3} aria-hidden="true" />
        {t('classroomBoss.topHitters')}
      </h3>
      {hitters.length === 0 ? (
        <p className="py-[1vw] text-center text-[2.1vw] font-bold leading-tight text-neo-white/60">{t('classroomBoss.noHitsYet')}</p>
      ) : (
        <ol className="mt-[0.8vw] space-y-[0.8vw]">
          {hitters.map((h, i) => (
            <li key={h.username} className="flex items-center gap-[0.6vw]">
              <span className={cn('grid size-[2.8vw] shrink-0 place-items-center rounded-[0.5vw] border-2 border-neo-black font-neo-display text-[2.1vw] font-black text-neo-black', i === 0 ? 'bg-neo-yellow' : 'bg-neo-white/80')}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p dir="auto" className="truncate text-[2.1vw] font-black leading-tight text-neo-white">{h.username}</p>
                <div className="mt-[0.2vw] h-[0.6vw] overflow-hidden rounded-full bg-neo-black/50">
                  <div className={cn('h-full origin-left rounded-full transition-transform duration-300 rtl:origin-right', BAR[i % BAR.length])} style={{ transform: `scaleX(${Math.max(0.04, h.dmg / top)})` }} />
                </div>
              </div>
              <span dir="ltr" className="shrink-0 text-end font-neo-display text-[2.3vw] font-black leading-none text-neo-yellow tabular-nums">
                {h.dmg}
                <span className="sr-only"> {t('classroomBoss.dmg')}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});
