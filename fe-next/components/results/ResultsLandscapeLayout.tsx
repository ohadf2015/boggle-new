'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Trophy, Star, DoorOpen, Check, Play } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import RoomChat from '@/components/RoomChat';
import type { PlayerResult, XpGainedData, LevelUpData } from '@/types/components';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import { GameModeSelector, type GameModeOption } from '@/components/GameModeSelector';

// Dynamic imports for components
const ResultsWinnerBanner = dynamic(() => import('@/components/results/ResultsWinnerBanner'), { ssr: false });
const ResultsPlayerCard = dynamic(() => import('@/components/results/ResultsPlayerCard'), { ssr: false });
const NextStepPrompt = dynamic(() => import('@/components/results/NextStepPrompt'), { ssr: false });

export interface ResultsLandscapeLayoutProps {
  // Player Data
  sortedScores: PlayerResult[];
  winner: PlayerResult | null;
  username: string;
  currentUsername: string;

  // Game Info
  gameCode?: string;
  isHost: boolean;
  isBotsOnlyGame: boolean;

  // Player State
  isCurrentPlayerReady: boolean;
  readyUsernames: string[];

  // Actions
  onReturnToRoom?: () => void;
  onExitRoom: () => void;
  onStartGame: () => void;
  onMarkReady: () => void;

  // Exit Confirmation
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  onConfirmExit: () => void;

  // Player Words & Archetypes
  allPlayerWords: Record<string, Array<{
    word: string;
    score: number;
    validated: boolean;
    isDuplicate: boolean;
    comboBonus?: number;
    fireRoundBonus?: number;
    isAiVerified?: boolean;
    isPendingValidation?: boolean;
    potentialScore?: number;
    invalidReason?: string;
    aiReason?: string;
  }>>;
  playerArchetypes: Map<string, PlayerArchetype>;

  // XP Data
  xpGainedData: XpGainedData | null;
  levelUpData: LevelUpData | null;

  // Rules
  duplicateRuleDisabled?: boolean;

  // Utilities
  normalizeUsername: (name: string | undefined | null) => string;

  // Overlay modals (rendered outside layout but need to be passed through)
  overlayModals: React.ReactNode;

  // Translation
  t: (key: string) => string;

  // Game mode override (host only)
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
}

/**
 * Landscape-mode layout for ResultsPage
 * Two-column design: Winner/Actions on left, Player cards on right
 */
