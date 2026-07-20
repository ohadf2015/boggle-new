/**
 * AdventureGameShell — presentational shell wrapping the GameLayout
 * (header/grid/sidebar/overlays) + AdventureTailOverlays sibling.
 * Keeps AdventureGame.tsx lean by absorbing the render tail. Takes the
 * already-grouped bundles (bossOrch, wordSubmit, etc.) to avoid prop sprawl.
 */
import React, { memo } from 'react';
import GameplayBackground from './themed/GameplayBackground';
import { GameHeader, GameSidebar, GameGridArea, GameLayout, GameInfoStrip, AdventureHuntClueBoxes, GameLiveRegion, PrimaryObjectiveBanner } from './ui';
import AdventureGameOverlays, { type AdventureGameOverlaysProps } from './AdventureGameOverlays';
import AdventureTailOverlays from './AdventureTailOverlays';
import { getWorldConfig } from '@/lib/adventure/levelConfig';
import { MAX_EQUIPPED_RUNES } from '@/lib/adventure/runeCatalog';

type Unknown = unknown;

export interface AdventureGameShellProps {
  bossOrch: Unknown & { isBossActive: boolean; showBossIntro: boolean; gridEffectTrigger: unknown; lockedTiles: unknown };
  wordSubmit: Unknown & { mechanicHitCount: unknown; handleWordSubmit: (...a: unknown[]) => unknown; validationFeedback: { error: unknown; isValid: boolean; wasSubmitted: boolean }; lastAccepted: unknown; wordFeedback: unknown; mechanicBonus: unknown; dismissMechanicBonus: () => void };
  gridInteraction: { handleTileSelect: (...a: unknown[]) => unknown; handleDragStart: (...a: unknown[]) => unknown; handleDragEnter: (...a: unknown[]) => unknown; handleDragEnd: (...a: unknown[]) => unknown; handlePauseToggle: () => void };
  modeState: { archetype: string; modeDisplayKey?: string; showMoveCounter?: boolean; showLifeBar?: boolean; showTargetWordUI?: boolean; centerLetterRequired?: boolean; centerLetter: string | null };
  init: { gold: number; xpProgress: { progressPercent: number }; hintData: { level: unknown }; upgradeEffects: { timeFreezeSeconds?: number; canDetonateWords?: boolean }; adjustedLevelConfig: { timerSeconds?: number } };
  gameState: { score: number; comboCount: number; wordsFound: string[] };
  effects: { shakeRef: React.RefObject<HTMLDivElement | null> };
  levelConfig: { world: number; level: number; gridSize: number; themeDisplayKey?: string | null; themedWordCount?: number; themedBonusMultiplier?: number; worldMechanic?: unknown };
  chapterQuests: { quests: unknown[]; progress: Unknown };
  overlayProps: AdventureGameOverlaysProps;
  timerStore: unknown;
  isBossLevel: boolean;
  showLevelComplete: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  entryPhase: string;
  timeRemaining: number;
  effectiveComboTimeout: number;
  masteryAura: unknown;
  currentHP: number | null | undefined;
  maxHP: number | null | undefined;
  movesRemaining: number | undefined;
  themedWordsFound: unknown[];
  upgradeState: Unknown;
  upgradeTriggered: { upgradeId: string; effectValue: number } | null;
  lastWordWasThemed: boolean;
  showRetryAssist: boolean;
  consecutiveFailures: number;
  showAutoHint: boolean;
  currentHint: unknown;
  nextHintCost: number;
  hintGoldPending: boolean;
  freezeUsed: boolean;
  isFrozen: boolean;
  shufflesRemaining: number;
  detonateActive: boolean;
  hasHintsAvailable: boolean;
  minWordLength: number;
  currentWord: string;
  isValidating: boolean;
  tiles: unknown[];
  selectedIndices: number[];
  hintHighlightIndices: number[];
  adjacentIndices: number[];
  pathPoints: unknown[];
  objectives: unknown[];
  huntTargetWord: string | null | undefined;
  huntAttempts: unknown;
  huntFound: boolean;
  bestAttempt: unknown;
  forgeEquippedRunes: unknown[];
  gridRef: React.RefObject<HTMLDivElement | null>;
  handleExitWithConfirm: () => void;
  handleCascadeComplete: () => void;
  handleEntryPhaseComplete: () => void;
  handleHintClick: () => void;
  activateFreeze: (seconds: number) => void;
  shuffleTiles: () => void;
  playBoardShuffleSound?: () => void;
  setDetonateActive: (fn: (prev: boolean) => boolean) => void;
  handleRetryFromAssist: () => void;
  handleRetryWithBonus: () => void;
  handleRetryWithHint: () => void;
  onExit: () => void;
  submitHuntGuess: (word: string) => void;
  t: (key: string) => string;
}

