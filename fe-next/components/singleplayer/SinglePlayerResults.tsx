'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaRedo, FaHome, FaRobot, FaChartBar, FaCrown, FaStar, FaAward } from 'react-icons/fa';
import { Sparkles, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GridComponent from '@/components/GridComponent';
import PlayerInsights from '@/components/results/PlayerInsights';
import { AchievementBadge } from '@/components/AchievementBadge';
import { calculatePlayerInsights, WordData } from '@/utils/gameInsights';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { POINT_COLORS } from '@/utils/consts';
import type { SinglePlayerResultsData, SinglePlayerMode, PlayerWordData } from './SinglePlayerView';

// Helper to safely get point color with fallback
const getPointColor = (points: number): string => {
  return POINT_COLORS[points] ?? POINT_COLORS[8] ?? 'var(--neo-pink)';
};

// Get text color based on background - ensure readability
const getTextColor = (points: number): string => {
  // For cyan backgrounds (2-3 point words), use dark text for better contrast
  if (points === 2 || points === 3) return 'rgb(var(--neo-black))';
  return 'var(--neo-cream)';
};

interface SinglePlayerResultsProps {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

/**
 * SinglePlayerResults - Display game results for single player modes
 * Shows score, words found, ranking against bots, and high score status
 */
const SinglePlayerResults: React.FC<SinglePlayerResultsProps> = ({
  results,
  mode,
  onPlayAgain,
  onBackToLobby,
}) => {
  const { t } = useLanguage();
  const [showGrid, setShowGrid] = useState(false);

  // Calculate rankings for solo-bots mode
  const allParticipants = [
    { name: t('common.you') || 'You', score: results.playerScore, isPlayer: true },
    ...results.botScores.map(bot => ({ name: bot.name, score: bot.score, isPlayer: false })),
  ].sort((a, b) => b.score - a.score);

  const playerRank = allParticipants.findIndex(p => p.isPlayer) + 1;
  const isWinner = playerRank === 1;

  // Calculate player insights from word data
  const playerInsights = useMemo(() => {
    if (!results.playerWordData?.length) return null;

    const wordData: WordData[] = results.playerWordData.map(w => ({
      word: w.word,
      validated: w.isValid,
      timestamp: w.timestamp,
      timeSinceStart: w.timeSinceStart,
      score: w.score,
    }));

    return calculatePlayerInsights(wordData, results.gameDuration, results.playerScore);
  }, [results.playerWordData, results.gameDuration, results.playerScore]);

  // Group words by points for display (like multiplayer results)
  const { wordsByPoints, sortedPointGroups, invalidWords, totalComboBonus } = useMemo(() => {
    if (!results.playerWordData?.length) {
      return { wordsByPoints: {} as Record<number, PlayerWordData[]>, sortedPointGroups: [] as number[], invalidWords: [] as PlayerWordData[], totalComboBonus: 0 };
    }

    const validWords = results.playerWordData.filter(w => w.isValid);
    const invalidWords = results.playerWordData.filter(w => !w.isValid);

    // Calculate total combo bonus from all valid words
    const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);

    // Group valid words by points
    const wordsByPoints: Record<number, PlayerWordData[]> = {};
    validWords.forEach(wordObj => {
      const points = wordObj.score || 0;
      if (!wordsByPoints[points]) {
        wordsByPoints[points] = [];
      }
      wordsByPoints[points].push(wordObj);
    });

    // Sort words alphabetically within each point group
    Object.keys(wordsByPoints).forEach(points => {
      const wordList = wordsByPoints[Number(points)];
      if (wordList) {
        wordList.sort((a, b) => a.word.localeCompare(b.word));
      }
    });

    // Sort point groups in descending order
    const sortedPointGroups = Object.keys(wordsByPoints)
      .map(Number)
      .sort((a, b) => b - a);

    return { wordsByPoints, sortedPointGroups, invalidWords, totalComboBonus };
  }, [results.playerWordData]);

  // Celebration effect on mount
  useEffect(() => {
    if (isWinner || results.isNewHighScore) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isWinner, results.isNewHighScore]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <FaTrophy className="text-neo-yellow text-xl" />;
    if (rank === 2) return <FaMedal className="text-slate-500 dark:text-slate-300 text-xl" />;
    if (rank === 3) return <FaMedal className="text-amber-600 text-xl" />;
    return <span className="text-neo-black/50 dark:text-white/50 font-bold">#{rank}</span>;
  };

  const getRankBgColor = (rank: number, isPlayer: boolean) => {
    if (isPlayer) {
      if (rank === 1) return 'bg-gradient-to-r from-neo-yellow to-yellow-300 border-neo-yellow';
      return 'bg-neo-cyan/20 dark:bg-neo-cyan/30 border-neo-cyan';
    }
    if (rank === 1) return 'bg-gradient-to-r from-neo-yellow/30 to-yellow-200/30 dark:from-neo-yellow/20 dark:to-yellow-200/20 border-neo-yellow/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-200 to-gray-100 dark:from-slate-600 dark:to-slate-700 border-gray-300 dark:border-slate-500';
    if (rank === 3) return 'bg-gradient-to-r from-amber-200/50 to-amber-100/50 dark:from-amber-800/30 dark:to-amber-700/30 border-amber-300 dark:border-amber-600';
    return 'border-neo-black/20 dark:border-slate-500 bg-white dark:bg-slate-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Victory/Defeat banner - Enhanced */}
      {mode === 'solo-bots' && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'text-center py-8 rounded-neo-lg border-4 border-neo-black shadow-hard-xl relative overflow-hidden',
            isWinner ? 'bg-gradient-to-br from-neo-yellow via-yellow-300 to-neo-orange' : 'bg-gradient-to-br from-neo-cream to-slate-100'
          )}
        >
          {/* Halftone texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
            }}
          />
          <motion.div
            animate={isWinner ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative z-10"
          >
            {isWinner ? (
              <FaTrophy className="text-6xl mx-auto mb-3 text-neo-black drop-shadow-[2px_2px_0px_rgba(0,0,0,0.2)]" />
            ) : (
              <div className="text-6xl font-black text-neo-black/60 mb-3">#{playerRank}</div>
            )}
          </motion.div>
          <h2 className="text-3xl font-black uppercase text-neo-black relative z-10" style={{ textShadow: isWinner ? '2px 2px 0px rgba(255,255,255,0.5)' : 'none' }}>
            {isWinner
              ? t('singlePlayer.victory') || 'Victory!'
              : t('singlePlayer.gameOver') || 'Game Over'}
          </h2>
        </motion.div>
      )}

      {/* Practice mode completion - Enhanced */}
      {mode === 'practice' && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-8 bg-gradient-to-br from-neo-lime via-lime-300 to-green-400 rounded-neo-lg border-4 border-neo-black shadow-hard-xl"
        >
          <h2 className="text-3xl font-black uppercase text-neo-black">
            {t('singlePlayer.practiceComplete') || 'Practice Complete!'}
          </h2>
        </motion.div>
      )}

      {/* Challenge mode - Enhanced with High Score Celebration */}
      {mode === 'challenge' && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'text-center py-8 rounded-neo-lg border-4 border-neo-black shadow-hard-xl relative overflow-hidden',
            results.isNewHighScore
              ? 'bg-gradient-to-br from-neo-yellow via-yellow-300 to-neo-orange'
              : 'bg-gradient-to-br from-neo-cream to-slate-100 dark:from-slate-700 dark:to-slate-800'
          )}
        >
          {/* Background decoration for high score */}
          {results.isNewHighScore && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 text-6xl opacity-10">🏆</div>
              <div className="absolute bottom-4 right-4 text-6xl opacity-10">⭐</div>
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)`,
                  backgroundSize: '12px 12px',
                }}
              />
            </div>
          )}

          <div className="relative z-10">
            {results.isNewHighScore ? (
              <>
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mb-3"
                >
                  <FaCrown className="text-6xl mx-auto text-neo-black drop-shadow-lg" />
                </motion.div>
                <h2 className="text-3xl font-black uppercase text-neo-black mb-2" style={{ textShadow: '2px 2px 0 rgba(255,255,255,0.3)' }}>
                  {results.isNewAllTimeBest
                    ? (t('challenge.allTimeRecord') || 'All-Time Record!')
                    : (t('singlePlayer.newHighScore') || 'New High Score!')}
                </h2>
                {results.previousHighScore && results.previousHighScore > 0 && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="inline-flex items-center gap-2 bg-neo-black text-neo-yellow px-4 py-2 rounded-neo font-black"
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span>+{results.playerScore - results.previousHighScore}</span>
                    <span className="text-sm font-bold opacity-80">
                      {t('challenge.improvement') || 'improvement'}
                    </span>
                  </motion.div>
                )}
                {!results.previousHighScore && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="inline-flex items-center gap-2 bg-neo-black text-neo-yellow px-4 py-2 rounded-neo font-black"
                  >
                    <FaStar className="w-4 h-4" />
                    <span>{t('challenge.firstRecord') || 'First Record Set!'}</span>
                  </motion.div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Target className="w-10 h-10 text-neo-black/60 dark:text-neo-white/60" />
                </div>
                <h2 className="text-3xl font-black uppercase text-neo-black dark:text-neo-white">
                  {t('singlePlayer.challengeComplete') || 'Challenge Complete'}
                </h2>
                {results.previousHighScore && results.previousHighScore > results.playerScore && (
                  <p className="mt-2 text-sm text-neo-black/60 dark:text-neo-white/60">
                    {(t('challenge.shortOf') || '{diff} points short of your record').replace('{diff}', String(results.previousHighScore - results.playerScore))}
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Score Display - Large and prominent */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.3 }}
        className="text-center py-6"
      >
        <div className="inline-block bg-gradient-to-br from-neo-cyan to-cyan-400 rounded-neo-lg border-4 border-neo-black shadow-hard-lg px-10 py-6">
          <div className="text-6xl font-black text-neo-black">
            {results.playerScore}
          </div>
          <div className="text-sm font-bold uppercase text-neo-black/70 mt-1">
            {results.playerWords.length} {t('common.words') || 'words'}
          </div>
        </div>
        {/* Combo bonus display */}
        {totalComboBonus > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 3 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
            className="inline-block mt-3 bg-neo-orange border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard"
          >
            <span className="text-sm font-black text-neo-black">
              {t('results.comboBonus') || 'Combo Bonus'}: +{totalComboBonus}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Words found - Grouped by points like multiplayer results */}
      <Card className="border-4 border-neo-black dark:border-slate-600 shadow-hard-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 flex items-center gap-2">
            <FaChartBar className="text-neo-cyan" />
            {t('common.wordsFound') || 'Words Found'} ({results.playerWords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.playerWordData?.length > 0 ? (
            <div className="space-y-3">
              {/* Valid Words Grouped by Points */}
              {sortedPointGroups.length > 0 && (
                <div className="bg-neo-cream dark:bg-slate-800 rounded-neo p-3 border-3 border-neo-black shadow-hard-sm">
                  <div className="text-sm font-black text-neo-black dark:text-neo-cream mb-3 flex items-center gap-2 uppercase">
                    <span className="bg-neo-cyan text-neo-black px-2 py-0.5 rounded-neo border-2 border-neo-black">✓</span>
                    {t('results.validWords') || 'Valid Words'} ({Object.values(wordsByPoints).flat().length})
                  </div>
                  <div className="space-y-2">
                    {sortedPointGroups.map(points => {
                      const wordsForPoints = wordsByPoints[points] ?? [];
                      return (
                        <div key={`points-${points}`} className="rounded-neo p-2 border-l-4 border-neo-black bg-white/50 dark:bg-slate-700/50" style={{ borderLeftColor: getPointColor(points) }}>
                          <div className="text-xs font-black mb-1.5 flex items-center gap-2 text-neo-black dark:text-neo-cream uppercase">
                            <span
                              className="px-2 py-0.5 rounded-neo flex items-center justify-center font-black text-xs border-2 border-neo-black"
                              style={{
                                backgroundColor: getPointColor(points),
                                color: getTextColor(points)
                              }}
                            >
                              {points} {t('results.points') || 'pts'}
                            </span>
                            <span>{wordsForPoints.length} {t('hostView.words') || 'words'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {wordsForPoints.map((wordObj, i) => (
                              <motion.span
                                key={`${points}-${i}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.02 * Math.min(i, 10) }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-sm font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm"
                                style={{
                                  backgroundColor: getPointColor(wordObj.score),
                                  color: getTextColor(wordObj.score)
                                }}
                              >
                                {wordObj.word}
                                {/* Show combo bonus indicator */}
                                {(wordObj.comboBonus ?? 0) > 0 && (
                                  <span className="text-[10px] px-1 py-0.5 bg-neo-yellow text-neo-black rounded border border-neo-black font-black">
                                    +{wordObj.comboBonus}
                                  </span>
                                )}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Invalid Words */}
              {invalidWords.length > 0 && (
                <div className="bg-neo-cream dark:bg-slate-800 rounded-neo p-3 border-3 border-neo-black shadow-hard-sm">
                  <div className="text-sm font-black text-neo-black/70 dark:text-neo-cream/70 mb-2 flex items-center gap-2 uppercase">
                    <span className="bg-neo-gray text-neo-cream px-2 py-0.5 rounded-neo border-2 border-neo-black">✗</span>
                    {t('results.invalid') || 'Invalid'} ({invalidWords.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {invalidWords.map((wordObj, i) => (
                      <span
                        key={`invalid-${i}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-sm font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm opacity-70"
                        style={{
                          backgroundColor: 'var(--neo-red, #ef4444)',
                          color: 'var(--neo-cream)'
                        }}
                      >
                        {wordObj.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-neo-black/40 dark:text-neo-white/40 italic">
              {t('singlePlayer.noWordsFound') || 'No words found'}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Player Insights - Performance Stats */}
      {playerInsights && (
        <Card className="border-4 border-neo-black dark:border-slate-600 shadow-hard-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neo-purple" />
              {t('insights.yourPerformance') || 'Your Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PlayerInsights insights={playerInsights} />
          </CardContent>
        </Card>
      )}

      {/* Achievements Section - Single Player (not saved to profile) */}
      {results.achievements && results.achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-4 border-neo-black dark:border-slate-600 shadow-hard-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 flex items-center gap-2">
                <FaAward className="w-4 h-4 text-neo-purple" />
                {t('hostView.achievements') || 'Achievements'}
                <span className="text-xs bg-neo-purple/20 text-neo-purple px-2 py-0.5 rounded-neo border border-neo-purple/30 font-bold">
                  {results.achievements.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {results.achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * Math.min(index, 5) }}
                  >
                    <AchievementBadge achievement={achievement} index={index} />
                  </motion.div>
                ))}
              </div>
              {/* Note that achievements are not saved */}
              <p className="text-xs text-neo-black/50 dark:text-neo-white/50 mt-3 italic">
                {t('singlePlayer.achievementsNotSaved') || 'Achievements in single player mode are not saved to your profile.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leaderboard (solo-bots mode) - Enhanced */}
      {mode === 'solo-bots' && results.botScores.length > 0 && (
        <Card className="border-4 border-neo-black dark:border-slate-600 shadow-hard-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaTrophy className="text-neo-yellow" />
              {t('common.leaderboard') || 'Leaderboard'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allParticipants.map((participant, index) => (
                <motion.div
                  key={participant.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-neo border-3 shadow-hard-sm',
                    getRankBgColor(index + 1, participant.isPlayer)
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 border-2 border-neo-black dark:border-slate-500">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex items-center gap-2">
                      {!participant.isPlayer && <FaRobot className="text-neo-black/40 dark:text-white/40 text-lg" />}
                      <span className={cn(
                        'font-black text-lg text-neo-black dark:text-white',
                        participant.isPlayer ? '' : 'text-neo-black/80 dark:text-white/80'
                      )}>
                        {participant.name}
                      </span>
                      {participant.isPlayer && (
                        <span className="text-xs bg-neo-black text-white px-2 py-0.5 rounded-full font-bold uppercase">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-neo-black dark:text-white">
                    {participant.score}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid preview - Toggle button style */}
      <motion.button
        onClick={() => setShowGrid(!showGrid)}
        className="w-full bg-neo-cream dark:bg-slate-800 border-4 border-neo-black dark:border-slate-600 rounded-neo-lg p-4 shadow-hard flex items-center justify-between font-bold uppercase tracking-wide hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white"
      >
        <span>{t('common.viewGrid') || 'View Grid'}</span>
        <motion.span
          animate={{ rotate: showGrid ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {showGrid && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-4 border-neo-black rounded-neo-lg bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 flex justify-center shadow-hard-lg">
              <GridComponent
                grid={results.grid}
                interactive={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons - Enhanced */}
      <div className="flex gap-4 pt-4">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1 py-4 text-lg shadow-hard hover:shadow-hard-lg border-3"
          onClick={onBackToLobby}
        >
          <FaHome className="mr-2" />
          {t('common.lobby') || 'Lobby'}
        </Button>
        <Button
          size="lg"
          className="flex-1 py-4 text-lg shadow-hard hover:shadow-hard-lg border-3 bg-neo-cyan hover:bg-neo-cyan/90"
          onClick={onPlayAgain}
        >
          <FaRedo className="mr-2" />
          {t('common.playAgain') || 'Play Again'}
        </Button>
      </div>
    </motion.div>
  );
};

export default SinglePlayerResults;
