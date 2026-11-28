'use client';

import type { ReactNode } from 'react';
import { BookOpen, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssignmentWordcraftOption } from './AssignmentWordcraftOption';

type T = (key: string, fallback?: string) => string;
export type AssignmentModeChoice = 'wordcraft' | 'practice' | 'duel';

const OTHER = [
  { id: 'practice', icon: BookOpen, label: 'teacher.assignment.practiceMode', hint: 'teacher.assignment.practiceHint', fill: 'bg-neo-yellow' },
  { id: 'duel', icon: Swords, label: 'teacher.assignment.duelChallenge', hint: 'teacher.assignment.duelHint', fill: 'bg-neo-pink' },
] as const;

/** Every homework kind on one screen: Word Craft leads as the recommendation, the other two sit beside it instead of behind a fold. */
export function AssignmentModeStep({ selected, wordcraftOk, onSelect, children, t }: {
  selected: string;
  wordcraftOk: boolean;
  onSelect: (mode: AssignmentModeChoice) => void;
  children?: ReactNode;
  t: T;
}) {
  return (
    <div className="flex flex-col">
      <AssignmentWordcraftOption selected={selected === 'wordcraft'} disabled={!wordcraftOk} onSelect={() => onSelect('wordcraft')} t={t} />
      <div className="grid grid-cols-2 gap-3">
        {OTHER.map(({ id, icon: Icon, label, hint, fill }) => {
          const on = selected === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`assignment-mode-${id}`}
              aria-pressed={on}
              onClick={() => onSelect(id)}
              className={cn(
                'flex min-h-16 items-start gap-2 rounded-neo-lg border-[3px] px-3 py-2.5 text-start transition-transform active:translate-y-0.5 motion-reduce:transition-none',
                on ? cn(fill, 'border-neo-black text-neo-black shadow-hard-sm') : 'border-edu-line bg-edu-surface text-edu-ink hover:-translate-y-px',
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-neo-display text-sm font-bold">{t(label)}</span>
                <span className="block text-xs opacity-80">{t(hint)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
