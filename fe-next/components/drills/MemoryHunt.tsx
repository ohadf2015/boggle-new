'use client';

import { useRef, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Heart, Eye, EyeOff, CheckCircle2, XCircle, X, RefreshCw, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { useDrillGameActive } from '@/hooks/useDrillGameActive';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import type { LetterGrid, Language } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMemoryHuntGame } from './useMemoryHuntGame';
import { MemoryHuntCompletePhase } from './MemoryHuntCompletePhase';
import DrillBriefing from '@/components/brain/DrillBriefing';

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
  onPlayAgain?: () => void;
}

export default function MemoryHunt({
  grid,
  availableWords,
  level = 1,
  language = 'en',
  onComplete,
  onExit,
  onPlayAgain,
}: MemoryHuntProps) {
  const { t, dir } = useLanguage();
  const { playDrillStartSound, playDrillCompleteSound } = useSoundEffects();
  const studyModalRef = useRef<HTMLDivElement>(null);

  const game = useMemoryHuntGame({
    grid,
    availableWords,
    level,
    language,
    onComplete,
  });

  useFocusTrap(studyModalRef, game.phase === 'study' && game.showStudyModal);

  // Drill sounds no-op unless the game is flagged active (see useDrillGameActive)
  useDrillGameActive(
    game.phase === 'study' || game.phase === 'recall' || game.phase === 'feedback',
  );

  // Play drill complete sound when game finishes
  useEffect(() => {
    if (game.phase === 'complete') {
      playDrillCompleteSound();
    }
  }, [game.phase, playDrillCompleteSound]);

  // Keyboard support for desktop users (only during recall phase)
  const keyboard = useDrillKeyboardSupport({
    grid,
    language,
    enabled: game.phase === 'recall',
    onWordSubmit: (word: string) => game.handleWordSubmit(word),
    minWordLength: 2,
  });

  return (
    <div dir={dir} className={cn(
      'flex flex-col h-full',
      'bg-neo-navy'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b-4 border-neo-black',
        'bg-neo-navy-light'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: game.levelConfig.lives }).map((_, i) => (
              <Heart
                key={`life-${i}`}
                className={cn(
                  'w-5 h-5',
                  i < game.lives ? 'text-neo-red fill-neo-red' : 'text-gray-300'
                )}
              />
            ))}
          </div>
          <div className={cn(
            'px-2 py-1 rounded border-2 border-neo-black text-xs font-bold',
            'bg-neo-navy-elevated text-neo-white'
          )}>
            {t('brain.drills.round')} {game.round}/5
          </div>
        </div>
        <div aria-live="polite" className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          'bg-neo-purple text-neo-white'
        )}>
          {game.score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start p-4 relative">
        {/* Ready Phase — warm, instantly-legible briefing */}
        {game.phase === 'ready' && (
          <DrillBriefing
            drillId="memory-hunt"
            level={level}
            goalText={`${t('brain.drills.memory-hunt.wordsToRemember')}: ${game.levelConfig.wordCount} · ${t('brain.drills.memory-hunt.studyTime')}: ${game.levelConfig.studyTime / 1000}s`}
            onStart={() => { playDrillStartSound(); game.startGame(); }}
          />
        )}

        {/* Study Phase */}
        {game.phase === 'study' && (
          <div className="w-full max-w-md lg:max-w-lg space-y-4">
            <div className="relative">
              <GridComponent
                grid={grid}
                interactive={false}
                highlightedPath={game.currentHighlight}
                className="w-full opacity-50"
              />
            </div>
            <AdaptiveAnimatePresence>
              {game.showStudyModal && (
                <AdaptiveMotion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  ref={studyModalRef}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                >
                  <AdaptiveMotion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className={cn(
                      'w-full max-w-lg p-6 rounded-neo border-4 border-neo-black shadow-hard-lg',
                      'bg-neo-navy-light'
                    )}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Eye className={cn(
                          'w-8 h-8',
                          'text-neo-cyan'
                        )} />
                        <span className={cn(
                          'font-black text-xl uppercase',
                          'text-neo-white'
                        )}>
                          {t('brain.drills.memory-hunt.studyPhase')}
                        </span>
                      </div>
                      <div role="status" className={cn(
                        'px-4 py-2 rounded-neo border-3 border-neo-black text-3xl font-black tabular-nums',
                        'bg-neo-lime text-neo-black'
                      )}>
                        {game.studyCountdown}
                      </div>
                    </div>
                    <p className={cn(
                      'text-center text-lg font-medium mb-4',
                      'text-neo-white'
                    )}>
                      {t('brain.drills.memory-hunt.studyTheseWords')}
                    </p>
                    <div className="space-y-3 mb-6">
                      {game.targetWords.map((tw, i) => (
                        <AdaptiveMotion.div
                          key={`${tw.word}-${i}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-3 rounded-neo border-3 border-neo-black',
                            'bg-neo-purple'
                          )}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-neo-black tracking-wide">
                            {tw.word}
                          </span>
                          <AdaptiveMotion.button
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
                          </AdaptiveMotion.button>
                        </AdaptiveMotion.div>
                      ))}
                    </div>
                    <AdaptiveMotion.button
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
                    </AdaptiveMotion.button>
                  </AdaptiveMotion.div>
                </AdaptiveMotion.div>
              )}
            </AdaptiveAnimatePresence>
          </div>
        )}

        {/* Recall Phase */}
        {(game.phase === 'recall' || game.phase === 'feedback') && (
          <div className="w-full max-w-md lg:max-w-lg space-y-4">
            <div className="flex items-center justify-center gap-2">
              <EyeOff className={cn(
                'w-5 h-5',
                'text-neo-orange'
              )} />
              <span className={cn(
                'font-bold uppercase',
                'text-neo-white'
              )}>
                {t('brain.drills.memory-hunt.recallPhase')}
              </span>
            </div>

            {keyboard.isTypingMode && keyboard.typedWord && (
              <AdaptiveMotion.div
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
              </AdaptiveMotion.div>
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
              <AdaptiveAnimatePresence>
                {game.lastFeedback && (
                  <AdaptiveMotion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-neo p-4 text-center",
                      game.lastFeedback === 'correct'
                        ? "bg-neo-green/90"
                        : game.lastFeedback === 'free'
                          ? "bg-neo-purple/90"
                          : "bg-neo-red/90"
                    )}
                  >
                    {game.lastFeedback === 'correct' ? (
                      <CheckCircle2 className="w-14 h-14 sm:w-20 sm:h-20 text-white drop-shadow-lg" />
                    ) : game.lastFeedback === 'free' ? (
                      <>
                        <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-lg" />
                        <p className="text-sm font-bold text-white max-w-[14rem]">
                          {t('brain.drills.firstMissFree')}
                        </p>
                      </>
                    ) : (
                      <XCircle className="w-14 h-14 sm:w-20 sm:h-20 text-white drop-shadow-lg" />
                    )}
                  </AdaptiveMotion.div>
                )}
              </AdaptiveAnimatePresence>
            </div>

            <div className={cn(
              'p-3 rounded-neo border-2 border-neo-black text-center',
              'bg-neo-navy-light'
            )}>
              <p className={cn(
                'text-xs font-medium mb-2',
                'text-neo-white'
              )}>
                {t('brain.drills.memory-hunt.remaining')}: {game.remainingWords.length}
              </p>
              <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
                {game.targetWords.map((tw, i) => (
                  <span
                    key={`${tw.word}-${i}`}
                    className={cn(
                      'px-3 py-1.5 rounded-neo border-2 border-neo-black text-base font-bold min-w-[5ch] text-center',
                      tw.found
                        ? 'bg-neo-green/30 text-neo-green line-through'
                        : 'bg-neo-navy-elevated text-gray-300'
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
                <AdaptiveMotion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={game.useHint}
                  disabled={game.isHintActive}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-black',
                    'font-bold text-sm uppercase',
                    'transition-all hover:-translate-y-px',
                    game.isHintActive
                      ? 'bg-neo-lime text-neo-black cursor-not-allowed'
                      : 'bg-neo-yellow text-neo-black hover:bg-neo-lime'
                  )}
                >
                  <Lightbulb className="w-4 h-4" />
                  {t('brain.drills.useHint')} ({game.hintsRemaining})
                </AdaptiveMotion.button>
              )}
              <AdaptiveMotion.button
                whileTap={{ scale: 0.95 }}
                onClick={game.finishGame}
                aria-label={t('brain.drills.finishGame')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-neo border-2 border-neo-black',
                  'font-bold text-sm uppercase',
                  'transition-all hover:-translate-y-px',
                  'bg-neo-navy-elevated text-neo-white'
                )}
              >
                {t('brain.drills.finishGame')}
              </AdaptiveMotion.button>
            </div>
          </div>
        )}

        {game.phase === 'complete' && (
          <MemoryHuntCompletePhase
            isDarkMode={true}
            results={game.results}
            lives={game.lives}
            level={level}
            maxLives={game.levelConfig.lives}
            t={t}
            onPlayAgain={() => { game.resetGame(); onPlayAgain?.(); }}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  );
}
