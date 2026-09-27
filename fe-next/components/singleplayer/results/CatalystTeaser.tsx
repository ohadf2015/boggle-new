'use client';

import { memo } from 'react';
import { m } from 'framer-motion';
import { Mountain, Snowflake, Zap, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';

interface CatalystTeaserProps {
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface Catalyst {
  id: 'earthquake' | 'blizzard' | 'lightning' | 'meteor';
  Icon: typeof Mountain;
  iconBg: string;
  iconText: string;
  border: string;
}

const CATALYSTS: Catalyst[] = [
  { id: 'earthquake', Icon: Mountain,   iconBg: 'bg-neo-orange',  iconText: 'text-neo-navy',  border: 'border-neo-orange/60' },
  { id: 'blizzard',   Icon: Snowflake,  iconBg: 'bg-neo-cyan',    iconText: 'text-neo-navy',  border: 'border-neo-cyan/60' },
  { id: 'lightning',  Icon: Zap,        iconBg: 'bg-neo-yellow',  iconText: 'text-neo-navy',  border: 'border-neo-yellow/60' },
  { id: 'meteor',     Icon: Flame,      iconBg: 'bg-neo-pink',    iconText: 'text-neo-white', border: 'border-neo-pink/60' },
];

/**
 * CatalystTeaser — End-of-practice preview of mid-game catalyst events.
 *
 * Practice mode disables catalysts so newcomers can focus on word-finding. This
 * card surfaces what's coming in arena/adventure: 4 distinct catalysts, only
 * ONE fires per game (matched server-side by `earthquakeHandler` ↔ `roundEventsManager`).
 */
export const CatalystTeaser = memo(function CatalystTeaser({ t }: CatalystTeaserProps) {
  const reducedMotion = useReducedMotion();

  return (
    <m.section
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      className="rounded-neo border-3 border-neo-black bg-neo-navy-light/60 p-4 shadow-hard"
      aria-label={t('catalystTeaser.title')}
    >
      <header className="text-center mb-3">
        <p className="font-neo-display font-black uppercase tracking-wider text-sm text-neo-lime">
          {t('catalystTeaser.title')}
        </p>
        <p className="font-neo-body text-[11px] text-neo-white mt-0.5">
          {t('catalystTeaser.subtitle')}
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-2">
        {CATALYSTS.map((c, i) => (
          <m.li
            key={c.id}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.65 + i * 0.06, type: 'spring', stiffness: 320, damping: 22 }}
            className={cn(
              'flex items-start gap-2 rounded-neo border-2 bg-neo-navy/70 p-2',
              c.border,
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black shadow-hard-sm',
                c.iconBg,
              )}
            >
              <c.Icon className={cn('h-4 w-4', c.iconText)} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-neo-display font-black uppercase text-[11px] text-neo-white tracking-wide">
                {t(`catalystTeaser.${c.id}.name`)}
              </span>
              <span className="block font-neo-body text-[10px] text-neo-white leading-snug">
                {t(`catalystTeaser.${c.id}.desc`)}
              </span>
            </span>
          </m.li>
        ))}
      </ul>

      <p className="mt-3 text-center font-neo-body text-[10px] uppercase tracking-wider text-neo-cyan/80">
        {t('catalystTeaser.onePerGame')}
      </p>
    </m.section>
  );
});

export default CatalystTeaser;
