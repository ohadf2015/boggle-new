'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordMasteryReport, MasteryCell } from '@/lib/education/wordMasteryReport';
import { cn } from '@/lib/utils';

function cellTone(cell: MasteryCell | undefined) {
  if (!cell || cell.attempts === 0) return 'unseen';
  const rate = cell.correct / cell.attempts;
  if (rate >= 1) return 'solid';
  if (rate >= 0.5) return 'shaky';
  return 'missed';
}

const TONE_CLASS = {
  solid: 'bg-neo-lime text-neo-black',
  shaky: 'bg-neo-cyan text-neo-black',
  missed: 'bg-neo-pink text-neo-black',
  unseen: 'bg-neo-white/5 text-neo-cream/40',
} as const;

export function MasteryHeatmap({ report, names }: { report: WordMasteryReport; names: Record<string, string> }) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { words, cells } = report.heatmap;
  const fallback = t('teacher.reports.arc.unknownStudent');

  return (
    <details
      className="group rounded-neo border-2 border-neo-cream/50 bg-neo-navy"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-neo-display text-sm font-bold text-neo-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan [&::-webkit-details-marker]:hidden">
        <span>{t('eduPro.mastery.heatmapToggle')}</span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="border-t-2 border-neo-cream/20 p-3">
        <p className="mb-2 text-xs font-bold text-neo-cream/70">{t('eduPro.mastery.heatmapHint')}</p>
        <Legend />
        <div data-testid="mastery-heatmap-scroll" className="mt-2 max-h-[60vh] overflow-x-auto overflow-y-auto rounded-neo border-2 border-black">
          <table className="border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th scope="col" className="sticky start-0 top-0 z-20 bg-neo-navy-light px-2 py-1.5 text-start font-bold text-neo-cream/80">
                  {t('eduPro.mastery.studentColumn')}
                </th>
                {words.map((w) => (
                  <th
                    key={w.word}
                    scope="col"
                    className="sticky top-0 z-10 h-24 min-w-9 bg-neo-navy-light px-0.5 align-bottom font-bold text-neo-white"
                  >
                    <span className="mx-auto block max-h-24 truncate [writing-mode:vertical-rl] rotate-180" dir="auto">
                      {w.display}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody key={open ? "open" : "closed"}>
              {report.students.map((s, row) => {
                const name = names[s.studentId] ?? fallback;
                return (
                  <tr key={s.studentId}>
                    <th scope="row" className="sticky start-0 z-10 max-w-[9rem] truncate bg-neo-navy px-2 py-1 text-start font-bold text-neo-white">
                      {name}
                      <span className="ms-1.5 font-normal text-neo-cream/60 tabular-nums">{s.accuracy}%</span>
                    </th>
                    {words.map((w, col) => {
                      const cell = cells[s.studentId]?.[w.word];
                      const tone = cellTone(cell);
                      const label = cell
                        ? t('eduPro.mastery.cellLabel', { name, word: w.display, correct: cell.correct, attempts: cell.attempts })
                        : t('eduPro.mastery.cellUnseen', { name, word: w.display });
                      return (
                        <td key={w.word} className="p-0.5">
                          <m.span
                            data-testid="mastery-heatmap-cell"
                            data-tone={tone}
                            role="img"
                            aria-label={label}
                            title={label}
                            initial={reduceMotion || !open ? false : { scale: 0.4 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 22, delay: Math.min(0.6, (row + col) * 0.018) }}
                            className={cn(
                              'grid size-8 place-items-center rounded-[6px] border-2 border-black font-black tabular-nums',
                              TONE_CLASS[tone],
                            )}
                          >
                            {cell ? `${cell.correct}/${cell.attempts}` : '–'}
                          </m.span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function Legend() {
  const { t } = useLanguage();
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-neo-cream/80">
      {(['solid', 'shaky', 'missed', 'unseen'] as const).map((tone) => (
        <span key={tone} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn('size-3 rounded-[3px] border border-black', TONE_CLASS[tone])} />
          {t(`eduPro.mastery.legend.${tone}`)}
        </span>
      ))}
    </p>
  );
}
