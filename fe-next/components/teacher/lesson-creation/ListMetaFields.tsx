'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { EDUCATION_LANGUAGES, type Language } from '@/lib/supabase/education/types';
import { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';
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
    <div className={classrooms.length > 0 ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'grid grid-cols-3 gap-2'}>
      <label className="block min-w-0">
        <span className={LABEL}>{t('eduLibrary.meta.language')}</span>
        <select
          data-testid="list-language"
          value={draft.language}
          onChange={(e) => onChange({ language: e.target.value as Language })}
          className={SELECT}
        >
          {EDUCATION_LANGUAGES.map((code) => (
            <option key={code} value={code}>{t(LANGUAGE_LABEL_KEYS[code])}</option>
          ))}
        </select>
      </label>
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
            <option value="">{t('eduLibrary.meta.noClass')}</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
