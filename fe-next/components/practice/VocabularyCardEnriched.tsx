'use client';

import { EnrichedVocabularyWord } from '@/types/vocabulary';
import { PronunciationButton } from './PronunciationButton';
import { useLanguage } from '@/contexts/LanguageContext';

interface VocabularyCardEnrichedProps {
  /** Enriched vocabulary word data */
  word: EnrichedVocabularyWord;
  /** Language code for pronunciation (e.g., 'en-US') */
  lang?: string;
  /** Compact mode (reduced content) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Enriched vocabulary card with pronunciation, definition, and examples
 *
 * Neo-Brutalist design with:
 * - Hard shadows (shadow-hard)
 * - Chunky borders (border-neo)
 * - Bold colors from palette
 */
export function VocabularyCardEnriched({
  word,
  lang = 'en-US',
  compact = false,
  className = '',
}: VocabularyCardEnrichedProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`
        bg-neo-white
        border-neo border-black
        rounded-neo
        shadow-hard
        p-6
        ${className}
      `}
    >
      {/* Header: Word + Pronunciation Button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-neo-display font-bold text-neo-navy mb-1">
            {word.word}
          </h3>
          {word.partOfSpeech && (
            <p className="text-sm text-neo-navy/60 font-neo-body italic">
              {word.partOfSpeech}
            </p>
          )}
        </div>
        <PronunciationButton
          word={word.word}
          lang={lang}
          ipaPronunciation={word.pronunciation}
          size="md"
        />
      </div>

      {/* Definition */}
      <div className="mb-4">
        <h4 className="text-sm font-neo-display font-bold text-neo-navy uppercase mb-2">
          {t('education.lesson.definition')}
        </h4>
        <p className="text-base font-neo-body text-neo-navy leading-relaxed">
          {word.definition || t('education.practice.noDefinition')}
        </p>
      </div>

      {/* Usage Examples */}
      {!compact && word.examples.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-neo-display font-bold text-neo-navy uppercase mb-2">
            {t('education.lesson.examples')}
          </h4>
          <ul className="space-y-2">
            {word.examples.map((example, index) => (
              <li key={`ex-${index}-${example.text}`} className="flex gap-2">
                <span className="text-neo-pink font-bold select-none" aria-hidden="true">
                  &bull;
                </span>
                <div className="flex-1">
                  <p className="text-base font-neo-body text-neo-navy italic">
                    &ldquo;{example.text}&rdquo;
                  </p>
                  {example.translation && (
                    <p className="text-sm font-neo-body text-neo-navy/60 mt-1">
                      {example.translation}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contextual Examples (themed content) */}
      {!compact && word.contextualExamples && word.contextualExamples.length > 0 && (
        <div>
          <h4 className="text-sm font-neo-display font-bold text-neo-navy uppercase mb-2">
            {t('education.lesson.contextualExamples')}
          </h4>
          <div
            className="
              bg-neo-yellow/10
              border-neo border-neo-yellow
              rounded-neo
              p-4
            "
          >
            <ul className="space-y-2">
              {word.contextualExamples.map((example, index) => (
                <li key={`ctx-ex-${index}-${example.text}`} className="flex gap-2">
                  <span className="text-neo-orange font-bold select-none" aria-hidden="true">
                    &bull;
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-neo-body text-neo-navy italic">
                      &ldquo;{example.text}&rdquo;
                    </p>
                    {example.translation && (
                      <p className="text-sm font-neo-body text-neo-navy/60 mt-1">
                        {example.translation}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Compact mode: Show only first example */}
      {compact && word.examples.length > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-black">
          <p className="text-sm font-neo-body text-neo-navy italic">
            &ldquo;{word.examples[0].text}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
