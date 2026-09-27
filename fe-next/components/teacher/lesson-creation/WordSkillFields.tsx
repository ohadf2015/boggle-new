'use client';

/**
 * The two newer per-word fields in the lesson builder:
 *
 *   meanings   — 2+ senses, which unlock multiple-meaning practice
 *   morphology — prefix / root / root meaning / suffix, which unlock roots & affixes
 *
 * Split out of WordListEditor to keep that file under the 500-line cap. Purely
 * presentational: every change is handed straight back to the parent.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { VocabularyWord, WordMorphology } from '@/lib/supabase/education/types';

/** Word parts a teacher can fill in, in the order they read on the card. */
export const MORPHEME_FIELDS: readonly (keyof WordMorphology)[] = ['prefix', 'root', 'rootMeaning', 'suffix'];

// A sense is a phrase and routinely contains a comma, so meanings split on
// semicolons only — same rule as the bulk importer's `mean:` key.
export const parseSenses = (value: string): string[] =>
  value.split(/[;；]/).map((s) => s.trim()).filter((s) => s.length > 0);

export const joinSenses = (list: string[] | undefined): string => (list && list.length ? list.join('; ') : '');

export interface WordSkillFieldsProps {
  index: number;
  word: VocabularyWord;
  /** Local draft for the meanings input, so typing a `;` never fights the parse. */
  meaningsDraft?: string;
  onMeaningsChange: (index: number, value: string) => void;
  onMeaningsBlur: (index: number) => void;
  onMorphologyChange: (index: number, field: keyof WordMorphology, value: string) => void;
  /** Marks a field the AI just filled, so the teacher reviews it before saving. */
  isAiFilled: (field: 'meanings' | 'morphology') => boolean;
  aiHighlightClass: string;
}

export default function WordSkillFields({
  index,
  word,
  meaningsDraft,
  onMeaningsChange,
  onMeaningsBlur,
  onMorphologyChange,
  isAiFilled,
  aiHighlightClass,
}: WordSkillFieldsProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Multiple meanings — 2+ senses unlock the multiple-meaning drill */}
      <label className="block">
        <span className="text-xs text-neo-white/80 font-neo-body">{t('teacher.wordDetails.meanings')}</span>
        <Input
          value={meaningsDraft ?? joinSenses(word.meanings)}
          onChange={(e) => onMeaningsChange(index, e.target.value)}
          onBlur={() => onMeaningsBlur(index)}
          placeholder={t('teacher.wordDetails.meaningsPlaceholder')}
          data-testid={`word-meanings-${index}`}
          data-ai-filled={isAiFilled('meanings') ? 'true' : undefined}
          className={cn(
            'mt-1 text-xs h-9 border-neo-black/50 bg-neo-black/20',
            isAiFilled('meanings') && aiHighlightClass
          )}
        />
        <span className="block mt-1 text-[11px] text-neo-white/60 font-neo-body">
          {t('teacher.wordDetails.meaningsHelp')}
        </span>
      </label>

      {/* Word parts — root / prefix / suffix drive the roots & affixes drill */}
      <fieldset className="border-0 p-0 m-0">
        <legend className="text-xs text-neo-white/80 font-neo-body">{t('teacher.wordDetails.morphology')}</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
          {MORPHEME_FIELDS.map((field) => (
            <label key={field} className="block">
              <span className="text-[11px] text-neo-white/70 font-neo-body">
                {t(`teacher.wordDetails.${field}`)}
              </span>
              <Input
                value={word.morphology?.[field] ?? ''}
                onChange={(e) => onMorphologyChange(index, field, e.target.value)}
                placeholder={t(`teacher.wordDetails.${field}Placeholder`)}
                data-testid={`word-${field}-${index}`}
                data-ai-filled={isAiFilled('morphology') ? 'true' : undefined}
                className={cn(
                  'mt-1 text-xs h-9 border-neo-black/50 bg-neo-black/20',
                  isAiFilled('morphology') && aiHighlightClass
                )}
              />
            </label>
          ))}
        </div>
        <span className="block mt-1 text-[11px] text-neo-white/60 font-neo-body">
          {t('teacher.wordDetails.morphologyHelp')}
        </span>
      </fieldset>
    </>
  );
}
