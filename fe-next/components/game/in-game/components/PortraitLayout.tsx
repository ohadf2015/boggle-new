'use client';

import React, { memo, type ReactNode, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import RoomChat from '@/components/RoomChat';
import WordFormingArea, { type WordFeedback } from '../../WordFormingArea';
import ComboDisplay from '../../ComboDisplay';
import CompactLeaderboard from '../../CompactLeaderboard';
import { shouldShowKeyboardTrails } from '../../keyboardTrailsUtils';
import { WordsRemaining } from '@/player/components/in-game/WordsRemaining';
import { GameOverlays } from './GameOverlays';
import { GameHeader } from './GameHeader';
import { GameLeaderboard } from './GameLeaderboard';
import { GameWordList } from './GameWordList';
import { ScoreDisplay } from './ScoreDisplay';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { ExtendedLeaderboardPlayer as LeaderboardPlayer, FoundWord } from '@/shared/types/view';
import type { HintsState, EarthquakeState, TranslationFn, TappedCellPosition } from '../types';

interface TournamentData {
  name?: string;
  currentRound?: number;
  totalRounds?: number;
}

interface PortraitLayoutProps {
  // Core props
  username: string;
  gameCode: string;
  isHost: boolean;
  isPlaying: boolean;
  t: TranslationFn;
  dir: 'rtl' | 'ltr';

  // Game state
  letterGrid: LetterGrid;
  remainingTime: number | null;
  timerValue: number;
  gameActive: boolean;
  showStartAnimation: boolean;
  gameLanguage: Language;
  comboLevel: number;
  comboTimeRemaining: number | null;
  comboDanger: boolean;
  fireRoundActive: boolean;
  minWordLength: number;

  // Visual state
  hasAnimated: boolean;
  earthquakeState: EarthquakeState;
  gameplayFocusMode: boolean;

  // Player data
  playerScore: number;
  playerRank: number | null;
  leaderboard: LeaderboardPlayer[];
  deferredLeaderboard: LeaderboardPlayer[];
  foundWords: FoundWord[];

  // Word forming
  formedWord: string;
  letterCount: number;
  currentFeedback: WordFeedback | null;

  // Keyboard input
  isTypingMode: boolean;
  typedWord: string;
  highlightedCells: Array<{ row: number; col: number }>;
  lastWordFoundTime: number;
  totalGamesPlayed?: number;

  // Callbacks
  onExitRoom?: () => void;
  onShowTutorial?: () => void;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  onSingleTapDetected: (cell: TappedCellPosition) => void;

  // Hints
  hints?: HintsState;

  // Fire round
  fireRoundRemaining: number;

  // Tap-to-drag guidance
  showDragTutorial: boolean;
  onDismissDragTutorial: () => void;

  // Keyboard help
  isDesktop: boolean;
  showQuickTip: boolean;
  onDismissQuickTip: () => void;
  isHelpOpen: boolean;
  onCloseHelp: () => void;

  // Tournament
  tournamentData: TournamentData | null;

  // Single player
  totalBoardWords: number | null;

  // Refs
  gameStatsRef: RefObject<HTMLDivElement | null>;

  // Achievement dock
  children?: ReactNode;
}

/**
 * PortraitLayout - Portrait/Desktop mode layout for the game
 */
export const PortraitLayout = memo<PortraitLayoutProps>(function PortraitLayout({
  username,
  gameCode,
  isHost,
  isPlaying,
  t,
  dir,
  letterGrid,
  remainingTime,
  timerValue,
  gameActive,
  showStartAnimation,
  gameLanguage,
  comboLevel,
  comboTimeRemaining,
  comboDanger,
  fireRoundActive,
  minWordLength,
  hasAnimated,
  earthquakeState,
  gameplayFocusMode,
  playerScore,
  playerRank,
  leaderboard,
  deferredLeaderboard,
  foundWords,
  formedWord,
  letterCount,
  currentFeedback,
  isTypingMode,
  typedWord,
  highlightedCells,
  lastWordFoundTime,
  totalGamesPlayed,
  onExitRoom,
  onShowTutorial,
  onWordSubmit,
  onWordChange,
  onSingleTapDetected,
  hints,
  fireRoundRemaining,
  showDragTutorial,
  onDismissDragTutorial,
  isDesktop,
  showQuickTip,
  onDismissQuickTip,
  isHelpOpen,
  onCloseHelp,
  tournamentData,
  totalBoardWords,
  gameStatsRef,
  children,
}) {
  return (
    <>
      <GameOverlays
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        showDragTutorial={showDragTutorial}
        onDismissDragTutorial={onDismissDragTutorial}
        isPlaying={isPlaying}
        isDesktop={isDesktop}
        showQuickTip={showQuickTip}
        onDismissQuickTip={onDismissQuickTip}
        isTypingMode={isTypingMode}
        isHelpOpen={isHelpOpen}
        onCloseHelp={onCloseHelp}
        t={t}
        dir={dir}
        gameLanguage={gameLanguage}
      />

      <div className="flex flex-col lg:flex-row gap-0 md:gap-2 lg:gap-2 flex-1 w-full max-w-[1920px] mx-auto overflow-hidden transition-all duration-500 ease-in-out h-full">
        {/* Mobile Header */}
        <GameHeader
          onExitRoom={onExitRoom}
          onShowTutorial={onShowTutorial}
          hints={hints}
          gameActive={gameActive}
          t={t}
          variant="mobile"
        />

        {/* Left Column: Found Words (Desktop only) */}
        {isPlaying && !gameplayFocusMode && (
          <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 2xl:w-80 gap-2 min-h-0 flex-shrink-0">
            <GameWordList foundWords={foundWords} minWordLength={minWordLength} t={t} />
          </div>
        )}

        {/* Center Column: Timer, Score, Grid */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden max-h-full">
          {/* Stats section with vertical stacking on mobile */}
          {remainingTime !== null && (
            <div
              ref={gameStatsRef}
              className="flex flex-col gap-1 w-full px-1 md:px-2"
              role="status"
              aria-label="Game status"
            >
              {/* Combo row - mobile only, centered. Container always present to prevent layout shift */}
              {isPlaying && (
                <div
                  className="flex lg:hidden justify-center items-center h-[40px]"
                  data-testid="combo-row-mobile"
                >
                  <ComboDisplay
                    comboLevel={comboLevel}
                    compact
                    timeRemaining={comboTimeRemaining}
                    isDanger={comboDanger}
                  />
                </div>
              )}

              {/* Stats row - Timer centered on mobile, Timer + controls on desktop */}
              <div
                className="flex w-full items-center justify-center lg:justify-between relative min-h-[80px] md:min-h-[100px] lg:min-h-[120px]"
                data-testid="stats-row"
              >
                {/* Desktop header */}
                <GameHeader
                  onExitRoom={onExitRoom}
                  onShowTutorial={onShowTutorial}
                  hints={hints}
                  gameActive={gameActive}
                  t={t}
                  variant="desktop"
                />

                {/* Timer (center) */}
                <motion.div
                  data-tutorial="timer"
                  data-testid="timer-container"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative z-20 shrink-0"
                >
                  <div className="hidden lg:block">
                    <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="lg" />
                  </div>
                  <div className="hidden md:block lg:hidden">
                    <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="md" />
                  </div>
                  <div className="md:hidden">
                    <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="xs" />
                  </div>
                </motion.div>

                {/* Right Side: Score (mobile) - positioned absolutely to not affect timer centering */}
                {isPlaying && (
                  <div
                    className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 lg:hidden"
                    data-testid="score-mobile"
                  >
                    <ScoreDisplay
                      score={playerScore}
                      rank={playerRank}
                      leaderboardSize={leaderboard.length}
                      minWordLength={minWordLength}
                      t={t}
                      variant="mobile"
                    />
                  </div>
                )}

                {/* Desktop: Combo + Score */}
                {isPlaying && (
                  <div
                    className="hidden lg:flex lg:flex-col lg:items-end lg:gap-2 lg:absolute lg:right-4 rtl:lg:right-auto rtl:lg:left-4 lg:top-1/2 lg:-translate-y-1/2 z-30"
                    data-testid="combo-desktop"
                  >
                    <div className="h-[32px] flex items-center justify-end">
                      {comboLevel > 0 ? (
                        <ComboDisplay
                          comboLevel={comboLevel}
                          compact
                          timeRemaining={comboTimeRemaining}
                          isDanger={comboDanger}
                        />
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.5 }}
                          className="text-[10px] text-neo-cream/40 text-right leading-tight max-w-[70px]"
                        >
                          <span className="text-neo-cyan/60">⚡</span>{' '}
                          {t('game.comboHint') || 'Find words fast!'}
                        </motion.div>
                      )}
                    </div>
                    <ScoreDisplay
                      score={playerScore}
                      rank={playerRank}
                      leaderboardSize={leaderboard.length}
                      minWordLength={minWordLength}
                      t={t}
                      variant="desktop"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Word Forming Area */}
          {isPlaying && (
            <div className="flex items-center justify-center flex-shrink-0 mb-0">
              <WordFormingArea
                word={isTypingMode ? typedWord : formedWord}
                letterCount={isTypingMode ? typedWord.length : letterCount}
                feedback={currentFeedback}
                compact
              />
            </div>
          )}

          {/* Tournament Progress Banner */}
          {tournamentData && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-7xl mx-auto mb-1"
            >
              <Card className="bg-neo-pink border-3 border-neo-black shadow-hard">
                <CardContent className="py-1 px-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-neo-lime" />
                      <div>
                        <div className="text-white font-bold text-xs md:text-sm">
                          {tournamentData.name || t('hostView.tournament')}
                        </div>
                        <div className="text-purple-100 text-[10px] md:text-xs">
                          {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} /{' '}
                          {tournamentData.totalRounds || 3}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-neo-black border-white/30 text-[10px] md:text-xs">
                      {t('hostView.tournamentProgress')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Grid */}
          <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
            <GridComponent
              key={isPlaying ? 'playing-grid' : 'spectating-grid'}
              grid={letterGrid}
              interactive={isPlaying && !showStartAnimation}
              animateOnMount={!hasAnimated}
              onWordSubmit={onWordSubmit}
              onWordChange={onWordChange}
              comboLevel={comboLevel}
              hideComboIndicator={true}
              hideWordPreview={true}
              fireRoundActive={fireRoundActive}
              earthquakeShaking={earthquakeState === 'shaking'}
              highlightedPath={
                shouldShowKeyboardTrails(isTypingMode, lastWordFoundTime, totalGamesPlayed)
                  ? highlightedCells
                  : []
              }
              onSingleTapDetected={onSingleTapDetected}
              language={gameLanguage}
            />
          </div>

          {/* Words Remaining (single-player) */}
          {hints?.isSinglePlayer &&
            isPlaying &&
            totalBoardWords !== null &&
            totalBoardWords !== undefined &&
            totalBoardWords > 0 && (
              <div className="flex justify-center flex-shrink-0">
                <WordsRemaining
                  totalWords={totalBoardWords}
                  foundWordsCount={foundWords.filter((fw) => fw.isValid !== false && fw.word.length >= 5).length}
                  t={t}
                  minLength={5}
                />
              </div>
            )}

          {/* Mobile: Split-view with compact leaderboard + words */}
          {isPlaying && !gameplayFocusMode && leaderboard && leaderboard.length > 0 && (
            <div className="block lg:hidden mt-0.5 md:mt-1 space-y-0.5 max-w-md mx-auto lg:max-w-lg md:space-y-1 flex-shrink-0 overflow-hidden max-h-[120px]">
              <CompactLeaderboard
                players={leaderboard.map((p) => ({
                  username: p.username,
                  score: p.score,
                  rank: 0,
                  profilePictureUrl: p.avatar?.profilePictureUrl,
                  avatarEmoji: p.avatar?.emoji,
                  avatarColor: p.avatar?.color,
                }))}
                currentUsername={username}
                t={t}
              />
              <GameWordList foundWords={foundWords} minWordLength={minWordLength} t={t} compact />
            </div>
          )}

          {/* Achievement dock */}
          {children}
        </div>

        {/* Right Column: Leaderboard + Chat (Desktop) */}
        {!gameplayFocusMode && (
          <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 2xl:w-80 gap-2 flex-shrink-0">
            <GameLeaderboard
              leaderboard={deferredLeaderboard}
              username={username}
              isHost={isHost}
              t={t}
              dir={dir}
            />

            {/* Chat Component */}
            <motion.div
              className="hidden lg:block"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <RoomChat
                username={isHost ? 'Host' : username}
                isHost={isHost}
                gameCode={gameCode}
                className="max-h-[150px]"
              />
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
});