export function ResultsLandscapeLayout({
  sortedScores,
  winner,
  username,
  currentUsername,
  gameCode,
  isHost,
  isBotsOnlyGame,
  isCurrentPlayerReady,
  readyUsernames,
  onReturnToRoom,
  onExitRoom,
  onStartGame,
  onMarkReady,
  showExitConfirm,
  setShowExitConfirm,
  onConfirmExit,
  allPlayerWords,
  playerArchetypes,
  xpGainedData,
  levelUpData,
  duplicateRuleDisabled,
  normalizeUsername,
  overlayModals,
  t,
  selectedGameMode,
  onSelectGameMode,
}: ResultsLandscapeLayoutProps) {
  return (
    <>
      {overlayModals}
      <div className="flex h-screen w-full overflow-hidden bg-neo-navy text-neo-cream p-3 gap-3 landscape-full-height">
      {/* Left column: Winner Banner + Action Buttons (Hero Area) */}
      <div className="w-[55%] flex flex-col items-center justify-center gap-4 p-4 border-2 border-neo-black rounded-neo bg-white/5 shadow-hard-sm">
        {/* Winner Banner - prominent */}
        {winner && (
          <div className="w-full max-w-sm">
            <ResultsWinnerBanner winner={winner} isCurrentUserWinner={normalizeUsername(winner.username) === normalizeUsername(username)} />
          </div>
        )}

        {/* Action Buttons - prominent placement */}
        {gameCode && onReturnToRoom && (
          isBotsOnlyGame ? (
            /* Bots-only game: Suggest Brain Training */
            <NextStepPrompt
              currentMode="multiplayer-bots"
              onBackToLobby={onExitRoom}
              variant="landscape"
              className="w-full max-w-xs"
            />
          ) : (
            <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
              {isHost ? (
                /* HOST: Game Mode Selector + Start Game button */
                <>
                  {selectedGameMode !== undefined && onSelectGameMode && (
                    <div className="w-full bg-neo-navy-light/50 border-2 border-neo-white/10 rounded-neo p-2">
                      <p className="text-[9px] font-black uppercase text-neo-cream/50 tracking-widest mb-1.5">
                        {t('gameModes.nextMode')}
                      </p>
                      <GameModeSelector
                        selectedMode={selectedGameMode}
                        onSelectMode={onSelectGameMode}
                        t={t}
                        showRandom
                        compact
                      />
                    </div>
                  )}
                  <button
                    onClick={onStartGame}
                    className="w-full bg-neo-green text-neo-black font-black text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    {t('hostView.startGame')}
                  </button>
                  <button
                    onClick={onExitRoom}
                    className="w-full bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
                  >
                    <DoorOpen className="w-4 h-4" />
                    {t('results.leaveRoom')}
                  </button>
                </>
              ) : isCurrentPlayerReady ? (
                /* PLAYER: Ready state */
                <>
                  <button
                    onClick={onReturnToRoom}
                    disabled
                    className="w-full bg-neo-green/80 text-neo-black font-bold text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2 cursor-default"
                  >
                    <Check className="w-5 h-5" />
                    {t('results.ready')}
                  </button>
                  <button
                    onClick={onExitRoom}
                    className="w-full bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
                  >
                    <DoorOpen className="w-4 h-4" />
                    {t('results.leaveRoom')}
                  </button>
                </>
              ) : (
                /* PLAYER: Not ready state */
                <>
                  <div className="space-y-1">
                    <button
                      onClick={onMarkReady}
                      className="w-full bg-neo-lime text-neo-black font-black text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Star className="w-5 h-5" />
                      {t('results.imReady')}
                    </button>
                    <p className="text-center text-[10px] text-neo-cream/50">
                      {t('results.readyExplanation')}
                    </p>
                  </div>
                  <button
                    onClick={onExitRoom}
                    className="w-full bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
                  >
                    <DoorOpen className="w-4 h-4" />
                    {t('results.leaveRoom')}
                  </button>
                </>
              )}
            </div>
          )
        )}

        {/* Single player exit button */}
        {!gameCode && (
          <button
            onClick={onExitRoom}
            className="w-full max-w-xs bg-neo-blue text-white font-bold text-sm py-3 px-4 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('results.playAgain')}
          </button>
        )}
      </div>

      {/* Right column: Player Cards + Chat */}
      <div className="w-[45%] flex flex-col gap-2 p-3 border-2 border-neo-black rounded-neo bg-white/5 shadow-hard-sm">
        {/* Header: Final Scores + Ready indicator */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neo-yellow" />
            <h2 className="text-base font-black text-neo-cream uppercase tracking-wide">{t('results.finalScores')}</h2>
          </div>
          {/* Compact ready indicator */}
          {gameCode && sortedScores.length > 1 && (
            <span className="text-xs font-bold text-neo-cream/70 bg-neo-lime/30 px-2 py-1 rounded-full">
              {readyUsernames.length}/{sortedScores.length} {t('results.ready')}
            </span>
          )}
        </div>

        {/* Player Cards - scrollable */}
        <div className="space-y-2 flex-1 overflow-y-auto scrollable-area min-h-0 pr-1">
          {sortedScores.map((player, index) => (
            <ResultsPlayerCard
              key={player.username}
              player={player}
              index={index}
              allPlayerWords={allPlayerWords}
              currentUsername={currentUsername}
              isWinner={index === 0}
              xpGainedData={normalizeUsername(player.username) === normalizeUsername(username) ? xpGainedData : null}
              levelUpData={normalizeUsername(player.username) === normalizeUsername(username) ? levelUpData : null}
              duplicateRuleDisabled={duplicateRuleDisabled}
              archetype={playerArchetypes.get(player.username) || null}
            />
          ))}
        </div>

        {/* Room Chat - bottom of right column */}
        {gameCode && sortedScores.length > 1 && (
          <div className="pt-2 border-t-2 border-white/10">
            <RoomChat
              username={username}
              isHost={isHost}
              gameCode={gameCode}
              className="max-h-[120px]"
            />
          </div>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title={t('playerView.exitConfirmation')}
        description={t('results.exitWarning')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={onConfirmExit}
        variant="default"
      />
      </div>
    </>
  );
}

export default ResultsLandscapeLayout;
