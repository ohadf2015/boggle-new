'use client';

import { Heart, Clock, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WordHuntResultsSummaryProps {
  targetWord: string;
  foundTarget: boolean;
  isFirstFinder: boolean;
  survivalTime: number;
  discoveryWords: number;
}

export default function WordHuntResultsSummary({
  targetWord,
  foundTarget,
  isFirstFinder,
  survivalTime,
  discoveryWords,
}: WordHuntResultsSummaryProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      {/* Target word reveal */}
      <div className="flex items-center justify-between p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-neo-yellow" />
          <span className="text-sm text-neo-cream/70">{t('wordHunt.multiplayer.targetWord')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-neo-white tracking-wider">{targetWord}</span>
          {foundTarget ? (
            isFirstFinder ? (
              <span className="px-2 py-0.5 text-xs font-bold bg-neo-yellow text-neo-black rounded-neo">
                {t('wordHunt.multiplayer.firstFinder')}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-neo-black rounded-neo">
                {t('wordHunt.multiplayer.found')}
              </span>
            )
          ) : (
            <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-neo-white rounded-neo">
              {t('wordHunt.multiplayer.notFound')}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
          <Clock className="w-5 h-5 text-neo-orange" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-neo-white">{survivalTime}s</span>
            <span className="text-xs text-neo-cream/70">{t('wordHunt.multiplayer.survivalTime')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
          <Heart className="w-5 h-5 text-neo-pink" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-neo-white">{discoveryWords}</span>
            <span className="text-xs text-neo-cream/70">{t('wordHunt.multiplayer.discoveryWords')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
