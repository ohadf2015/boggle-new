'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { BookOpen, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PostGameWordReviewProps {
  vocabularyWords: string[];
  wordsFound: string[];
  lessonId: string;
  onPractice: () => void;
}

export default function PostGameWordReview({
  vocabularyWords,
  wordsFound,
  lessonId,
  onPractice,
}: PostGameWordReviewProps) {
  const { t } = useLanguage();

  const foundSet = useMemo(() => {
    const lower = new Set(wordsFound.map((w) => w.toLowerCase()));
    return lower;
  }, [wordsFound]);

  const { found, missed } = useMemo(() => {
    const f: string[] = [];
    const m: string[] = [];
    for (const word of vocabularyWords) {
      if (foundSet.has(word.toLowerCase())) {
        f.push(word);
      } else {
        m.push(word);
      }
    }
    return { found: f, missed: m };
  }, [vocabularyWords, foundSet]);

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
      className="bg-neo-navy border-neo shadow-hard-lg rounded-neo p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-neo-lime" />
        <h3 className="text-lg font-bold text-neo-lime font-neo-display">
          {t('education.postGame.wordsYouLearned')}
        </h3>
      </div>

      {/* Score */}
      <p className="text-sm text-neo-white">
        {t('education.postGame.vocabScore', {
          found: found.length,
          total: vocabularyWords.length,
        })}
      </p>

      {/* Found words */}
      {found.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neo-lime/70">
            {t('education.postGame.found')}
          </span>
          <div className="flex flex-wrap gap-2">
            {found.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-neo bg-neo-lime/15 border border-neo-lime/30 text-neo-white font-bold text-sm"
              >
                <Check className="w-3 h-3 text-neo-lime" />
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missed words */}
      {missed.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neo-white">
            {t('education.postGame.wordsToLearn')}
          </span>
          <p className="text-xs text-neo-white">
            {t('education.postGame.studyTheseNext')}
          </p>
          <div className="flex flex-wrap gap-2">
            {missed.map((word) => (
              <span
                key={word}
                className="inline-flex items-center px-2 py-1 rounded-neo bg-neo-white/5 border border-neo-white/10 text-neo-white text-sm"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Practice button */}
      <m.button
        whileTap={{ scale: 0.97 }}
        onClick={onPractice}
        className="w-full py-2.5 px-4 bg-neo-lime text-black font-bold rounded-neo border-neo shadow-hard text-sm active:shadow-hard-pressed active:translate-y-[2px] transition-all"
      >
        {t('education.postGame.practiceTheseWords')}
      </m.button>
    </m.div>
  );
}
