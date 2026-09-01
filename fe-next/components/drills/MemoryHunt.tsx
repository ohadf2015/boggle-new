'use client';

import { useRef, useEffect } from 'react';
import { Heart, Eye, EyeOff, CheckCircle2, XCircle, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
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
import { MemoryHuntCluePanel } from './MemoryHuntCluePanel';
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
        <div className="flex items-center gap-2">
          {/* Streak badge — variable-reward layer, only surfaces once a real streak is on */}
          <AdaptiveAnimatePresence>
            {game.comboLevel >= 2 && (
              <AdaptiveMotion.div
                key={game.comboLevel}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                aria-live="polite"
                className="px-2 py-1 rounded-neo border-2 border-neo-black text-xs font-bold bg-neo-orange text-neo-black"
              >
                🔥 {t('brain.drills.comboStreak', '{{n}}x streak!', { n: game.comboLevel })}
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>
          <div aria-live="polite" className={cn(
            'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
            'bg-neo-purple text-neo-white'
          )}>
            {game.score} {t('brain.drills.points')}
          </div>
        </div>
      </div>

      {/* Game Area — no page scroll; each phase owns its own fit. */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* Ready Phase — warm, instantly-legible briefing. Own scroll container
            (screen-fit-locked body can't scroll) so the CTA is never clipped. */}
        {game.phase === 'ready' && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start p-4">
            <DrillBriefing
              drillId="memory-hunt"
              level={level}
              goalText={`${t('brain.drills.memory-hunt.wordsToRemember')}: ${game.levelConfig.wordCount} · ${t('brain.drills.memory-hunt.studyTime')}: ${game.levelConfig.studyTime / 1000}s`}
              onStart={() => { playDrillStartSound(); game.startGame(); }}
            />
          </div>
        )}

        {/* Study Phase — grid preview centered behind the fixed study modal */}
        {game.phase === 'study' && (
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 w-full max-w-md lg:max-w-lg mx-auto">
            <div className="relative w-full">
              <GridComponent
                grid={grid}
                interactive={false}
                highlightedPath={game.currentHighlight}
                className="w-full opacity-50"
              />
            </div>
            <>
              {game.showStudyModal && (
                <div
                  ref={studyModalRef}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in-0 duration-300"
                >
                  <div
                    className={cn(
                      'w-full max-w-lg p-6 rounded-neo border-4 border-neo-black shadow-hard-lg',
                      'bg-neo-navy-light',
                      'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
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
                        <div
                          key={`${tw.word}-${i}`}
                          style={{ animationDelay: `${i * 0.1}s` }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-3 rounded-neo border-3 border-neo-black',
                            'bg-neo-purple',
                            'animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both'
                          )}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-neo-black tracking-wide">
                            {tw.word}
                          </span>
                          <button
                            type="button"
                            onClick={() => game.replaceInvalidWord(tw.word)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black',
                              'text-xs font-bold uppercase',
                              'bg-neo-red/20 hover:bg-neo-red/40 text-neo-black',
                              'transition-colors hover:scale-110 active:scale-90'
                            )}
                            title={t('brain.drills.memory-hunt.markInvalid')}
                          >
                            <X className="w-4 h-4" />
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={game.skipStudyPhase}
                      className={cn(
                        'w-full px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                        'font-bold text-lg uppercase',
                        'transition-all hover:translate-y-[-2px] active:scale-95',
                        'bg-neo-green text-neo-black'
                      )}
                    >
                      {t('brain.drills.memory-hunt.readyToStart')}
                    </button>
                  </div>
                </div>
              )}
            </>
          </div>
        )}

        {/* Recall Phase */}
        {(game.phase === 'recall' || game.phase === 'feedback') && (
          <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-2 px-3 py-2">
            {/* Slim status row: typed word on desktop, else a thin recall cue */}
            <div className="h-8 shrink-0 w-full max-w-md flex items-center justify-center">
              {keyboard.isTypingMode && keyboard.typedWord ? (
                <div
                  className={cn(
                    'px-4 py-1.5 rounded-neo border-2 border-neo-black font-black text-lg uppercase',
                    keyboard.isValidOnGrid
                      ? 'bg-neo-cyan text-neo-black'
                      : 'bg-neo-red/60 text-neo-black',
                    'animate-in fade-in-0 slide-in-from-top-2 duration-300'
                  )}
                >
                  {keyboard.typedWord}
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-neo-cream">
                  <EyeOff className="w-4 h-4 text-neo-orange" />
                  {t('brain.drills.memory-hunt.recallPhase')}
                </span>
              )}
            </div>

            {/* Board centerpiece — largest square that fits the space, never squashed. */}
            <div
              className="flex-1 min-h-0 w-full flex items-center justify-center"
              style={{ containerType: 'size' }}
            >
              <div
                className="relative aspect-square"
                style={{ width: 'min(100cqw, 100cqh)', maxWidth: 'min(100%, 32rem)' }}
              >
                <GridComponent
                  grid={grid}
                  interactive={game.phase === 'recall'}
                  onWordSubmit={game.handleWordSubmit}
                  highlightedPath={keyboard.isTypingMode && !game.isHintActive ? keyboard.highlightedCells : game.currentHighlight}
                  language={language}
                  className="w-full h-full"
                />
                <>
                  {game.lastFeedback && (
                    <div
                      className={cn(
                        'absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-neo p-4 text-center',
                        game.lastFeedback === 'correct'
                          ? 'bg-neo-green/90'
                          : game.lastFeedback === 'free'
                            ? 'bg-neo-purple/90'
                            : 'bg-neo-red/90',
                        'animate-in fade-in-0 zoom-in-50 duration-300'
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
                    </div>
                  )}
                </>
              </div>
            </div>

            {/* Compact footer: word chips + clue / finish (no scroll) */}
            <div className="shrink-0 w-full max-w-md space-y-2">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {game.targetWords.map((tw, i) => (
                  <span
                    key={`${tw.word}-${i}`}
                    className={cn(
                      'px-2.5 py-1 rounded-neo border-2 border-neo-black text-sm font-black min-w-[4ch] text-center tracking-wide',
                      tw.found
                        ? 'bg-neo-green/30 text-neo-green line-through'
                        : 'bg-neo-navy-elevated text-neo-cream'
                    )}
                  >
                    {tw.found ? tw.word : '???'}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <MemoryHuntCluePanel
                  hintsRemaining={game.hintsRemaining}
                  isHintActive={game.isHintActive}
                  onUseClue={game.useHint}
                  onGrantClues={game.grantClues}
                  t={t}
                />
                <button
                  type="button"
                  onClick={game.finishGame}
                  aria-label={t('brain.drills.finishGame')}
                  className={cn(
                    'px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                    'font-black text-sm uppercase tracking-wide',
                    'transition-all hover:-translate-y-px active:shadow-hard-pressed',
                    'bg-neo-navy-elevated text-neo-cream'
                  )}
                >
                  {t('brain.drills.finishGame')}
                </button>
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
