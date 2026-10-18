'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  GRADE_BANDS,
  SUBJECTS,
  type AssignmentTemplate,
  type GradeBand,
  type AssignmentSubject,
} from '@/lib/education/assignmentTemplates';

type GradeFilter = GradeBand | 'all';
type SubjectFilter = AssignmentSubject | 'all';

export function AssignmentTemplateGallery({
  templates,
  isSubmitting,
  onAssign,
  onClose,
  onCreateOwn,
}: {
  templates: AssignmentTemplate[];
  isSubmitting: boolean;
  onAssign: (template: AssignmentTemplate) => void;
  onClose: () => void;
  onCreateOwn?: () => void;
}) {
  const { t } = useLanguage();
  const [gradeBand, setGradeBand] = useState<GradeFilter>('all');
  const [subject, setSubject] = useState<SubjectFilter>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      templates.filter((template) => {
        if (gradeBand !== 'all' && template.gradeBand !== gradeBand) return false;
        if (subject !== 'all' && template.subject !== subject) return false;
        return true;
      }),
    [templates, gradeBand, subject],
  );

  return (
    <div data-testid="assignment-template-gallery" className="space-y-4">
      <p className="font-neo-body text-sm font-bold text-neo-white">
        {t('teacher.assignment.galleryTitle')}
      </p>
      <p className="font-neo-body text-xs text-neo-white/70 text-pretty">
        {t('teacher.assignment.galleryHint')}
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('teacher.assignment.gradeBand')}>
        <FilterChip
          testId="template-filter-grade-all"
          active={gradeBand === 'all'}
          disabled={isSubmitting}
          onClick={() => setGradeBand('all')}
        >
          {t('teacher.assignment.gradeBandAll')}
        </FilterChip>
        {GRADE_BANDS.map((band) => (
          <FilterChip
            key={band}
            testId={`template-filter-grade-${band}`}
            active={gradeBand === band}
            disabled={isSubmitting}
            onClick={() => setGradeBand(band)}
          >
            {t(`teacher.assignment.gradeBand${bandKey(band)}`)}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('teacher.assignment.subject')}>
        <FilterChip
          testId="template-filter-subject-all"
          active={subject === 'all'}
          disabled={isSubmitting}
          onClick={() => setSubject('all')}
        >
          {t('teacher.assignment.subjectAll')}
        </FilterChip>
        {SUBJECTS.map((item) => (
          <FilterChip
            key={item}
            testId={`template-filter-subject-${item}`}
            active={subject === item}
            disabled={isSubmitting}
            onClick={() => setSubject(item)}
          >
            {t(`teacher.assignment.subject${capitalize(item)}`)}
          </FilterChip>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((template) => {
          const open = previewId === template.id;
          return (
            <div
              key={template.id}
              data-testid={`assignment-template-${template.id}`}
              className={cn(
                'rounded-neo border-3 border-neo-cream bg-neo-navy-light p-4 text-start',
              )}
            >
              <span className="block font-neo-display text-sm font-black uppercase text-neo-white">
                {t(template.nameKey)}
              </span>
              <span className="mt-1 block font-neo-body text-xs text-neo-white/70 text-pretty">
                {t(template.descriptionKey)}
              </span>
              <span className="mt-2 block font-neo-body text-xs font-bold text-neo-cyan">
                {template.words.length} {t('teacher.assignment.words')} ·{' '}
                {t(`teacher.assignment.gradeBand${bandKey(template.gradeBand)}`)} ·{' '}
                {t(`teacher.assignment.subject${capitalize(template.subject)}`)}
              </span>

              {open ? (
                <ul
                  data-testid={`assignment-template-words-${template.id}`}
                  className="mt-3 max-h-40 overflow-y-auto space-y-1 font-neo-body text-xs text-neo-white/90"
                >
                  {template.words.map((word) => (
                    <li key={word.word}>
                      <span className="font-bold">{word.word}</span>
                      {word.definition ? ` — ${word.definition}` : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  data-testid={`assignment-template-preview-${template.id}`}
                  disabled={isSubmitting}
                  onClick={() => setPreviewId(open ? null : template.id)}
                  className="border-neo-cyan text-neo-cyan hover:bg-neo-cyan/20"
                >
                  {open
                    ? t('teacher.assignment.galleryHidePreview')
                    : t('teacher.assignment.galleryPreview')}
                </Button>
                <Button
                  type="button"
                  data-testid={`assignment-template-assign-${template.id}`}
                  disabled={isSubmitting}
                  onClick={() => onAssign(template)}
                >
                  {t('teacher.assignment.galleryAssign')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {onCreateOwn ? (
          <Button
            type="button"
            variant="outline"
            data-testid="assignment-template-create-own"
            disabled={isSubmitting}
            onClick={onCreateOwn}
            className="border-neo-lime text-neo-lime hover:bg-neo-lime/20"
          >
            {t('teacher.assignment.galleryCreateOwn')}
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
        >
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

function FilterChip({
  testId,
  active,
  disabled,
  onClick,
  children,
}: {
  testId: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-neo border-2 px-3 py-1.5 font-neo-body text-xs font-bold uppercase',
        active
          ? 'border-neo-lime bg-neo-lime text-neo-black'
          : 'border-neo-cream/50 bg-neo-navy text-neo-white hover:bg-neo-navy/80',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      {children}
    </button>
  );
}

function bandKey(band: GradeBand): string {
  if (band === 'k-2') return 'K2';
  if (band === '3-5') return '35';
  return '68';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
