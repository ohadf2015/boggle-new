'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Grid2x2 } from 'lucide-react';
import {
  ASSIGNMENT_TEMPLATE_GRADE_BANDS,
  ASSIGNMENT_TEMPLATE_SUBJECTS,
  type AssignmentTemplate,
  type AssignmentTemplateGradeBand,
  type AssignmentTemplateSubject,
} from '@/lib/education/assignmentTemplates';

interface AssignmentTemplateGalleryProps {
  templates: AssignmentTemplate[];
  classroomName?: string;
  isSubmitting: boolean;
  onAssign: (template: AssignmentTemplate) => void;
  onBack: () => void;
}

function FilterChip({
  active,
  disabled,
  label,
  onClick,
  testId,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'min-h-9 rounded-neo border-2 px-3 py-1 font-neo-body text-xs font-bold transition-all',
        active
          ? 'border-neo-lime bg-neo-lime text-neo-black shadow-hard-sm'
          : 'border-neo-cream/40 bg-neo-navy/50 text-neo-white hover:bg-neo-navy/80',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {label}
    </button>
  );
}

/**
 * Browse pre-made word-list assignments by grade band and subject, preview a
 * template's words, and assign with one click. Filter state resets when the
 * dialog reopens (the parent remounts it per open).
 */
export function AssignmentTemplateGallery({
  templates,
  classroomName,
  isSubmitting,
  onAssign,
  onBack,
}: AssignmentTemplateGalleryProps) {
  const { t } = useLanguage();
  const [band, setBand] = useState<AssignmentTemplateGradeBand | 'all'>('all');
  const [subject, setSubject] = useState<AssignmentTemplateSubject | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      templates.filter(
        (tpl) =>
          (band === 'all' || tpl.gradeBand === band) &&
          (subject === 'all' || tpl.subject === subject),
      ),
    [templates, band, subject],
  );

  const selected = visible.find((tpl) => tpl.id === selectedId) ?? null;

  return (
    <div data-testid="assignment-template-gallery" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-neo-body text-sm font-bold text-neo-white">
            {t('teacher.assignment.templateGallery.title')}
          </p>
          <p className="font-neo-body text-xs text-neo-white/70 text-pretty">
            {t('teacher.assignment.templateGallery.hint')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          data-testid="template-gallery-back"
          className="shrink-0 border-neo-cream/60 text-neo-white hover:bg-neo-navy-light"
        >
          <ArrowLeft className="me-1 h-4 w-4" aria-hidden="true" />
          {t('teacher.assignment.templateGallery.back')}
        </Button>
      </div>

      <div className="space-y-2" data-testid="template-gallery-filters">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('teacher.assignment.templateGallery.bandLabel')}>
          <FilterChip
            testId="template-gallery-band-all"
            active={band === 'all'}
            label={t('teacher.assignment.templateGallery.allBands')}
            onClick={() => { setBand('all'); setSelectedId(null); }}
          />
          {ASSIGNMENT_TEMPLATE_GRADE_BANDS.map((b) => (
            <FilterChip
              key={b}
              testId={`template-gallery-band-${b}`}
              active={band === b}
              label={t(`teacher.assignment.templateGallery.band.${b}`)}
              onClick={() => { setBand(b); setSelectedId(null); }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('teacher.assignment.templateGallery.subjectLabel')}>
          <FilterChip
            testId="template-gallery-subject-all"
            active={subject === 'all'}
            label={t('teacher.assignment.templateGallery.allSubjects')}
            onClick={() => { setSubject('all'); setSelectedId(null); }}
          />
          {ASSIGNMENT_TEMPLATE_SUBJECTS.map((s) => (
            <FilterChip
              key={s}
              testId={`template-gallery-subject-${s}`}
              active={subject === s}
              label={t(`teacher.assignment.templateGallery.subject.${s}`)}
              onClick={() => { setSubject(s); setSelectedId(null); }}
            />
          ))}
        </div>
      </div>

      {selected ? (
        <div
          data-testid="template-gallery-preview"
          className="rounded-neo border-3 border-neo-cream bg-neo-navy-light p-4"
        >
          <p className="font-neo-display text-sm font-black uppercase text-neo-white">
            {t(selected.nameKey)}
          </p>
          <p className="mt-1 font-neo-body text-xs text-neo-white/70 text-pretty">
            {t(selected.descriptionKey)}
          </p>
          <ul className="mt-3 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2" data-testid="template-gallery-preview-words">
            {selected.words.map((word) => (
              <li
                key={word.word}
                className="rounded-neo bg-neo-navy px-2 py-1 font-neo-body text-xs text-neo-white"
              >
                <span dir="auto" className="font-bold">{word.word}</span>
                {word.definition && (
                  <span className="text-neo-cream/70"> — {word.definition}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-neo-body text-xs font-bold text-neo-cyan">
              {selected.words.length} {t('teacher.assignment.words')} ·{' '}
              {t('teacher.assignment.templateGallery.dueInWeek')}
            </p>
            <Button
              onClick={() => onAssign(selected)}
              disabled={isSubmitting}
              data-testid="template-gallery-assign"
              className="bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-pressed disabled:opacity-50"
            >
              <Check className="me-1 h-4 w-4" aria-hidden="true" />
              {classroomName
                ? t('teacher.assignment.templateGallery.assignTo', { classroom: classroomName })
                : t('teacher.assignment.templateGallery.assign')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="template-gallery-grid">
          {visible.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              data-testid={`assignment-template-${tpl.id}`}
              disabled={isSubmitting}
              onClick={() => setSelectedId(tpl.id)}
              className={cn(
                'min-h-11 rounded-neo border-3 border-neo-cream bg-neo-navy-light p-4 text-start',
                'hover:-translate-y-0.5 hover:shadow-hard-sm',
                'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <span className="flex items-center gap-1.5">
                <Grid2x2 className="h-4 w-4 shrink-0 text-neo-cyan" aria-hidden="true" />
                <span className="block font-neo-display text-sm font-black uppercase text-neo-white">
                  {t(tpl.nameKey)}
                </span>
              </span>
              <span className="mt-1 block font-neo-body text-xs text-neo-white/70 text-pretty">
                {t(tpl.descriptionKey)}
              </span>
              <span className="mt-2 block font-neo-body text-xs font-bold text-neo-cyan">
                {t(`teacher.assignment.templateGallery.band.${tpl.gradeBand}`)} ·{' '}
                {t(`teacher.assignment.templateGallery.subject.${tpl.subject}`)} · {tpl.words.length}{' '}
                {t('teacher.assignment.words')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
