'use client';

import { Zap, Target, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BlastResultsSummaryProps {
  movesUsed: number;
  tilesCleared: number;
  tileBonus: number;
}

export default function BlastResultsSummary({ movesUsed, tilesCleared, tileBonus }: BlastResultsSummaryProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-3 gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
      <div className="flex flex-col items-center gap-1">
        <Zap className="w-5 h-5 text-neo-yellow" />
        <span className="text-xl font-bold text-neo-white">{movesUsed}</span>
        <span className="text-xs text-neo-cream/70">{t('blast.multiplayer.moves')}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Target className="w-5 h-5 text-neo-orange" />
        <span className="text-xl font-bold text-neo-white">{tilesCleared}</span>
        <span className="text-xs text-neo-cream/70">{t('blast.multiplayer.tilesCleared')}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Sparkles className="w-5 h-5 text-neo-cyan" />
        <span className="text-xl font-bold text-neo-white">+{tileBonus}</span>
        <span className="text-xs text-neo-cream/70">{t('blast.multiplayer.tileBonus')}</span>
      </div>
    </div>
  );
}
