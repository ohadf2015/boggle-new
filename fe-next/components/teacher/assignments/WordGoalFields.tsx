'use client';

import { cn } from '@/lib/utils';
import { WORD_COUNT_DEFAULT, WORD_COUNT_MAX, WORD_COUNT_MIN } from '@/lib/education/wordGoalAssignment';

interface WordGoalFieldsProps {
  kind: 'word_count' | 'word_list';
  wordCount: number;
  onWordCount: (n: number) => void;
  wordListRaw: string;
  onWordListRaw: (s: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function WordGoalFields({
  kind,
  wordCount,
  onWordCount,
  wordListRaw,
  onWordListRaw,
  t,
}: WordGoalFieldsProps) {
  if (kind === 'word_count') {
    return (
      <div>
        <label className="block text-sm font-neo-body text-neo-white mb-2" htmlFor="word-count-goal">
          {t('teacher.assignment.wordCountLabel')}
        </label>
        <p className="text-xs text-neo-white/70 font-neo-body mb-2 text-pretty">
          {t('teacher.assignment.wordCountGoalHint')}
        </p>
        <input
          id="word-count-goal"
          data-testid="word-count-goal"
          type="number"
          min={WORD_COUNT_MIN}
          max={WORD_COUNT_MAX}
          value={wordCount}
          onChange={(e) => onWordCount(Number(e.target.value) || WORD_COUNT_DEFAULT)}
          className="w-full p-3 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white font-neo-body"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-neo-body text-neo-white mb-2" htmlFor="word-list-goal">
        {t('teacher.assignment.wordListGoal')}
      </label>
      <p className="text-xs text-neo-white/70 font-neo-body mb-2 text-pretty">
        {t('teacher.assignment.wordListGoalHint')}
      </p>
      <textarea
        id="word-list-goal"
        data-testid="word-list-goal"
        value={wordListRaw}
        onChange={(e) => onWordListRaw(e.target.value)}
        rows={4}
        placeholder={t('teacher.assignment.wordListPlaceholder')}
        className={cn(
          'w-full p-3 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white font-neo-body resize-none',
        )}
      />
    </div>
  );
}
