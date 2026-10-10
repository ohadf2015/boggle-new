'use client';

import { cn } from '@/lib/utils';
import { WordGoalFields } from './WordGoalFields';
import type { WordGoalKind } from '@/lib/education/wordGoalAssignment';

interface AssignmentGoalModesProps {
  selectedType: string;
  onSelect: (kind: WordGoalKind) => void;
  wordCount: number;
  onWordCount: (n: number) => void;
  wordListRaw: string;
  onWordListRaw: (s: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function AssignmentGoalModes({
  selectedType,
  onSelect,
  wordCount,
  onWordCount,
  wordListRaw,
  onWordListRaw,
  t,
}: AssignmentGoalModesProps) {
  const isWordGoal = selectedType === 'word_count' || selectedType === 'word_list';
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <button
          type="button"
          data-testid="assignment-mode-word-count"
          onClick={() => onSelect('word_count')}
          className={cn(
            'px-4 py-3 rounded-neo border-neo transition-all font-bold',
            selectedType === 'word_count'
              ? 'bg-neo-yellow border-neo-yellow text-neo-black shadow-hard-sm'
              : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
          )}
        >
          {t('teacher.assignment.wordCountGoal')}
        </button>
        <button
          type="button"
          data-testid="assignment-mode-word-list"
          onClick={() => onSelect('word_list')}
          className={cn(
            'px-4 py-3 rounded-neo border-neo transition-all font-bold',
            selectedType === 'word_list'
              ? 'bg-neo-yellow border-neo-yellow text-neo-black shadow-hard-sm'
              : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
          )}
        >
          {t('teacher.assignment.wordListGoal')}
        </button>
      </div>
      {isWordGoal && (
        <WordGoalFields
          kind={selectedType as WordGoalKind}
          wordCount={wordCount}
          onWordCount={onWordCount}
          wordListRaw={wordListRaw}
          onWordListRaw={onWordListRaw}
          t={t}
        />
      )}
    </>
  );
}
