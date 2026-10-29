'use client';

import { BookOpen, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { lessonWordCount, type PickerLessonLike } from '@/lib/education/lessonPickerModel';
import { languageFlag } from '@/lib/i18n/languageLabels';
import { nativeLanguageName } from './nativeLanguageName';

export interface PickerLesson extends PickerLessonLike {
  description?: string | null;
}

interface LessonPickerOptionProps {
  lesson: PickerLesson;
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** "single" renders a native radio inside a label; "multi" a checkbox-role button. */
  mode: 'single' | 'multi';
  radioName?: string;
}

const CARD =
  'relative flex w-full flex-col gap-1.5 rounded-neo border-[3px] p-3.5 text-start ' +
  'transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97] ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100';
const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

export function LessonPickerOption({ lesson, label, selected, onToggle, mode, radioName }: LessonPickerOptionProps) {
  const { t } = useLanguage();
  const count = lessonWordCount(lesson);
  const look = selected
    ? 'bg-neo-cyan border-neo-black text-neo-black shadow-hard'
    : 'bg-neo-navy/50 border-neo-cream/70 text-neo-white hover:border-neo-cream hover:bg-neo-navy shadow-hard-sm';

  const body = (
    <>
      {selected && (
        <span aria-hidden="true" className="absolute end-2 top-2 rounded-full bg-neo-black p-1">
          <Check className="size-4 text-neo-cyan" />
        </span>
      )}
      <span className="flex items-start gap-2 pe-7">
        <BookOpen className={cn('mt-0.5 size-5 shrink-0', selected ? 'text-neo-black' : 'text-neo-pink')} aria-hidden="true" />
        <span dir="auto" className="font-neo-display font-bold leading-snug">{label}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <span className={cn('text-sm font-semibold', selected ? 'text-neo-black/75' : 'text-neo-white/85')}>
          {count} {count === 1 ? t('education.lesson.word') : t('education.lesson.words', { count })}
        </span>
        {lesson.language && (
          <span
            data-testid="lesson-language-badge"
            className={cn(
              'inline-flex items-center gap-1 rounded-neo border-2 px-1.5 py-px text-xs font-bold',
              selected ? 'border-neo-black/60 text-neo-black' : 'border-neo-cream/50 text-neo-cream'
            )}
          >
            <span aria-hidden="true">{languageFlag(lesson.language)}</span>
            <span lang={lesson.language}>{nativeLanguageName(lesson.language)}</span>
          </span>
        )}
      </span>
      {lesson.description && (
        <span dir="auto" className={cn('text-xs', selected ? 'text-neo-black/65' : 'text-neo-white/75')}>
          {lesson.description}
        </span>
      )}
    </>
  );

  if (mode === 'single') {
    return (
      <label className={cn(CARD, look, 'cursor-pointer has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-neo-cyan has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-neo-navy')}>
        <input type="radio" name={radioName} value={lesson.id} checked={selected} onChange={onToggle} className="sr-only" />
        {body}
      </label>
    );
  }

  return (
    <button type="button" role="checkbox" aria-checked={selected} onClick={onToggle} className={cn(CARD, look, RING)}>
      {body}
    </button>
  );
}
