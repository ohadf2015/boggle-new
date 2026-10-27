'use client';

import React from 'react';
import { Eye, BookOpen } from 'lucide-react';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { CoinUnlockCard } from './CoinUnlockCard';
import type { Language } from '@/types';

export interface WordHuntAnswerRevealProps {
  targetWord: string;
  meaning?: string | null;
  language: Language;
  revealed: boolean;
  revealCost: number;
  currentCoins: number;
  onReveal: () => void;
  onSpendStart: (position: { x: number; y: number }, amount: number) => void;
  t: (key: string) => string;
}

/** Lost run: the answer (and meaning) on the results screen, behind a coin unlock. */
export function WordHuntAnswerReveal({
  targetWord, meaning, language, revealed, revealCost, currentCoins, onReveal, onSpendStart, t,
}: WordHuntAnswerRevealProps) {
  if (!revealed) {
    return (
      <div className="max-w-btn space-y-2">
        <CoinUnlockCard
          icon={<Eye className="w-5 h-5 text-neo-white" />}
          title={t('wordHunt.results.revealTargetWord')}
          subtitle={t('wordHunt.results.seeTheAnswer')}
          cost={revealCost}
          currentCoins={currentCoins}
          gradientFrom="from-neo-pink"
          gradientTo="to-neo-pink"
          onClick={onReveal}
          onSpendStart={(pos) => onSpendStart(pos, revealCost)}
          t={t}
        />
      </div>
    );
  }
  return (
    <div className="py-3 px-4 bg-neo-navy-light rounded-neo border-3 border-neo-black text-center space-y-2">
      <div className="text-xs text-neo-white/60">{t('wordHunt.results.theTargetWordWas')}</div>
      <div className="text-2xl font-black text-neo-lime tracking-wider">
        {language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord.toUpperCase()}
      </div>
      {meaning && (
        <div className="mt-2 flex items-start gap-2.5 rounded-neo border-3 border-neo-black bg-neo-cyan/15 px-3 py-2.5 shadow-hard text-start">
          <BookOpen className="w-4 h-4 text-neo-cyan shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-neo-cyan">{t('wordHunt.results.meaning')}</span>
            <span className="text-sm font-bold text-neo-cream leading-snug">{meaning}</span>
            {/* CC BY-SA attribution: meanings come from Wiktionary. */}
            <span className="text-[10px] text-neo-white/60 mt-0.5">{t('wordHunt.results.meaningSource')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default WordHuntAnswerReveal;
