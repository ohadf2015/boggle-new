'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgressionActions, useProgressionData } from '@/contexts/ProgressionContext';
import { useUpgradeEffects } from '@/hooks/useUpgradeEffects';
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
import type { LevelConfig } from '@/types/adventure';
import type { Language } from '@/types';
import WordWheelGame, { type WordWheelGameResult } from '@/components/daily/WordWheelGame';
import { WordWheelEffectsCanvas, type WordWheelEffect } from '@/components/daily/WordWheelEffectsCanvas';
import { generateWordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { cn } from '@/lib/utils';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number, longWords?: number, wordList?: string[]) => void;
  onExit: () => void;
}

// Stars from score relative to level's scoreTarget objective (fallback 200)
function computeStars(score: number, target: number): 0 | 1 | 2 | 3 {
  if (score >= target) return 3;
  if (score >= target * 0.66) return 2;
  if (score >= target * 0.33) return 1;
  return 0;
}

const AdventureWheelGame: React.FC<Props> = ({ levelConfig, onLevelComplete, onExit }) => {
  const { t, language } = useLanguageSafe();
  const { completeLevel } = useProgressionActions();
  const { progression } = useProgressionData();
  const upgradeEffects = useUpgradeEffects(progression?.upgrades ?? {});
  const chapterQuests = useChapterQuests({
    worldId: levelConfig.world,
    chapterNumber: getChapterNumber(levelConfig.level),
  });
  const [effects, setEffects] = useState<WordWheelEffect[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 600 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setSize({ width: Math.floor(r.width), height: Math.floor(r.height) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Deterministic per-level puzzle seeded by world/level
  const puzzle = useMemo(
    () => generateWordWheelPuzzle(`adventure-W${levelConfig.world}L${levelConfig.level}`, language as Language),
    [levelConfig.world, levelConfig.level, language]
  );

  const scoreTarget = useMemo(() => {
    const obj = levelConfig.objectives?.find(o => o.type === 'scoreTarget');
    return obj?.target ?? 200;
  }, [levelConfig.objectives]);

  const handleValidateWord = useCallback(async (word: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/validate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, language }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.isValid === true;
    } catch {
      return word.length >= 3;
    }
  }, [language]);

  const handleEffect = useCallback((effect: WordWheelEffect) => {
    setEffects(prev => [...prev, effect]);
  }, []);

  const handleComplete = useCallback((result: WordWheelGameResult) => {
    const stars = computeStars(result.score, scoreTarget);
    const longWords = result.wordsFound.filter(w => w.length >= 6).length;
    const baseGold = Math.floor(result.score / 10) + stars * 5;
    const longWordBonus = upgradeEffects.longWordGoldBonus * longWords;
    const gold = Math.floor(baseGold * upgradeEffects.goldMultiplier) + longWordBonus;
    // Persist to DB via ProgressionContext — server is source of truth for
    // gold/XP/unlocks. Fire-and-forget; UI advances via onLevelComplete.
    if (stars > 0) {
      void completeLevel(
        levelConfig.world, levelConfig.level,
        stars, result.score, result.wordsFound.length,
        gold, longWords, result.wordsFound
      );
      chapterQuests.recordWordsFound(result.wordsFound.length);
      chapterQuests.recordScoreChallenge(result.score);
      if (stars >= 3) chapterQuests.recordLevelPerfect();
      for (let i = 0; i < longWords; i++) chapterQuests.recordLongWord();
    }
    onLevelComplete(stars, result.score, result.wordsFound.length, gold, longWords, result.wordsFound);
  }, [scoreTarget, onLevelComplete, completeLevel, levelConfig.world, levelConfig.level,
      upgradeEffects.goldMultiplier, upgradeEffects.longWordGoldBonus, chapterQuests]);

  return (
    <div className="relative h-full w-full bg-neo-navy flex flex-col">
      {/* Minimal adventure chrome: exit button overlay */}
      <button
        onClick={onExit}
        aria-label={t('common.exit')}
        className={cn(
          'absolute top-2 start-2 z-20 p-2 rounded-neo',
          'bg-neo-white/8 text-neo-white/70 hover:bg-neo-red/20 hover:text-neo-red',
          'transition-colors duration-200'
        )}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Level badge */}
      <div className="absolute top-2 end-2 z-20 px-3 py-1 rounded-neo bg-neo-purple/20 border-2 border-neo-purple/40">
        <span className="text-[11px] font-mono font-bold text-neo-white tabular-nums">
          W{levelConfig.world}·L{levelConfig.level}
        </span>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <WordWheelEffectsCanvas
          width={size.width}
          height={size.height}
          effects={effects}
          onEffectsConsumed={() => setEffects([])}
        />
        <WordWheelGame
          puzzle={puzzle}
          duration={(levelConfig.timerSeconds || 120) + upgradeEffects.bonusTimeSeconds}
          onComplete={handleComplete}
          onValidateWord={handleValidateWord}
          onEffect={handleEffect}
          language={language}
        />
      </div>
    </div>
  );
};

export default AdventureWheelGame;
