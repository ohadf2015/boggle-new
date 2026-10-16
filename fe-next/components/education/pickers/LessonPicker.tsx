'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Search, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  activeLanguageOf,
  boardLanguageOf,
  sortLessonsForClass,
  toggleLessonInOneLanguage,
} from '@/lib/education/lessonPickerModel';
import { languageFlag } from '@/lib/i18n/languageLabels';
import { LessonPickerOption, type PickerLesson } from './LessonPickerOption';
import { nativeLanguageName } from './nativeLanguageName';

const SEARCH_THRESHOLD = 6;

export interface LessonPickerProps {
  lessons: PickerLesson[];
  mode: 'single' | 'multi';
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Lists in the class's language sort first; a board in another language gets a note. */
  classLanguage?: string | null;
  /** Display labels by id (e.g. same-named lists suffixed with their class). */
  labels?: ReadonlyMap<string, string>;
  /** Where "Create a word list" goes when the teacher has none. */
  createHref?: string;
  /** Single mode: id of the visible heading that names the radio group. */
  labelledBy?: string;
  className?: string;
}

export function LessonPicker({
  lessons,
  mode,
  selectedIds,
  onChange,
  classLanguage,
  labels,
  createHref,
  labelledBy,
  className,
}: LessonPickerProps) {
  const { t } = useLanguage();
  const radioName = useId();
  const headingId = `${radioName}-heading`;
  const [query, setQuery] = useState('');
  const [switchedTo, setSwitchedTo] = useState<string | null>(null);
  const labelOf = (l: PickerLesson) => labels?.get(l.id) ?? l.name;

  const sorted = useMemo(() => sortLessonsForClass(lessons, classLanguage), [lessons, classLanguage]);
  const needle = query.trim().toLowerCase();
  const visible = needle ? sorted.filter((l) => (labels?.get(l.id) ?? l.name).toLowerCase().includes(needle)) : sorted;
  const groups = useMemo(() => {
    const byLanguage = new Map<string, PickerLesson[]>();
    for (const l of visible) {
      const key = l.language ?? '';
      byLanguage.set(key, [...(byLanguage.get(key) ?? []), l]);
    }
    return [...byLanguage.entries()];
  }, [visible]);
  const showGroupHeadings = new Set(lessons.map((l) => l.language ?? '')).size > 1;

  const selected = lessons.filter((l) => selectedIds.includes(l.id));
  const board = boardLanguageOf(selected);
  const activeLanguage = activeLanguageOf(sorted, selectedIds, classLanguage);
  const pool = activeLanguage ? lessons.filter((l) => l.language === activeLanguage) : lessons;
  const allSelected = pool.length > 0 && selectedIds.length === pool.length && pool.every((l) => selectedIds.includes(l.id));

  const toggle = (id: string) => {
    if (mode === 'single') {
      onChange([id]);
      return;
    }
    const next = toggleLessonInOneLanguage(lessons, selectedIds, id);
    setSwitchedTo(next.switchedTo);
    onChange(next.ids);
  };

  if (lessons.length === 0) {
    return (
      <div className={cn('py-6 text-center', className)}>
        <BookOpen className="mx-auto mb-3 size-12 text-neo-white" aria-hidden="true" />
        <p className="font-neo-body text-neo-white">{t('education.classroomGame.noLessonsAvailable')}</p>
        {createHref && (
          <Link
            href={createHref}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 font-neo-display text-sm font-black text-neo-black shadow-hard-sm transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
            {t('eduPickers.lesson.create', 'Create a word list')}
          </Link>
        )}
      </div>
    );
  }

  const boardName = board.language ? nativeLanguageName(board.language) : '';
  const notice = board.mixed
    ? { id: 'lesson-mixed-warning', text: t('eduPickers.lesson.mixedWarning', 'These lists use different languages. The board will use {language} letters.', { language: boardName }) }
    : board.language && classLanguage && board.language !== classLanguage
      ? {
          id: 'lesson-class-mismatch',
          text: t('eduPickers.lesson.classMismatch', 'This class is set to {classLanguage}. The board will use {language} letters.', {
            classLanguage: nativeLanguageName(classLanguage),
            language: boardName,
          }),
        }
      : null;

  return (
    <div className={cn('space-y-3', className)}>
      {mode === 'multi' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={headingId} className="font-neo-display text-lg text-neo-white">{t('education.classroomGame.selectLessons')}</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-neo border-2 border-neo-cyan bg-neo-navy-light px-2 py-1 font-neo-body text-sm font-bold text-neo-cyan">
              {t(selectedIds.length === 1 ? 'education.classroomGame.lessonSelected' : 'education.classroomGame.lessonsSelected', { count: selectedIds.length })}
            </span>
            <button
              type="button"
              onClick={() => onChange(allSelected ? [] : pool.map((l) => l.id))}
              className={cn(
                'rounded-neo border-[3px] border-neo-cream px-4 py-2.5 text-sm font-bold transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
                allSelected ? 'bg-neo-white/20 text-neo-white hover:bg-neo-white/30' : 'bg-neo-cyan/20 text-neo-cyan hover:bg-neo-cyan/30'
              )}
            >
              {allSelected
                ? t('education.classroomGame.deselectAll')
                : showGroupHeadings && activeLanguage
                  ? t('eduPickers.lesson.selectAllIn', 'Select all {language}', { language: nativeLanguageName(activeLanguage) })
                  : t('education.classroomGame.selectAllLessons')}
            </button>
          </div>
        </div>
      )}

      {lessons.length > SEARCH_THRESHOLD && (
        <label className="relative block">
          <span className="sr-only">{t('eduPickers.lesson.searchLabel', 'Search word lists')}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-neo-black/60" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('eduPickers.lesson.searchPlaceholder', 'Search your lists')}
            className="h-11 w-full rounded-neo border-[3px] border-neo-black bg-neo-cream ps-9 pe-3 font-neo-body text-base text-neo-black shadow-hard-sm placeholder:text-neo-black/50 focus:outline-hidden focus:ring-3 focus:ring-neo-cyan"
          />
        </label>
      )}

      {notice && (
        <p
          data-testid={notice.id}
          className="flex items-start gap-2 rounded-neo border-2 border-neo-yellow bg-neo-navy-light px-3 py-2 font-neo-body text-sm font-bold text-neo-yellow"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          {notice.text}
        </p>
      )}
      <p role="status" className={switchedTo ? 'font-neo-body text-sm text-neo-cream/85' : 'sr-only'}>
        {switchedTo
          ? t('eduPickers.lesson.switched', 'Switched to {language}. A game uses one language, so the other lists were cleared.', {
              language: nativeLanguageName(switchedTo),
            })
          : ''}
      </p>

      {visible.length === 0 ? (
        <p data-testid="lesson-picker-no-match" className="py-4 text-center font-neo-body text-sm text-neo-cream/80">
          {t('eduPickers.lesson.noMatch', 'No lists match "{query}"', { query: query.trim() })}
        </p>
      ) : (
        <div
          role={mode === 'single' ? 'radiogroup' : 'group'}
          aria-labelledby={mode === 'multi' ? headingId : labelledBy}
          className="space-y-3"
        >
          {groups.map(([language, items]) => (
            <div key={language || 'none'} data-testid="lesson-language-group" data-language={language} className="space-y-2">
              {showGroupHeadings && (
                <p className="flex items-center gap-1.5 font-neo-body text-xs font-bold text-neo-cream/75">
                  <span aria-hidden="true">{language ? languageFlag(language) : '\u{1F310}'}</span>
                  <span lang={language || undefined}>
                    {language ? nativeLanguageName(language) : t('eduPickers.lesson.noLanguage', 'Other')}
                  </span>
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((lesson) => (
                  <LessonPickerOption
                    key={lesson.id}
                    lesson={lesson}
                    label={labelOf(lesson)}
                    selected={selectedIds.includes(lesson.id)}
                    onToggle={() => toggle(lesson.id)}
                    mode={mode}
                    radioName={radioName}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'multi' && selectedIds.length > 1 && !board.mixed && (
        <p className="font-neo-body text-sm text-neo-white">{t('education.classroomGame.multiLessonHelp')}</p>
      )}
    </div>
  );
}

export default LessonPicker;
