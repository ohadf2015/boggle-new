'use client';

import { Zap, Target, Sparkles, Flame, Gem, BookOpen, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastPlayerStats } from '@/shared/types/game';

interface BlastResultsSummaryProps {
  movesUsed: number;
  tilesCleared: number;
  tileBonus: number;
  playerStats?: Record<string, BlastPlayerStats>;
}

function StatCell({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-xl font-bold text-neo-white">{value}</span>
      <span className="text-xs text-neo-cream/70">{label}</span>
    </div>
  );
}

export default function BlastResultsSummary({ movesUsed, tilesCleared, tileBonus, playerStats }: BlastResultsSummaryProps) {
  const { t } = useLanguage();

  const entries = playerStats ? Object.entries(playerStats) : [];
  const hasRichStats = entries.length > 0;

  return (
    <div className="space-y-2">
      {/* Basic stats grid (always shown) */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
        <StatCell icon={<Zap className="w-5 h-5 text-neo-yellow" />} value={movesUsed} label={t('blast.multiplayer.moves')} />
        <StatCell icon={<Target className="w-5 h-5 text-neo-orange" />} value={tilesCleared} label={t('blast.multiplayer.tilesCleared')} />
        <StatCell icon={<Sparkles className="w-5 h-5 text-neo-cyan" />} value={`+${tileBonus}`} label={t('blast.multiplayer.tileBonus')} />
      </div>

      {/* Rich per-player stats cards */}
      {hasRichStats && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neo-cream/60 px-1">
            {t('blast.multiplayer.playerStats')}
          </h4>
          {entries.map(([username, stats]) => (
            <div
              key={username}
              className="p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm"
            >
              <div className="font-bold text-neo-white text-sm mb-2">{username}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatCell
                  icon={<Flame className="w-4 h-4 text-neo-orange" />}
                  value={stats.maxCombo}
                  label={t('blast.multiplayer.maxCombo')}
                />
                <StatCell
                  icon={<Gem className="w-4 h-4 text-neo-cyan" />}
                  value={stats.gemsCollected}
                  label={t('blast.multiplayer.gems')}
                />
                <StatCell
                  icon={<BookOpen className="w-4 h-4 text-neo-lime" />}
                  value={stats.wordsFound.length}
                  label={t('blast.multiplayer.wordsFoundCount')}
                />
              </div>
              {stats.bestWord && (
                <div className="mt-2 flex items-center gap-1.5 justify-center">
                  <Trophy className="w-3.5 h-3.5 text-neo-yellow" />
                  <span className="text-xs text-neo-cream/70">{t('blast.multiplayer.bestWord')}:</span>
                  <span className="font-bold text-neo-white text-sm uppercase">{stats.bestWord}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
