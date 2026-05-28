'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgressionActions, useProgressionData } from '@/contexts/ProgressionContext';
import { useUpgradeEffects } from '@/hooks/useUpgradeEffects';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { fastValidateWord } from '@/hooks/fastValidateWord';
import { showAchievementToast } from '@/components/achievements/AchievementToast';
import { ADVENTURE_ACHIEVEMENTS } from '@/utils/adventureAchievementUtils';
import type { LevelConfig } from '@/types/adventure';
import type { Language } from '@/types';
import WordWheelGame, { type WordWheelGameResult } from '@/components/daily/WordWheelGame';
import { WordWheelEffectsCanvas, type WordWheelEffect } from '@/components/daily/WordWheelEffectsCanvas';
import { generateWordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { cn } from '@/lib/utils';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number, longWords?: number, wordList?: string[], timePlayed?: number) => void;
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
  const totalTime = (levelConfig.timerSeconds || 120) + upgradeEffects.bonusTimeSeconds;
  const [paused, setPaused] = useState(false);
  useAdventureMusic({
    worldNumber: levelConfig.world,
    isPlaying: true,
    isPaused: paused,
    timeRemaining: totalTime,
    totalTime,
    enabled: true,
    isBossLevel: false,
  });

  const { earnAchievement, getCount } = useAdventureAchievements();
  const handleEarnAchievement = useCallback((id: keyof typeof ADVENTURE_ACHIEVEMENTS) => {
    const isNew = earnAchievement(id);
    if (isNew) {
      const count = getCount(id) + 1;
      showAchievementToast({ achievement: ADVENTURE_ACHIEVEMENTS[id], count, isNew: count === 1 });
    }
    return isNew;
  }, [earnAchievement, getCount]);
  const [effects, setEffects] = useState<WordWheelEffect[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 600 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaused(p => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const handleValidateWord = useCallback(
    (word: string) => fastValidateWord(word, language as Language),
    [language]
  );

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
    const timePlayed = Math.max(0, Math.floor(result.timeSeconds));
    if (stars > 0) {
      void completeLevel(
        levelConfig.world, levelConfig.level,
        stars, result.score, result.wordsFound.length,
        gold, longWords, result.wordsFound,
        undefined, timePlayed
      );
      chapterQuests.recordWordsFound(result.wordsFound.length);
      chapterQuests.recordScoreChallenge(result.score);
      if (stars >= 3) chapterQuests.recordLevelPerfect();
      for (let i = 0; i < longWords; i++) chapterQuests.recordLongWord();

      if (result.wordsFound.length > 0) handleEarnAchievement('FIRST_WORD');
      if (result.wordsFound.some(w => w.length >= 6)) handleEarnAchievement('LONG_WORD_6');
      if (result.wordsFound.some(w => w.length >= 8)) handleEarnAchievement('LONG_WORD_8');
      if (stars >= 3) handleEarnAchievement('PERFECT_LEVEL');
      const newTotalStars = (progression?.totalStars ?? 0) + stars;
      if (newTotalStars >= 50) handleEarnAchievement('STAR_COLLECTOR_50');
      if (newTotalStars >= 100) handleEarnAchievement('STAR_COLLECTOR_100');
    }
    onLevelComplete(stars, result.score, result.wordsFound.length, gold, longWords, result.wordsFound, Math.max(0, Math.floor(result.timeSeconds)));
  }, [scoreTarget, onLevelComplete, completeLevel, levelConfig.world, levelConfig.level,
      upgradeEffects.goldMultiplier, upgradeEffects.longWordGoldBonus, chapterQuests,
      handleEarnAchievement, progression?.totalStars]);

  return (
    <div
      className="relative h-full w-full bg-neo-navy flex flex-col"
      style={{
        // Reserve space for the AdMob native banner so gameplay content (sticky
        // action buttons, found-words list) is never covered by the ad.
        paddingBottom: 'var(--admob-banner-height, 0px)',
      }}
    >
      {/* Minimal adventure chrome: exit button overlay */}
      <button
        onClick={onExit}
        aria-label={t('common.exit')}
        className={cn(
          'absolute top-2 start-2 z-20 p-2 rounded-neo',
          'bg-neo-white/8 text-neo-white hover:bg-neo-red/20 hover:text-neo-red',
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
          paused={paused}
        />
        {paused && (
          <div
            className="absolute inset-0 z-30 bg-neo-navy/85 flex flex-col items-center justify-center gap-4"
            onClick={() => setPaused(false)}
          >
            <div className="text-neo-white font-neo-display text-3xl">{t('common.pause')}</div>
            <div className="text-neo-white text-sm">{t('common.toResume')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdventureWheelGame;
