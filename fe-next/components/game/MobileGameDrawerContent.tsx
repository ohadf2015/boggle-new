/**
 * MobileGameDrawerContent
 * Game-mode-aware stats panel for the mobile bottom drawer.
 * Computes live stats from foundWords, score, combo, and timer data.
 * Adapts content based on game mode (classic/blast/word-hunt).
 */

'use client';

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { Flame, Zap, Trophy, BookOpen, Target, Swords, Timer, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoundWord } from '@/shared/types/view';
import type { GameModeSelection } from '@/shared/types/game';

interface MobileGameDrawerContentProps {
  foundWords: FoundWord[];
  comboLevel: number;
  fireRoundActive: boolean;
  gameMode?: GameModeSelection;
  remainingTime: number | null;
  timerValue: number; // total game time in minutes
  totalBoardWords: number | null;
  // Word Hunt specifics
  wordHuntLife?: number;
  wordHuntAttempts?: Array<{ guess: string; feedback: unknown[] }>;
  t: (key: string) => string;
}

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: string;
}

export function MobileGameDrawerContent({
  foundWords,
  comboLevel,
  fireRoundActive,
  gameMode,
  remainingTime,
  timerValue,
  totalBoardWords,
  wordHuntLife,
  wordHuntAttempts,
  t,
}: MobileGameDrawerContentProps) {
  const stats = useMemo(() => {
    const validWords = foundWords.filter(w => w.isValid !== false);
    const wordCount = validWords.length;
    const scores = validWords.map(w => w.score ?? 0).filter(s => s > 0);

    // Longest word
    const longest = validWords.reduce<string>(
      (best, w) => (w.word.length > best.length ? w.word : best),
      ''
    );

    // Best scoring word
    const bestIdx = scores.indexOf(Math.max(...scores, 0));
    const bestWord = bestIdx >= 0 ? validWords[bestIdx] : null;

    // Average score per word
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Words per minute (from elapsed time)
    const totalSeconds = timerValue * 60;
    const elapsed = remainingTime !== null ? totalSeconds - remainingTime : 0;
    const elapsedMinutes = elapsed / 60;
    const wpm = elapsedMinutes > 0.1 ? Math.round(wordCount / elapsedMinutes * 10) / 10 : 0;

    // Word length distribution
    const shortWords = validWords.filter(w => w.word.length <= 4).length;
    const mediumWords = validWords.filter(w => w.word.length >= 5 && w.word.length <= 6).length;
    const longWords = validWords.filter(w => w.word.length >= 7).length;

    // Board coverage (single player)
    const coverage = totalBoardWords && totalBoardWords > 0
      ? Math.round((validWords.filter(w => w.word.length >= 5).length / totalBoardWords) * 100)
      : null;

    return { wordCount, longest, bestWord, avgScore, wpm, shortWords, mediumWords, longWords, coverage };
  }, [foundWords, remainingTime, timerValue, totalBoardWords]);

  // Build stats grid based on game mode
  const statItems = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [];

    // Universal stats
    items.push({
      icon: <BookOpen className="w-3.5 h-3.5" />,
      label: t('results.words'),
      value: stats.wordCount,
    });

    if (stats.longest) {
      items.push({
        icon: <Trophy className="w-3.5 h-3.5" />,
        label: t('results.longest'),
        value: stats.longest.toUpperCase(),
        highlight: stats.longest.length >= 7,
        color: stats.longest.length >= 7 ? 'text-neo-lime' : undefined,
      });
    }

    if (stats.bestWord && stats.bestWord.score) {
      items.push({
        icon: <Target className="w-3.5 h-3.5" />,
        label: t('results.bestWord'),
        value: `${stats.bestWord.word.toUpperCase()} (+${stats.bestWord.score})`,
        highlight: (stats.bestWord.score ?? 0) >= 20,
      });
    }

    if (stats.wpm > 0) {
      items.push({
        icon: <Timer className="w-3.5 h-3.5" />,
        label: t('leaderboard.wordsPerMin'),
        value: stats.wpm,
      });
    }

    if (stats.avgScore > 0) {
      items.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        label: t('dailyChallenge.pointsPerWord'),
        value: stats.avgScore,
      });
    }

    // Blast mode extras
    if (gameMode === 'blast') {
      if (comboLevel > 0) {
        items.push({
          icon: <Zap className="w-3.5 h-3.5" />,
          label: t('results.comboBonus'),
          value: `×${comboLevel}`,
          highlight: comboLevel >= 5,
          color: comboLevel >= 7 ? 'text-neo-pink' : comboLevel >= 5 ? 'text-neo-yellow' : 'text-neo-cyan',
        });
      }
      if (fireRoundActive) {
        items.push({
          icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
          label: t('results.fireRoundBonus'),
          value: '🔥 ACTIVE',
          highlight: true,
          color: 'text-orange-400',
        });
      }
    }

    // Word Hunt mode extras
    if (gameMode === 'word-hunt') {
      items.push({
        icon: <Swords className="w-3.5 h-3.5" />,
        label: t('wordHunt.attempts'),
        value: wordHuntAttempts?.length ?? 0,
      });
      if (wordHuntLife !== undefined) {
        items.push({
          icon: <Flame className="w-3.5 h-3.5" />,
          label: t('wordHunt.lifeBar'),
          value: `${Math.round(wordHuntLife)}%`,
          highlight: wordHuntLife <= 30,
          color: wordHuntLife > 60 ? 'text-green-400' : wordHuntLife > 30 ? 'text-yellow-400' : 'text-red-400',
        });
      }
    }

    // Board coverage for single player
    if (stats.coverage !== null) {
      items.push({
        icon: <Target className="w-3.5 h-3.5" />,
        label: t('singlePlayer.boardCoverage'),
        value: `${stats.coverage}%`,
      });
    }

    return items;
  }, [stats, gameMode, comboLevel, fireRoundActive, wordHuntAttempts, wordHuntLife, t]);

  // Word length distribution bar
  const totalDistribution = stats.shortWords + stats.mediumWords + stats.longWords;

  return (
    <div className="space-y-2">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {statItems.map((item, i) => (
          <m.div
            key={item.label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1.5 rounded-neo border border-neo-black/20 bg-neo-black/20',
              item.highlight && 'border-neo-lime/40 bg-neo-lime/10'
            )}
          >
            <span className={cn('shrink-0', item.color || 'text-neo-white')}>
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] text-neo-white font-medium uppercase truncate">
                {item.label}
              </div>
              <div className={cn(
                'text-xs font-black truncate',
                item.color || 'text-neo-white'
              )}>
                {item.value}
              </div>
            </div>
          </m.div>
        ))}
      </div>

      {/* Word length distribution */}
      {totalDistribution > 0 && (
        <div className="px-1">
          <div className="text-[9px] text-neo-white font-medium uppercase mb-0.5">
            {t('results.wordLengths')}
          </div>
          <div className="flex h-2 rounded-full overflow-hidden border border-neo-black/20">
            {stats.shortWords > 0 && (
              <div
                className="bg-neo-cyan/60 transition-all duration-300"
                style={{ width: `${(stats.shortWords / totalDistribution) * 100}%` }}
                title={`≤4: ${stats.shortWords}`}
              />
            )}
            {stats.mediumWords > 0 && (
              <div
                className="bg-neo-yellow/60 transition-all duration-300"
                style={{ width: `${(stats.mediumWords / totalDistribution) * 100}%` }}
                title={`5-6: ${stats.mediumWords}`}
              />
            )}
            {stats.longWords > 0 && (
              <div
                className="bg-neo-lime/60 transition-all duration-300"
                style={{ width: `${(stats.longWords / totalDistribution) * 100}%` }}
                title={`7+: ${stats.longWords}`}
              />
            )}
          </div>
          <div className="flex justify-between text-[8px] text-neo-white mt-0.5">
            <span>≤4: {stats.shortWords}</span>
            <span>5-6: {stats.mediumWords}</span>
            <span>7+: {stats.longWords}</span>
          </div>
        </div>
      )}
    </div>
  );
}
