'use client';

import React from 'react';

export function HuntHintSlots({
  showCategory,
  category,
  showExample,
  exampleSentence,
  targetWord,
  t,
}: {
  showCategory: boolean;
  category: string;
  showExample: boolean;
  exampleSentence: string;
  targetWord: string;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="min-h-[22px] mb-0.5" data-testid="wordhunt-category-slot">
        {showCategory && (
          <div className="text-[11px] bg-neo-purple/15 border border-neo-purple/50 rounded px-2 py-0.5 max-w-3xl mx-auto w-full text-neo-white/90">
            <span className="font-bold">{t('wordHunt.survival.category')?.replace('{category}', category) || category}</span>
          </div>
        )}
      </div>
      <div className="min-h-[22px] mb-0.5" data-testid="wordhunt-example-slot">
        {showExample && (
          <div className="text-[11px] bg-neo-lime/15 border border-neo-lime/50 rounded px-2 py-0.5 max-w-3xl mx-auto w-full text-neo-white/90">
            <span className="font-bold">{t('wordHunt.survival.exampleSentence')}</span>{' '}
            {exampleSentence.replace(new RegExp(targetWord, 'gi'), '____')}
          </div>
        )}
      </div>
    </>
  );
}
