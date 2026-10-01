'use client';

import { useMemo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordMasteryReport } from '@/lib/education/wordMasteryReport';
import { cn } from '@/lib/utils';
import { buildHeatmapView, cellTone } from './masteryHeatmapView';
import { MasteryLegend, TONE_CLASS, ToneIcon } from './masteryTones';
import { MasteryWordCards } from './MasteryWordCards';

/** `names` are full display names by student id; rows show first names only. */
export function MasteryHeatmap({ report, names }: { report: WordMasteryReport; names: Record<string, string> }) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const fallback = t('teacher.reports.arc.unknownStudent');
  const view = useMemo(() => buildHeatmapView(report, names, fallback), [report, names, fallback]);
  const { cells } = report.heatmap;

  return (
    <details
      className="group rounded-neo border-2 border-neo-cream/50 bg-neo-navy"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-neo-display text-sm font-bold text-neo-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan [&::-webkit-details-marker]:hidden">
        <span>{t('eduPro.mastery.heatmapToggle')}</span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="space-y-2.5 border-t-2 border-neo-cream/40 p-3">
        <p className="hidden text-xs font-bold text-neo-cream/70 sm:block">{t('eduPro.mastery.heatmapHint')}</p>
        <p className="text-xs font-bold text-neo-cream/70 sm:hidden">{t('eduPro.mastery.phoneHint')}</p>
        <MasteryLegend />
        <div className="hidden sm:block">
          <div data-testid="mastery-heatmap-scroll" className="max-h-[70vh] overflow-x-auto overflow-y-auto rounded-neo border-2 border-neo-cream/40">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th scope="col" className="sticky start-0 top-0 z-30 w-44 min-w-[9.5rem] border-b-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2 text-start align-bottom font-bold text-neo-cream/80">
                    <span className="flex items-end justify-between gap-2">
                      <span>{t('eduPro.mastery.studentColumn')}</span>
                      <span className="text-[10px] uppercase text-neo-pink">{t('eduPro.mastery.needsHelpColumn')}</span>
                    </span>
                  </th>
                  {view.words.map((w) => (
                    <th key={w.word} scope="col" title={w.display} className="sticky top-0 z-10 min-w-12 border-b-2 border-neo-cream/40 bg-neo-navy-light px-1 py-2 text-center align-bottom font-bold text-neo-white">
                      <span className="mx-auto block max-w-[6.5rem] truncate text-[13px]" dir="auto">{w.display}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody key={open ? 'open' : 'closed'}>
                {view.students.map((s, row) => (
                  <tr key={s.id} className="group/row">
                    <th scope="row" className="sticky start-0 z-20 border-b border-neo-cream/40 bg-neo-navy px-3 py-1 text-start font-bold text-neo-white group-hover/row:bg-neo-navy-light">
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span title={s.fullName} className="block truncate text-sm" dir="auto">{s.name}</span>
                          <span className="block text-[11px] font-bold text-neo-cream/60 tabular-nums">{s.accuracy}%</span>
                        </span>
                        <span
                          data-testid="mastery-needs-help"
                          aria-label={t('eduPro.mastery.needsHelpLabel', { name: s.fullName, count: s.needsHelp })}
                          className={cn(
                            'grid h-7 min-w-8 shrink-0 place-items-center rounded-full border-2 px-2 font-neo-display text-sm font-black tabular-nums',
                            s.needsHelp > 0 ? 'border-black bg-neo-pink text-neo-black shadow-hard-sm' : 'border-neo-cream/40 text-neo-cream/60',
                          )}
                        >
                          {s.needsHelp}
                        </span>
                      </span>
                    </th>
                    {view.words.map((w, col) => {
                      const cell = cells[s.id]?.[w.word];
                      const tone = cellTone(cell);
                      const label = cell
                        ? t('eduPro.mastery.cellLabel', { name: s.fullName, word: w.display, correct: cell.correct, attempts: cell.attempts })
                        : t('eduPro.mastery.cellUnseen', { name: s.fullName, word: w.display });
                      return (
                        <td key={w.word} className="border-b border-neo-cream/40 p-0.5 group-hover/row:bg-neo-white/[0.03]">
                          <m.span
                            data-testid="mastery-heatmap-cell"
                            data-tone={tone}
                            role="img"
                            aria-label={label}
                            title={label}
                            initial={reduceMotion || !open ? false : { scale: 0.4 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 22, delay: Math.min(0.6, (row + col) * 0.018) }}
                            className={cn('mx-auto grid h-9 w-full min-w-9 max-w-16 place-items-center rounded-[6px] border-2', TONE_CLASS[tone])}
                          >
                            <ToneIcon tone={tone} />
                          </m.span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="sticky bottom-0 start-0 z-30 border-t-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2 text-start text-[11px] font-black uppercase text-neo-cream/80">
                    {t('eduPro.mastery.missedRow')}
                  </th>
                  {view.words.map((w) => (
                    <td key={w.word} className="sticky bottom-0 z-10 border-t-2 border-neo-cream/40 bg-neo-navy-light px-1 py-2 text-center">
                      <span
                        data-testid="mastery-word-missed"
                        aria-label={t('eduPro.mastery.wordMissedLabel', { word: w.display, count: w.struggled, total: w.asked })}
                        className={cn('font-neo-display text-sm font-black tabular-nums', w.struggled > 0 ? 'text-neo-pink' : 'text-neo-lime')}
                      >
                        {`${w.struggled}/${w.asked}`}
                      </span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <MasteryWordCards view={view} open={open} />
      </div>
    </details>
  );
}
