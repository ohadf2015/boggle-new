'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/lib/supabase/education/types';
import { LanguagePicker } from '@/components/education/pickers/LanguagePicker';
import { GRADE_BANDS, LIBRARY_TOPICS, isGradeBand, isLibraryTopic } from '@/lib/education/library';
import type { ListDraft } from './ListEditorSheet';

const SELECT =
  'h-11 w-full min-w-0 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-2 font-neo-body text-sm font-bold text-neo-white shadow-hard-sm focus:outline-hidden focus:ring-2 focus:ring-neo-cyan';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-neo-white/70';

interface ListMetaFieldsProps {
  draft: ListDraft;
  /** Empty = hide the class picker (editing an existing list). */
  classrooms: { id: string; name: string }[];
  onChange: (patch: Partial<ListDraft>) => void;
}

export default function ListMetaFields({ draft, classrooms, onChange }: ListMetaFieldsProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <LanguagePicker
        testId="list-language"
        label={<span className={LABEL}>{t('eduLibrary.meta.language')}</span>}
        value={draft.language}
        onChange={(language: Language) => onChange({ language })}
        variant="compact"
      />
      <div className={classrooms.length > 0 ? 'grid grid-cols-1 gap-2 sm:grid-cols-3' : 'grid grid-cols-2 gap-2'}>
      <label className="block min-w-0">
        <span className={LABEL}>{t('eduLibrary.meta.grade')}</span>
        <select
          data-testid="list-grade"
          value={draft.gradeBand ?? ''}
          onChange={(e) => onChange({ gradeBand: isGradeBand(e.target.value) ? e.target.value : null })}
          className={SELECT}
        >
          <option value="">{t('eduLibrary.grade.any')}</option>
          {GRADE_BANDS.map((g) => (
            <option key={g} value={g}>{t(`eduLibrary.grade.${g}`)}</option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className={LABEL}>{t('eduLibrary.meta.topic')}</span>
        <select
          data-testid="list-topic"
          value={draft.topic ?? ''}
          onChange={(e) => onChange({ topic: isLibraryTopic(e.target.value) ? e.target.value : null })}
          className={SELECT}
        >
          <option value="">{t('eduLibrary.topic.none')}</option>
          {LIBRARY_TOPICS.map((topic) => (
            <option key={topic} value={topic}>{t(`eduLibrary.topic.${topic}`)}</option>
          ))}
        </select>
      </label>
      {classrooms.length > 0 && (
        <label className="block min-w-0">
          <span className={LABEL}>{t('eduLibrary.meta.assignTo')}</span>
          <select
            data-testid="list-classroom"
            value={draft.classroomId}
            onChange={(e) => onChange({ classroomId: e.target.value })}
            className={SELECT}
          >
            <option value="">{t('eg2Polish.library.notAssigned')}</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      </div>
    </div>
  );
}
