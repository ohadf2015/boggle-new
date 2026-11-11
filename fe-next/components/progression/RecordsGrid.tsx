'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { collectPersonalRecords, type PersonalRecord, type RecordProfileFields } from '@/lib/records/personalRecords';

export interface RecordsGridProps {
  profile: RecordProfileFields | null | undefined;
  /** Signed-in player: also reads the profile's win-streak columns, which the auth profile doesn't load. */
  userId?: string | null;
}

async function readStreakColumns(userId: string): Promise<RecordProfileFields> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('mp_best_streak_classic, mp_best_streak_wordhunt')
    .eq('id', userId)
    .maybeSingle();
  return error || !data ? {} : (data as RecordProfileFields);
}

export function RecordsGrid({ profile, userId }: RecordsGridProps) {
  const { t, language } = useLanguage();
  // Device bests live in localStorage, so read after mount to keep SSR and hydration equal.
  const [records, setRecords] = useState<PersonalRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    const streaks = userId ? readStreakColumns(userId).catch(() => ({})) : Promise.resolve({});
    void streaks.then(extra => {
      if (alive) setRecords(collectPersonalRecords({ ...profile, ...extra }));
    });
    return () => {
      alive = false;
    };
  }, [profile, userId]);

  const fmt = (v: number | string) => (typeof v === 'number' ? v.toLocaleString(language) : v);

  return (
    <section data-testid="records-grid" className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard">
      <h3 className="mb-2 flex items-center gap-1.5 font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">
        <Trophy className="h-4 w-4 text-neo-yellow" aria-hidden="true" />
        {t('progression.records.title')}
      </h3>
      {records === null ? (
        <div className="h-16 animate-pulse rounded bg-neo-navy" />
      ) : records.length === 0 ? (
        <p className="text-xs font-bold text-neo-cream/70">{t('progression.records.empty')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {records.map(r => (
            <li
              key={r.key}
              data-testid={`record-${r.key}`}
              className="min-w-0 rounded-neo border-2 border-neo-black bg-neo-navy px-2 py-1.5"
            >
              <p className="truncate text-[10px] font-black uppercase tracking-wide text-neo-cream/70">
                {t(`progression.records.keys.${r.key}`)}
              </p>
              <p className="truncate font-neo-display text-lg font-black text-neo-yellow">{fmt(r.value)}</p>
              {r.previous !== undefined && (
                <p className="truncate text-[10px] font-bold text-neo-lime">
                  {t('progression.records.upFrom', { previous: fmt(r.previous) })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecordsGrid;
