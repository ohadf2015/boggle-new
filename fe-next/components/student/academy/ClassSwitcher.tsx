'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  classrooms: { id: string; name: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Shown only when the student is in more than one class. */
export function ClassSwitcher({ classrooms, activeId, onSelect }: Props) {
  const { t } = useLanguage();
  if (classrooms.length < 2) return null;
  return (
    <div role="radiogroup" aria-label={t('student.classSwitcher.label')} className="flex flex-wrap gap-2 border-b-3 border-neo-black bg-neo-cream px-3 py-2">
      {classrooms.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && onSelect(c.id)}
            className={`min-h-[44px] max-w-full truncate rounded-neo border-2 border-neo-black px-3 font-neo-display text-sm font-black text-neo-black shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan ${active ? 'bg-neo-lime' : 'bg-neo-white'}`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
