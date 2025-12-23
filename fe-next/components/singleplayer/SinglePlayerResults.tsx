'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaRedo, FaHome, FaRobot, FaChartBar, FaCrown, FaStar, FaAward, FaArrowDown, FaCog } from 'react-icons/fa';
import { Sparkles, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GridComponent from '@/components/GridComponent';
import PlayerInsights from '@/components/results/PlayerInsights';
import { AchievementBadge } from '@/components/AchievementBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { updateGuestStatsAfterGame, getGuestStats } from '@/utils/guestManager';
import { getPointColor, getTextColor } from '@/components/results/utils';
import { getRankBgColor } from '@/utils/rankingStyles';
import type { SinglePlayerResultsData, SinglePlayerMode } from './SinglePlayerView';
import { useResultsData } from './results';

// Dynamic import for signup modal
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });

// Session storage key for tracking if signup prompt was shown
const SIGNUP_PROMPT_SHOWN_KEY = 'boggle_sp_signup_shown';

interface SinglePlayerResultsProps {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  onPlayAgain: () => void;
  onQuickRematch?: () => void;
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
  onQuickRematch,
  onBackToLobby,
}) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isLandscape = useMobileLandscape();
  const [showGrid, setShowGrid] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(true);

  // Refs to prevent duplicate stat updates
  const hasUpdatedStatsRef = useRef(false);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  // Use extracted hook for data processing
  const {
    allParticipants,
    playerRank,
    isWinner,
    playerInsights,
    wordsByPoints,
    sortedPointGroups,
    invalidWords,
    totalComboBonus,
    totalFireRoundBonus,
    botWordDetails,
  } = useResultsData(results, t);

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

  // Update guest stats for single player games (only for unauthenticated users)
  useEffect(() => {
    if (isAuthenticated || hasUpdatedStatsRef.current) return;

    // Get the longest valid word from player's words
    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    const longestWord = validWords.reduce<string | undefined>(
      (longest, w) => (w.word.length > (longest?.length || 0) ? w.word : longest),
      undefined
    );

    // Update guest stats
    updateGuestStatsAfterGame({
      score: results.playerScore,
      wordCount: validWords.length,
      longestWord,
      isWinner: isWinner,
      achievements: results.achievements?.map(a => a.key) || []
    });

    hasUpdatedStatsRef.current = true;
  }, [isAuthenticated, results, isWinner]);

  // Show signup prompt for guests who have played 2+ games
  useEffect(() => {
    // Skip if authenticated or modal already shown this session
    if (isAuthenticated) return;
    if (typeof window === 'undefined') return;

    // Check if already shown this session
    const alreadyShown = sessionStorage.getItem(SIGNUP_PROMPT_SHOWN_KEY);
    if (alreadyShown) return;

    // Check if user has played 2+ games total
    const stats = getGuestStats();
    if ((stats.games || 0) < 2) return;

    // Show modal after 2 seconds delay
    const timer = setTimeout(() => {
      setShowSignupModal(true);
      sessionStorage.setItem(SIGNUP_PROMPT_SHOWN_KEY, 'true');
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Scroll detection - hide button when near action buttons
  useEffect(() => {
    const handleScroll = () => {
      if (!actionButtonsRef.current) return;

      const rect = actionButtonsRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Hide button when action buttons are visible (within viewport)
      const isActionButtonsVisible = rect.top < windowHeight - 100;
      setShowScrollButton(!isActionButtonsVisible);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to action buttons
  const scrollToActions = useCallback(() => {
    actionButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // getRankIcon returns React elements - kept local as it's component-specific
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <FaTrophy className="text-neo-yellow text-xl" />;
    if (rank === 2) return <FaMedal className="text-slate-500 dark:text-slate-300 text-xl" />;
    if (rank === 3) return <FaMedal className="text-amber-600 text-xl" />;
    return <span className="text-neo-black/70 dark:text-white/70 font-bold">#{rank}</span>;
  };

  // getRankBgColor imported from @/utils/rankingStyles

  // Landscape mode layout - 2-column: score/grid left, words/actions right
  if (isLandscape) {
    const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;

    return (
      <div className="flex h-screen w-full overflow-hidden bg-slate-900 p-2 gap-2">
        {/* Left column: Victory banner + Score + Grid */}
        <div className="w-1/2 flex flex-col items-center gap-2 overflow-y-auto">
          {/* Victory/Defeat indicator - compact */}
          <div className={cn(
            'w-full text-center py-2 rounded-neo border-2 border-neo-black',
            isWinner || results.isNewHighScore
              ? 'bg-gradient-to-r from-neo-yellow to-yellow-300'
              : 'bg-neo-cream dark:bg-slate-700'
          )}>
            <div className="flex items-center justify-center gap-2">
              {isWinner ? (
                <FaTrophy className="text-xl text-neo-black" />
              ) : results.isNewHighScore ? (
                <FaCrown className="text-xl text-neo-black" />
              ) : (
                <span className="font-black text-neo-black">#{playerRank}</span>
              )}
              <span className="font-black text-sm uppercase text-neo-black">
                {results.isNewHighScore
                  ? (t('singlePlayer.newHighScore') || 'New High Score!')
                  : isWinner
                    ? (t('singlePlayer.victory') || 'Victory!')
                    : (t('singlePlayer.gameOver') || 'Game Over')}
              </span>
            </div>
          </div>

          {/* Score display - compact */}
          <div className="flex items-center gap-4">
            <div className="bg-neo-yellow border-2 border-neo-black rounded-neo px-4 py-2 text-center shadow-hard-sm">
              <div className="text-2xl font-black text-neo-black">{results.playerScore}</div>
              <div className="text-[8px] font-bold uppercase text-neo-black/70">{t('common.score') || 'Score'}</div>
            </div>
            <div className="bg-neo-cream border-2 border-neo-black rounded-neo px-3 py-2 text-center">
              <div className="text-lg font-black text-neo-black">{validWordCount}</div>
              <div className="text-[8px] font-bold uppercase text-neo-black/70">{t('common.words') || 'Words'}</div>
            </div>
          </div>

          {/* Grid toggle + Grid */}
          {results.grid && (
            <div className="w-full max-w-[50vh]">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={cn(
                  'mb-2 mx-auto flex items-center gap-1 px-3 py-1 rounded-neo border-2 border-neo-black font-bold text-xs uppercase',
                  showGrid ? 'bg-neo-cyan text-neo-black' : 'bg-neo-cream text-neo-black'
                )}
              >
                <FaChartBar className="text-sm" />
                <span>{showGrid ? 'Hide' : 'Show'} Grid</span>
              </button>
              {showGrid && (
                <GridComponent grid={results.grid} interactive={false} className="w-full" />
              )}
            </div>
          )}

          {/* Achievements - compact */}
          {results.achievements && results.achievements.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {results.achievements.slice(0, 3).map((achievement, i) => (
                <AchievementBadge key={i} achievement={achievement} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Right column: Words + Bot scores + Actions */}
        <div className="w-1/2 flex flex-col gap-2 overflow-y-auto">
          {/* Words by points - compact */}
          <div className="bg-neo-cream dark:bg-slate-800 border-2 border-neo-black rounded-neo p-2 flex-1 overflow-y-auto">
            <h3 className="text-xs font-black uppercase text-neo-black/80 dark:text-neo-cream mb-2">
              {t('results.yourWords') || 'Your Words'}
            </h3>
            <div className="space-y-1">
              {sortedPointGroups.map(points => {
                const words = wordsByPoints[points] || [];
                if (words.length === 0) return null;
                return (
                  <div key={points} className="flex flex-wrap gap-1">
                    {words.map(w => (
                      <span
                        key={w.word}
                        className="px-2 py-0.5 rounded-neo border border-neo-black text-[10px] font-bold"
                        style={{ backgroundColor: getPointColor(points), color: getTextColor(points) }}
                      >
                        {w.word.toUpperCase()} +{w.score}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bot rankings - compact (for solo-bots mode) */}
          {mode === 'solo-bots' && allParticipants.length > 1 && (
            <div className="bg-neo-cream dark:bg-slate-800 border-2 border-neo-black rounded-neo p-2">
              <h3 className="text-xs font-black uppercase text-neo-black/80 dark:text-neo-cream mb-1">
                {t('results.rankings') || 'Rankings'}
              </h3>
              <div className="space-y-1">
                {allParticipants.slice(0, 4).map((p, i) => (
                  <div
                    key={p.name}
                    className={cn(
                      'flex items-center justify-between px-2 py-1 rounded-neo border border-neo-black text-[10px]',
                      getRankBgColor(i + 1, p.isPlayer)
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {getRankIcon(i + 1)}
                      <span className="font-bold">{p.name}</span>
                      {p.isPlayer && <span className="text-[8px] opacity-75">(you)</span>}
                    </span>
                    <span className="font-black">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons - landscape compact layout */}
          <div className="flex flex-col gap-2 mt-auto">
            {onQuickRematch && (
              <Button
                size="sm"
                className="w-full py-2 bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black font-bold text-xs border-2 border-neo-black"
                onClick={onQuickRematch}
              >
                <FaRedo className="me-1 text-xs" />
                {t('common.rematch') || 'Rematch'}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="cyan"
                size="sm"
                className="flex-1 py-2 font-bold text-xs border-2 border-neo-black"
                onClick={onPlayAgain}
              >
                <FaCog className="me-1 text-xs" />
                {t('common.settings') || 'Settings'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 py-2 font-bold text-xs border-2 border-neo-black"
                onClick={onBackToLobby}
              >
                <FaHome className="me-1 text-xs" />
                {t('common.lobby') || 'Lobby'}
              </Button>
            </div>
          </div>
        </div>

        {/* Signup prompt for guests who have played multiple games */}
        <FirstWinSignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          variant="multiGames"
        />
      </div>
    );
  }

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
              <div className="text-6xl font-black text-neo-black/75 mb-3">#{playerRank}</div>
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
                  <Target className="w-10 h-10 text-neo-black/75 dark:text-neo-cream/75" />
                </div>
                <h2 className="text-3xl font-black uppercase text-neo-black dark:text-neo-white">
                  {t('singlePlayer.challengeComplete') || 'Challenge Complete'}
                </h2>
                {results.previousHighScore && results.previousHighScore > results.playerScore && (
                  <p className="mt-2 text-sm text-neo-black/80 dark:text-neo-cream/80">
                    {(t('challenge.shortOf') || '{diff} points short of your record').replace('{diff}', String(results.previousHighScore - results.playerScore))}
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Score Display - Large and prominent with comic dots */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.3 }}
        className="text-center py-6"
      >
        <div className="inline-block bg-gradient-to-br from-neo-cyan to-cyan-400 rounded-neo-lg border-4 border-neo-black shadow-hard-lg px-10 py-6 relative overflow-hidden texture-halftone-comic">
          {/* Comic-style halftone overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)`,
              backgroundSize: '12px 12px',
              opacity: 0.05,
            }}
          />
          <div className="relative z-10 text-6xl font-black text-neo-black">
            {results.playerScore}
          </div>
          <div className="relative z-10 text-sm font-bold uppercase text-neo-black/70 mt-1">
            {results.playerWords.length} {t('common.words') || 'words'}
          </div>
        </div>
        {/* Fire round and Combo bonus displays */}
        <div className="flex flex-wrap gap-2 justify-center mt-3">
          {totalFireRoundBonus > 0 && (
            <motion.div
              initial={{ scale: 0, rotate: 5 }}
              animate={{ scale: 1, rotate: -2 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 300 }}
              className="inline-block bg-gradient-to-r from-neo-orange to-red-400 border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard"
            >
              <span className="text-sm font-black text-neo-black flex items-center gap-1">
                🔥 {t('results.fireRoundBonus') || 'Fire Round'}: +{totalFireRoundBonus}
              </span>
            </motion.div>
          )}
          {totalComboBonus > 0 && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 3 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
              className="inline-block bg-neo-yellow border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard"
            >
              <span className="text-sm font-black text-neo-black">
                {t('results.comboBonus') || 'Combo Bonus'}: +{totalComboBonus}
              </span>
            </motion.div>
          )}
        </div>
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
                                {/* Show fire round bonus indicator (earthquake 2x) */}
                                {(wordObj.fireRoundBonus ?? 0) > 0 && (
                                  <span className="text-[10px] px-1 py-0.5 bg-neo-orange text-neo-black rounded border border-neo-black font-black" title="Fire Round 2x Bonus">
                                    🔥+{wordObj.fireRoundBonus}
                                  </span>
                                )}
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
                  <div className="text-sm font-black text-neo-black/70 dark:text-white mb-2 flex items-center gap-2 uppercase">
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
            <span className="text-sm text-neo-black/70 dark:text-neo-white/75 italic">
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
              <p className="text-xs text-neo-black/70 dark:text-white mt-3 italic">
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
                      {!participant.isPlayer && <FaRobot className="text-neo-black/70 dark:text-white/75 text-lg" />}
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

      {/* Bot Words Details (solo-bots mode) - Expandable sections for each bot */}
      {mode === 'solo-bots' && botWordDetails.length > 0 && (
        <Card className="border-4 border-neo-black dark:border-slate-600 shadow-hard-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70">
              <FaRobot className="text-neo-purple" />
              {t('singlePlayer.botDetails') || 'Bot Performance Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {botWordDetails.map((bot, botIndex) => (
              <motion.div
                key={bot.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: botIndex * 0.1 }}
                className="border-3 border-neo-black dark:border-slate-500 rounded-neo overflow-hidden"
              >
                {/* Bot header - clickable to expand */}
                <button
                  onClick={() => setExpandedBot(expandedBot === bot.name ? null : bot.name)}
                  className="w-full flex items-center justify-between p-3 bg-neo-cream dark:bg-slate-700 hover:bg-neo-cream/80 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FaRobot className="text-neo-black/70 dark:text-white/70" />
                    <span className="font-black text-neo-black dark:text-white">{bot.name}</span>
                    <span className="text-xs bg-neo-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold">
                      {bot.totalWords} {t('hostView.words') || 'words'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-neo-black dark:text-white">{bot.score}</span>
                    <motion.span
                      animate={{ rotate: expandedBot === bot.name ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-neo-black/70 dark:text-white/70"
                    >
                      ▼
                    </motion.span>
                  </div>
                </button>

                {/* Expanded bot details */}
                <AnimatePresence>
                  {expandedBot === bot.name && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-white dark:bg-slate-800 border-t-2 border-neo-black/20 dark:border-slate-600">
                        {/* Show actual bot words if available */}
                        {bot.words && bot.words.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-bold uppercase text-neo-black/80 dark:text-gray-300 mb-2">
                              {t('singlePlayer.botWords') || 'Words Found'}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {bot.words.map((word, i) => {
                                const points = Math.max(word.length - 1, 1);
                                return (
                                  <span
                                    key={`${word}-${i}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm"
                                    style={{
                                      backgroundColor: getPointColor(points),
                                      color: getTextColor(points)
                                    }}
                                  >
                                    {word}
                                    <span className="text-[10px] opacity-70">+{points}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Words by length summary */}
                        <div className="text-xs font-bold uppercase text-neo-black/80 dark:text-gray-300 mb-2">
                          {t('singlePlayer.wordsByLength') || 'Words by Length'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {bot.sortedLengths.map(length => {
                            const count = bot.wordsByLength[length] || 0;
                            const points = Math.max(length - 1, 1);
                            return (
                              <div
                                key={length}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-neo border-2 border-neo-black shadow-hard-sm"
                                style={{ backgroundColor: getPointColor(points) }}
                              >
                                <span
                                  className="font-black text-sm"
                                  style={{ color: getTextColor(points) }}
                                >
                                  {length}-letter
                                </span>
                                <span
                                  className="text-xs px-1.5 py-0.5 bg-neo-black/20 rounded font-bold"
                                  style={{ color: getTextColor(points) }}
                                >
                                  ×{count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Score breakdown */}
                        <div className="mt-3 pt-2 border-t border-neo-black/10 dark:border-white/10">
                          <div className="text-xs text-neo-black/80 dark:text-gray-300">
                            {t('singlePlayer.totalScore') || 'Total Score'}: <span className="font-black text-neo-black dark:text-white">{bot.score}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
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

      {/* Action buttons - Enhanced with Quick Rematch */}
      <div ref={actionButtonsRef} className="flex flex-col gap-3 pt-4">
        {/* Primary action: Quick Rematch - same settings, new game immediately */}
        {onQuickRematch && (
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button
              size="lg"
              className="w-full py-5 text-xl shadow-hard-lg hover:shadow-hard-xl border-4 bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black font-black uppercase tracking-wider"
              onClick={onQuickRematch}
            >
              <FaRedo className="me-2 text-2xl" />
              {t('common.quickRematch') || 'Quick Rematch'}
            </Button>
          </motion.div>
        )}
        {/* Secondary: Settings & Play Again - clear customization intent */}
        <Button
          variant="cyan"
          size="lg"
          className="w-full py-3 shadow-hard hover:shadow-hard-lg border-3"
          onClick={onPlayAgain}
        >
          <FaCog className="me-2" />
          {t('common.settingsAndPlay') || 'Settings & Play Again'}
        </Button>
        {/* Tertiary: Back to Lobby - least prominent exit action */}
        <Button
          variant="outline"
          size="lg"
          className="w-full py-3 shadow-hard hover:shadow-hard-lg border-3"
          onClick={onBackToLobby}
        >
          <FaHome className="me-2" />
          {t('common.backToLobby') || 'Back to Lobby'}
        </Button>
      </div>

      {/* Floating scroll-to-bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToActions}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black font-bold rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-lg transition-all"
            aria-label={t('common.newGame') || 'New Game'}
          >
            <FaArrowDown className="animate-bounce" />
            <span className="hidden sm:inline">{t('common.newGame') || 'New Game'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Signup prompt for guests who have played multiple games */}
      <FirstWinSignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        variant="multiGames"
      />
    </motion.div>
  );
};

export default SinglePlayerResults;
