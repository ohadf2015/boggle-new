'use client';

import { m, useReducedMotion } from 'framer-motion';
import { LifeBuoy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { HeatmapView } from './masteryHeatmapView';
import { ToneIcon } from './masteryTones';

type ListFormatCtor = new (locale: string, opts: { style: string; type: string }) => { format: (items: string[]) => string };

function joinNames(names: string[], locale: string): string {
  try {
    const ListFormat = (Intl as unknown as { ListFormat: ListFormatCtor }).ListFormat;
    return new ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    return names.join(', ');
  }
}

/** Phone layout: one card per word so no column scrolls out of sight. */
export function MasteryWordCards({ view, open }: { view: HeatmapView; open: boolean }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const animate = open && !reduceMotion;
  const struggling = view.students.filter((s) => s.needsHelp > 0);

  return (
    <div data-testid="mastery-word-cards" className="space-y-3 sm:hidden">
      <div className="rounded-neo border-2 border-neo-pink bg-neo-pink/10 p-2.5">
        <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-neo-pink">
          <LifeBuoy className="size-3.5" aria-hidden="true" />
          {t('eduPro.mastery.needsHelpTitle')}
        </h4>
        {struggling.length > 0 ? (
          <ul data-testid="mastery-needs-help-list" className="flex flex-wrap gap-1.5">
            {struggling.map((s) => (
              <li
                key={s.id}
                title={s.fullName}
                dir="auto"
                className="rounded-full border-2 border-neo-pink bg-neo-navy px-2.5 py-0.5 text-xs font-black text-neo-white shadow-hard-sm tabular-nums"
              >
                {t('eduPro.mastery.needsHelpChip', { name: s.name, count: s.needsHelp })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs font-bold text-neo-cream/80">{t('eduPro.mastery.allClear')}</p>
        )}
      </div>

      <ol key={open ? 'open' : 'closed'} className="space-y-2">
        {view.words.map((w, i) => {
          const missedPct = w.asked > 0 ? (w.missedBy.length / w.asked) * 100 : 0;
          const shakyPct = w.asked > 0 ? (w.shakyBy.length / w.asked) * 100 : 0;
          return (
            <m.li
              key={w.word}
              data-testid="mastery-word-card"
              initial={animate ? { y: 10, scale: 0.97 } : false}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 480, damping: 28, delay: Math.min(0.5, i * 0.05) }}
              className={cn(
                'relative overflow-hidden rounded-neo border-2 bg-neo-navy-light px-2.5 pb-2.5 pt-2',
                w.struggled > 0 ? 'border-neo-pink shadow-hard-sm' : 'border-neo-cream/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-neo-display text-base font-bold text-neo-white" dir="auto">
                  {w.display}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-black tabular-nums',
                    w.struggled > 0 ? 'bg-neo-pink text-neo-black' : 'bg-neo-lime text-neo-black',
                  )}
                >
                  {t('eduPro.mastery.missedByCount', { count: w.struggled, total: w.asked })}
                </span>
              </div>
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-1 bg-neo-lime/40">
                <m.span
                  className="h-full bg-neo-pink"
                  initial={animate ? { width: 0 } : false}
                  animate={{ width: `${missedPct}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: Math.min(0.6, 0.1 + i * 0.05) }}
                />
                <span className="h-full bg-neo-cyan" style={{ width: `${shakyPct}%` }} />
              </div>
              <div className="mt-1 space-y-0.5 text-xs font-bold">
                {w.missedBy.length > 0 && (
                  <p className="flex items-start gap-1.5 text-neo-white" dir="auto">
                    <ToneIcon tone="missed" className="mt-0.5 size-3.5 shrink-0 text-neo-pink" />
                    <span>{t('eduPro.mastery.missedNames', { names: joinNames(w.missedBy, language) })}</span>
                  </p>
                )}
                {w.shakyBy.length > 0 && (
                  <p className="flex items-start gap-1.5 text-neo-cream/80" dir="auto">
                    <ToneIcon tone="shaky" className="mt-0.5 size-3.5 shrink-0 text-neo-cyan" />
                    <span>{t('eduPro.mastery.shakyNames', { names: joinNames(w.shakyBy, language) })}</span>
                  </p>
                )}
                {w.missedBy.length === 0 && w.shakyBy.length === 0 && (
                  <p className="flex items-center gap-1.5 text-neo-lime">
                    <ToneIcon tone="solid" className="size-3.5" />
                    <span>{t('eduPro.mastery.everyoneGotIt')}</span>
                  </p>
                )}
              </div>
            </m.li>
          );
        })}
      </ol>
    </div>
  );
}
