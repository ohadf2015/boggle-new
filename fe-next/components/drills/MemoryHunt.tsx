'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Heart, Eye, EyeOff, CheckCircle2, XCircle, X, RefreshCw, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import type { LetterGrid, Language } from '@/types';
import { useMemoryHuntGame } from './useMemoryHuntGame';
import { MemoryHuntCompletePhase } from './MemoryHuntCompletePhase';

interface MemoryHuntProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level?: number;
  language?: Language;
  onComplete: (result: {
    score: number;
    wordsFound: number;
    totalWords: number;
    timeSpent: number;
    level: number;
  }) => void;
  onExit?: () => void;
}

export default function MemoryHunt({
  grid,
  availableWords,
  level = 1,
  language = 'en',
  onComplete,
  onExit,
}: MemoryHuntProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  const game = useMemoryHuntGame({
    grid,
    availableWords,
    level,
    language,
    onComplete,
  });

  // Keyboard support for desktop users (only during recall phase)
  const keyboard = useDrillKeyboardSupport({
    grid,
    language,
    enabled: game.phase === 'recall',
    onWordSubmit: (word: string) => game.handleWordSubmit(word),
    minWordLength: 2,
  });

  return (
    <div className={cn(
      'flex flex-col h-full',
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b-4 border-neo-black',
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: game.levelConfig.lives }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  'w-5 h-5',
                  i < game.lives ? 'text-neo-red fill-neo-red' : 'text-gray-300'
                )}
              />
            ))}
          </div>
          <div className={cn(
            'px-2 py-1 rounded border-2 border-neo-black text-xs font-bold',
            isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-neo-cream text-neo-black'
          )}>
            {t('brain.drills.round')} {game.round}/5
          </div>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          isDarkMode ? 'bg-neo-purple text-neo-white' : 'bg-neo-lime text-neo-black'
        )}>
          {game.score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Ready Phase */}
        {game.phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Brain className={cn(
              'w-20 h-20 mx-auto',
              isDarkMode ? 'text-neo-purple' : 'text-neo-purple'
            )} />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.drills.memory-hunt.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.drills.memory-hunt.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.memory-hunt.wordsToRemember')}: {game.levelConfig.wordCount}</p>
              <p>{t('brain.drills.memory-hunt.studyTime')}: {game.levelConfig.studyTime / 1000}s</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={game.startGame}
              className={cn(
                'px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                'font-bold text-lg uppercase',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-green text-neo-black'
              )}
            >
              {t('brain.drills.start')}
            </motion.button>
          </motion.div>
        )}

        {/* Study Phase */}
        {game.phase === 'study' && (
          <div className="w-full max-w-md space-y-4">
            <div className="relative">
              <GridComponent
                grid={grid}
                interactive={false}
                highlightedPath={game.currentHighlight}
                className="w-full opacity-50"
              />
            </div>
            <AnimatePresence>
              {game.showStudyModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className={cn(
                      'w-full max-w-lg p-6 rounded-neo border-4 border-neo-black shadow-hard-lg',
                      isDarkMode ? 'bg-slate-800' : 'bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Eye className={cn(
                          'w-8 h-8',
                          isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                        )} />
                        <span className={cn(
                          'font-black text-xl uppercase',
                          isDarkMode ? 'text-neo-white' : 'text-neo-black'
                        )}>
                          {t('brain.drills.memory-hunt.studyPhase')}
                        </span>
                      </div>
                      <div className={cn(
                        'px-4 py-2 rounded-neo border-3 border-neo-black text-3xl font-black tabular-nums',
                        isDarkMode ? 'bg-neo-lime text-neo-black' : 'bg-neo-orange text-neo-black'
                      )}>
                        {game.studyCountdown}
                      </div>
                    </div>
                    <p className={cn(
                      'text-center text-lg font-medium mb-4',
                      isDarkMode ? 'text-neo-white/80' : 'text-neo-black/80'
                    )}>
                      {t('brain.drills.memory-hunt.studyTheseWords')}
                    </p>
                    <div className="space-y-3 mb-6">
                      {game.targetWords.map((tw, i) => (
                        <motion.div
                          key={`${tw.word}-${i}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-3 rounded-neo border-3 border-neo-black',
                            isDarkMode ? 'bg-neo-purple' : 'bg-neo-lime'
                          )}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-neo-black tracking-wide">
                            {tw.word}
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => game.replaceInvalidWord(tw.word)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black',
                              'text-xs font-bold uppercase',
                              'bg-neo-red/20 hover:bg-neo-red/40 text-neo-black',
                              'transition-colors'
                            )}
                            title={t('brain.drills.memory-hunt.markInvalid')}
                          >
                            <X className="w-4 h-4" />
                            <RefreshCw className="w-3 h-3" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={game.skipStudyPhase}
                      className={cn(
                        'w-full px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                        'font-bold text-lg uppercase',
                        'transition-all hover:translate-y-[-2px]',
                        'bg-neo-green text-neo-black'
                      )}
                    >
                      {t('brain.drills.memory-hunt.readyToStart')}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Recall Phase */}
        {(game.phase === 'recall' || game.phase === 'feedback') && (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-center gap-2">
              <EyeOff className={cn(
                'w-5 h-5',
                isDarkMode ? 'text-neo-orange' : 'text-neo-purple'
              )} />
              <span className={cn(
                'font-bold uppercase',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}>
                {t('brain.drills.memory-hunt.recallPhase')}
              </span>
            </div>

            {keyboard.isTypingMode && keyboard.typedWord && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'text-center px-4 py-2 rounded-neo border-2 border-neo-black font-black text-lg uppercase mb-2',
                  keyboard.isValidOnGrid
                    ? 'bg-neo-cyan text-neo-black'
                    : 'bg-neo-red/50 text-neo-black'
                )}
              >
                {keyboard.typedWord}
              </motion.div>
            )}

            <div className="relative">
              <GridComponent
                grid={grid}
                interactive={game.phase === 'recall'}
                onWordSubmit={game.handleWordSubmit}
                highlightedPath={keyboard.isTypingMode ? keyboard.highlightedCells : game.currentHighlight}
                language={language}
                className="w-full"
              />
              <AnimatePresence>
                {game.lastFeedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className={cn(
                      "absolute inset-0 flex items-center justify-center rounded-neo",
                      game.lastFeedback === 'correct'
                        ? "bg-neo-green/90"
                        : "bg-neo-red/90"
                    )}
                  >
                    {game.lastFeedback === 'correct' ? (
                      <CheckCircle2 className="w-20 h-20 text-white drop-shadow-lg" />
                    ) : (
                      <XCircle className="w-20 h-20 text-white drop-shadow-lg" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={cn(
              'p-3 rounded-neo border-2 border-neo-black text-center',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p className={cn(
                'text-xs font-medium mb-2',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {t('brain.drills.memory-hunt.remaining')}: {game.remainingWords.length}
              </p>
              <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
                {game.targetWords.map((tw, i) => (
                  <span
                    key={i}
                    className={cn(
                      'px-3 py-1.5 rounded-neo border-2 border-neo-black text-base font-bold min-w-[5ch] text-center',
                      tw.found
                        ? 'bg-neo-green/30 text-neo-green line-through'
                        : isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {tw.found ? tw.word : '???'}
                  </span>
                ))}
              </div>
            </div>

            {keyboard.isDesktop && (
              <>
                <KeyboardDesktopBadge t={t} position="bottom-right" />
                <EnterKeyHint
                  isVisible={keyboard.showEnterHint}
                  t={t}
                  position="bottom-center"
                />
                <KeyboardQuickTip
                  isVisible={keyboard.showQuickTip}
                  onDismiss={keyboard.dismissQuickTip}
                  t={t}
                />
              </>
            )}

            <div className="flex gap-3 mt-4">
              {game.hintsRemaining > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={game.useHint}
                  disabled={game.isHintActive}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-black',
                    'font-bold text-sm uppercase',
                    'transition-all hover:translate-y-[-1px]',
                    game.isHintActive
                      ? 'bg-neo-lime text-neo-black cursor-not-allowed'
                      : 'bg-neo-yellow text-neo-black hover:bg-neo-lime'
                  )}
                >
                  <Lightbulb className="w-4 h-4" />
                  {t('brain.drills.useHint')} ({game.hintsRemaining})
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={game.finishGame}
                className={cn(
                  'flex-1 px-4 py-2 rounded-neo border-2 border-neo-black',
                  'font-bold text-sm uppercase',
                  'transition-all hover:translate-y-[-1px]',
                  isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-gray-200 text-neo-black'
                )}
              >
                {t('brain.drills.finishGame')}
              </motion.button>
            </div>
          </div>
        )}

        {game.phase === 'complete' && (
          <MemoryHuntCompletePhase
            isDarkMode={isDarkMode}
            results={game.results}
            lives={game.lives}
            t={t}
            onPlayAgain={game.resetGame}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  );
}
