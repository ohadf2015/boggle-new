'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { LastGameMissedWord } from '@/lib/supabase/analyticsLastGame';

export function RoundWordsTab({ words }: { words: LastGameMissedWord[] }) {
  const { t } = useLanguage();

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wide text-neo-white/70">
        <span className="w-28 shrink-0 sm:w-36">{t('teacher.classReport.word')}</span>
        <span className="flex-1" />
        <span className="w-28 shrink-0 text-end">{t('teacher.classReport.classMiss')}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {words.map((w) => (
          <li key={w.word} data-testid="round-report-word-row" data-word={w.word} className="flex min-h-9 items-center gap-2 px-1">
            <span className="w-28 shrink-0 truncate text-start text-sm font-black text-neo-white sm:w-36"><bdi>{w.word}</bdi></span>
            <span className="flex h-4 min-w-0 flex-1 overflow-hidden rounded-sm border border-neo-black bg-neo-lime" aria-hidden>
              <span className="ms-auto h-full bg-neo-pink" style={{ width: `${w.pct}%` }} />
            </span>
            <span dir="ltr" className="w-12 shrink-0 text-end text-xs font-bold tabular-nums text-neo-white/70">{w.missedBy}/{w.total}</span>
            <span className="w-14 shrink-0 text-end text-sm font-black tabular-nums text-neo-pink">{w.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
