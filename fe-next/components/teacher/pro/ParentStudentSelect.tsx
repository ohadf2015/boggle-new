'use client';

import { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SelectableStudent {
  id: string;
  name: string;
}

interface ParentStudentSelectProps {
  students: SelectableStudent[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

const SMALL_BTN =
  'min-h-9 rounded-neo border-2 border-neo-black bg-neo-white px-3 text-xs font-black text-neo-black hover:-translate-y-0.5 transition-transform motion-reduce:transition-none disabled:opacity-50';

/** Search + checkbox roster. Every parent-report flow picks its students here. */
export function ParentStudentSelect({ students, selected, onChange }: ParentStudentSelectProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const searchId = useId();

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return q ? students.filter((s) => s.name.toLocaleLowerCase().includes(q)) : students;
  }, [students, query]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectVisible = () => onChange(new Set([...selected, ...visible.map((s) => s.id)]));

  return (
    <div className="space-y-2">
      <label htmlFor={searchId} className="sr-only">{t('parentReportsFlow.search')}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-neo-black/60" aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('parentReportsFlow.search')}
          className="min-h-11 w-full rounded-neo border-2 border-neo-black bg-neo-white ps-9 pe-3 text-sm font-bold text-neo-black placeholder:text-neo-black/50"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={selectVisible} disabled={visible.length === 0} className={SMALL_BTN}>
          {t('parentReportsFlow.selectAll')}
        </button>
        <button type="button" onClick={() => onChange(new Set())} disabled={selected.size === 0} className={SMALL_BTN}>
          {t('parentReportsFlow.selectNone')}
        </button>
        <span className="ms-auto text-xs font-bold text-neo-black/75" aria-live="polite">
          {t('parentReportsFlow.selectedCount', { count: selected.size, total: students.length })}
        </span>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-neo border-2 border-dashed border-neo-black p-3 text-sm font-bold text-neo-black/75">
          {t('parentReportsFlow.noMatch')}
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-neo border-2 border-neo-black bg-neo-white p-2">
          {visible.map((s) => (
            <li key={s.id}>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-neo px-2 text-sm font-bold text-neo-black hover:bg-neo-cyan/15">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="size-5 shrink-0 accent-neo-black [color-scheme:light]"
                />
                <bdi className="min-w-0 truncate" title={s.name}>{s.name}</bdi>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