const AdventureGameShell = memo<AdventureGameShellProps>((p) => {
  const {
    bossOrch, wordSubmit, gridInteraction, modeState, init, gameState, effects,
    levelConfig, chapterQuests, overlayProps, timerStore,
    isBossLevel, showLevelComplete, isPaused, isPlaying, entryPhase, timeRemaining,
    effectiveComboTimeout, masteryAura, currentHP, maxHP, movesRemaining,
    themedWordsFound, upgradeState, upgradeTriggered, lastWordWasThemed,
    showRetryAssist, consecutiveFailures,
    showAutoHint, currentHint, nextHintCost, hintGoldPending,
    freezeUsed, isFrozen, shufflesRemaining, detonateActive, hasHintsAvailable,
    minWordLength, currentWord, isValidating,
    tiles, selectedIndices, hintHighlightIndices, adjacentIndices, pathPoints,
    objectives, huntTargetWord, huntAttempts, huntFound, bestAttempt, forgeEquippedRunes,
    gridRef, handleExitWithConfirm, handleCascadeComplete, handleEntryPhaseComplete,
    handleHintClick, activateFreeze, shuffleTiles, playBoardShuffleSound,
    setDetonateActive, handleRetryFromAssist, handleRetryWithBonus, handleRetryWithHint,
    onExit, t,
  } = p;

  return (
    <div ref={effects.shakeRef} data-testid="adventure-game" data-adventure-game role="main" aria-label={t('adventure.game.title')} className="h-full w-full overflow-hidden relative" translate="no" style={{ '--mastery-aura': masteryAura as string } as React.CSSProperties}>
      <GameplayBackground className="absolute inset-0 -z-10" />
      {/* A11y audit (2026-05-01): announces newly found words to screen readers */}
      <GameLiveRegion wordsFound={gameState.wordsFound} score={gameState.score} />
      <GameLayout
        isBossActive={isBossLevel && bossOrch.isBossActive && !bossOrch.showBossIntro && !showLevelComplete}
        belowHeader={
          <>
            {/* Primary-goal strip — mobile-only clarity (desktop shows full list in sidebar).
                Hidden during active boss combat and hunt mode, which have their own goal UI. */}
            {!(isBossLevel && bossOrch.isBossActive) && !modeState.showTargetWordUI && (
              <PrimaryObjectiveBanner objectives={objectives as never} className="lg:hidden" />
            )}
            {modeState.showTargetWordUI && huntTargetWord && huntTargetWord.length > 0 ? (
              <div className="lg:hidden px-3 py-2 bg-neo-navy/70 border-b-2 border-neo-black/30">
                <AdventureHuntClueBoxes
                  targetLength={huntTargetWord.length}
                  attempts={huntAttempts as never}
                  huntFound={huntFound}
                />
              </div>
            ) : null}
          </>
        }
        header={
          <GameHeader worldNumber={levelConfig.world} levelNumber={levelConfig.level}
            score={gameState.score} timerStore={timerStore as never} isPaused={isPaused}
            onPauseToggle={gridInteraction.handlePauseToggle} onExit={handleExitWithConfirm}
            gold={init.gold} xpProgress={init.xpProgress.progressPercent / 100}
            isBossLevel={isBossLevel} elapsedTime={isBossLevel ? timeRemaining : undefined}
            comboCount={gameState.comboCount} comboTimeoutMs={effectiveComboTimeout}
            modeDisplayKey={modeState.archetype !== 'classic' ? modeState.modeDisplayKey : undefined}
            showMoveCounter={modeState.showMoveCounter} movesRemaining={movesRemaining}
            showLifeBar={modeState.showLifeBar} currentHP={currentHP ?? undefined} maxHP={maxHP ?? undefined}
            infoStrip={
              (levelConfig.themeDisplayKey || (levelConfig.worldMechanic && !(isBossLevel && bossOrch.isBossActive)) || (upgradeState && Object.keys(upgradeState).length > 0)) ? (
                <GameInfoStrip
                  themeDisplayKey={levelConfig.themeDisplayKey ?? undefined}
                  themedWordsFound={themedWordsFound.length}
                  themedWordCount={levelConfig.themedWordCount ?? 0}
                  themedBonusMultiplier={levelConfig.themedBonusMultiplier ?? 1}
                  worldColorPrimary={getWorldConfig(levelConfig.world).colorPrimary}
                  mechanic={!(isBossLevel && bossOrch.isBossActive) ? ((levelConfig.worldMechanic as never) ?? null) : null}
                  mechanicHitCount={wordSubmit.mechanicHitCount as never}
                  upgradeState={upgradeState as never}
                  upgradeTriggered={upgradeTriggered}
                />
              ) : undefined
            } />
        }
        gridArea={
          <GameGridArea tiles={tiles as never} gridSize={levelConfig.gridSize}
            selectedIndices={selectedIndices} onTileSelect={gridInteraction.handleTileSelect as never}
            onWordSubmit={wordSubmit.handleWordSubmit as never}
            onDragStart={gridInteraction.handleDragStart as never} onDragEnter={gridInteraction.handleDragEnter as never} onDragEnd={gridInteraction.handleDragEnd as never}
            gridRef={gridRef}
            isInteractive={entryPhase === 'playing' && isPlaying && !isPaused}
            isDisabled={entryPhase !== 'playing' || !isPlaying || isPaused}
            entryPhase={entryPhase as never} showCascade={entryPhase === 'cascade'}
            onCascadeComplete={handleCascadeComplete}
            hintHighlightIndices={hintHighlightIndices} adjacentIndices={adjacentIndices} pathPoints={pathPoints as never}
            validationError={wordSubmit.validationFeedback.error as never}
            isValidating={isValidating}
            isWordValid={wordSubmit.validationFeedback.isValid}
            wasWordSubmitted={wordSubmit.validationFeedback.wasSubmitted}
            lastAccepted={wordSubmit.lastAccepted as never}
            selectedLength={selectedIndices.length} minWordLength={minWordLength}
            wordFeedback={wordSubmit.wordFeedback as never}
            currentWord={currentWord}
            worldId={levelConfig.world}
            centerLetter={modeState.centerLetterRequired ? modeState.centerLetter : null}
            hintLevel={init.hintData.level as never}
            bossGridEffect={bossOrch.gridEffectTrigger as never}
            lockedTileIndices={bossOrch.lockedTiles as never} />
        }
        sidebar={
          <GameSidebar objectives={objectives as never}
            showLifeBar={modeState.showLifeBar} currentHP={currentHP ?? undefined} maxHP={maxHP ?? undefined}
            showTargetWordUI={modeState.showTargetWordUI} huntTargetLength={huntTargetWord?.length ?? 0}
            huntAttempts={huntAttempts as never} huntFound={huntFound}
            showSlideIn={entryPhase === 'objectives'} onSlideInComplete={handleEntryPhaseComplete}
            hasHintsAvailable={hasHintsAvailable} onHintClick={handleHintClick}
            showAutoHint={showAutoHint} currentHint={currentHint as never}
            hintLevel={init.hintData.level as never}
            nextHintCost={nextHintCost}
            hintGoldPending={hintGoldPending}
            freezeSeconds={init.upgradeEffects.timeFreezeSeconds}
            freezeUsed={freezeUsed}
            isFrozen={isFrozen}
            onFreezeClick={() => activateFreeze(init.upgradeEffects.timeFreezeSeconds ?? 0)}
            shufflesRemaining={shufflesRemaining}
            onShuffleClick={() => { shuffleTiles(); playBoardShuffleSound?.(); }}
            canDetonate={init.upgradeEffects.canDetonateWords}
            detonateActive={detonateActive}
            onDetonateToggle={() => setDetonateActive(prev => !prev)}
            chapterQuests={chapterQuests.quests as never}
            chapterQuestProgress={chapterQuests.progress as never}
            className="border-b-2 lg:border-b-0 lg:border-s-2 border-neo-black/30" />
        }
        overlays={<AdventureGameOverlays {...overlayProps} />}
      />
      <AdventureTailOverlays
        archetype={modeState.archetype}
        currentHP={currentHP}
        movesRemaining={movesRemaining}
        isPlaying={isPlaying}
        upgradeTriggered={upgradeTriggered}
        lastWordWasThemed={lastWordWasThemed}
        themedBonusMultiplier={levelConfig.themedBonusMultiplier}
        mechanicBonus={wordSubmit.mechanicBonus as never}
        dismissMechanicBonus={wordSubmit.dismissMechanicBonus}
        bossActive={isBossLevel && bossOrch.isBossActive}
        showRetryAssist={showRetryAssist}
        consecutiveFailures={consecutiveFailures}
        wordsFoundCount={gameState.wordsFound.length}
        score={gameState.score}
        bestAttempt={bestAttempt as never}
        objectives={objectives as never}
        onRetryFromAssist={handleRetryFromAssist}
        onRetryWithBonus={handleRetryWithBonus}
        onRetryWithHint={handleRetryWithHint}
        onExit={onExit}
        forgeEquippedRunes={forgeEquippedRunes as never}
        maxRuneSlots={MAX_EQUIPPED_RUNES}
      />
    </div>
  );
});

AdventureGameShell.displayName = 'AdventureGameShell';

export default AdventureGameShell;
