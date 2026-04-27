/**
 * AdventureGameOverlays — Extracted overlay/cinematic JSX from AdventureGame.
 * Pure presentational: receives all data via props, no hooks.
 */
import React, { memo } from 'react';
import FlashChallengeToast from './FlashChallengeToast';
import LevelCompleteModal from './LevelCompleteModal';
import LootChestReveal from './LootChestReveal';
import LevelEntryOverlay from './LevelEntryOverlay';
import { BossOverlay, PlayerHealthBar } from './boss';
import { StoryBeatCard } from './StoryBeatCard';
import AdventureEffectsLayerFull, { AdventureEffectsLayer as EdgeVignetteLayer, type ChainBurstConfig, type ParticleConfig, type ScorePopupData, type PendingExplosion } from './effects/AdventureEffectsLayer';
import { PauseOverlay } from './ui';
import { VICTORY_DURATION_FRAMES, DEFEAT_DURATION_FRAMES, WORLD_UNLOCK_DURATION_FRAMES } from './cinematics/constants';
import dynamic from 'next/dynamic';
import type { LevelObjective, LevelAttempt, FlashChallenge, AdventureGameState, LootDrop } from '@/types/adventure';
import type { BossConfig, BossHealthState } from '@/types/boss';
import type { EffectCallbacks } from '@/hooks/useBossEffectExecutor';
import type { PlayerHealthState } from '@/hooks/usePlayerHealth';
import type { WorldUnlockCinematicProps } from './cinematics/WorldUnlockCinematic';
import type { StoryBeat } from '@/lib/adventure/storyConfig';
import type { LexiReaction as LexiReactionData } from '@/hooks/useLexiReactions';
import type { LevelUpPayload } from '@/components/education/LevelUpCelebration';
import type { ComboMilestoneConfig } from '@/hooks/useComboMilestone';
import type { BossTier } from '@/components/celebration/BossDefeatFireworks';

const VictoryCinematic = dynamic(() => import('./cinematics/VictoryCinematic').then(mod => ({ default: mod.VictoryCinematic as React.ComponentType<any> })), { ssr: false });
const DefeatCinematic = dynamic(() => import('./cinematics/DefeatCinematic').then(mod => ({ default: mod.DefeatCinematic as React.ComponentType<any> })), { ssr: false });
const WorldUnlockCinematic = dynamic(() => import('./cinematics/WorldUnlockCinematic').then(mod => ({ default: mod.WorldUnlockCinematic as React.ComponentType<any> })), { ssr: false });
const CinematicPlayer = dynamic(() => import('./boss/cinematics/CinematicPlayer').then(mod => ({ default: mod.CinematicPlayer })), { ssr: false });

export interface AdventureGameOverlaysProps {
  // Boss overlay
  bossConfig: BossConfig | null;
  bossTaunt: string | null;
  showBossIntro: boolean;
  handleBossIntroStart: () => void;
  handleBossIntroSkip?: () => void;
  bossHealthState: BossHealthState;
  bossEffectCallbacks: EffectCallbacks;
  isBossLevel: boolean;
  isBossActive: boolean;
  showBossFireworks: boolean;
  defeatedBossTier: BossTier | null;
  showEdgeVignette: boolean;
  playerHealthState: PlayerHealthState;
  // Game state
  showLevelComplete: boolean;
  gameStars: number;
  gameScore: number;
  wordsFound: string[];
  gameState: AdventureGameState;
  // Handlers
  handleContinue: () => void;
  handleRetry: () => void;
  onExit: () => void;
  handleCinematicComplete: () => void;
  handlePauseToggle: () => void;
  handleEntryPhaseComplete: () => void;
  handleStoryBeatContinue: () => void;
  handleLootChestComplete: () => void;
  handlePopupComplete: () => void;
  // Flash challenge
  activeChallenge: FlashChallenge | null;
  isChallengeComplete: boolean;
  isChallengeFailed?: boolean;
  dismissChallenge: () => void;
  challengeTimeLeft: number;
  // Pause
  isPaused: boolean;
  // Entry
  entryPhase: string;
  // Level config
  levelNumber: number;
  worldNumber: number;
  // Cinematics
  showVictoryCinematic: boolean;
  showDefeatCinematic: boolean;
  showWorldUnlockCinematic: boolean;
  worldUnlockProps: WorldUnlockCinematicProps | null;
  timeRemaining: number;
  t: (key: string) => string;
  // Loot
  showLootChest: boolean;
  lootDrops: LootDrop[];
  // Level complete modal (non-boss)
  objectives: LevelObjective[];
  totalStars?: number;
  bestAttempt: LevelAttempt | null;
  previousBestStars: number;
  earnedXp: number;
  earnedGold: number;
  isLastLevelOfWorld: boolean;
  onNextWorld?: () => void;
  retriesUsed: number;
  freeRetriesPerWorld: number;
  // Save state
  saveFailed?: boolean;
  onRetrySave?: () => void;
  // Story beat
  storyBeat: StoryBeat | null;
  showStoryBeat: boolean;
  // Effects layer
  currentPopup: ScorePopupData | null;
  scoreDisplayRef: React.RefObject<HTMLDivElement | null>;
  reaction: LexiReactionData | null;
  dismissReaction: () => void;
  chainBurstConfig: ChainBurstConfig | null;
  setChainBurstConfig: (v: ChainBurstConfig | null) => void;
  particleConfig: ParticleConfig | null;
  setParticleConfig: (v: ParticleConfig | null) => void;
  pendingExplosions: PendingExplosion[];
  removeExplosion: (id: number) => void;
  levelUpData: LevelUpPayload | null;
  handleLevelUpClose: () => void;
  currentMilestone: ComboMilestoneConfig | null;
  streakMilestone?: { days: number; rewardGold: number; titleKey: string } | null;
  /** Mode-specific stats for blast/hunt/wheel completion display */
  modeStats?: { archetype: string; movesRemaining?: number; movesTotal?: number; huntAttempts?: number; huntFound?: boolean; centerLetterWords?: number; totalWords?: number } | null;
}

const AdventureGameOverlays = memo<AdventureGameOverlaysProps>(({
  bossConfig, bossTaunt, showBossIntro, handleBossIntroStart, handleBossIntroSkip,
  bossHealthState, bossEffectCallbacks, isBossLevel, isBossActive,
  showBossFireworks, defeatedBossTier, showEdgeVignette, playerHealthState,
  showLevelComplete, gameStars, gameScore, wordsFound, gameState,
  handleContinue, handleRetry, onExit, handleCinematicComplete, handlePauseToggle,
  handleEntryPhaseComplete, handleStoryBeatContinue, handleLootChestComplete, handlePopupComplete,
  activeChallenge, isChallengeComplete, isChallengeFailed, dismissChallenge, challengeTimeLeft,
  isPaused, entryPhase, levelNumber, worldNumber,
  showVictoryCinematic, showDefeatCinematic, showWorldUnlockCinematic, worldUnlockProps,
  timeRemaining, t,
  showLootChest, lootDrops,
  objectives, totalStars, bestAttempt, previousBestStars, earnedXp, earnedGold, isLastLevelOfWorld, onNextWorld,
  retriesUsed, freeRetriesPerWorld, saveFailed, onRetrySave,
  storyBeat, showStoryBeat,
  currentPopup, scoreDisplayRef, reaction, dismissReaction,
  chainBurstConfig, setChainBurstConfig, particleConfig, setParticleConfig,
  pendingExplosions, removeExplosion, levelUpData, handleLevelUpClose, currentMilestone, streakMilestone, modeStats,
}) => (
  <>
    <BossOverlay boss={bossConfig}
      currentTaunt={bossTaunt}
      showTaunt={!!bossTaunt}
      showIntro={showBossIntro}
      onStartBattle={handleBossIntroStart}
      onSkipIntro={handleBossIntroSkip}
      showVictory={showLevelComplete && bossHealthState.phase === 'victory'}
      showDefeat={showLevelComplete && (bossHealthState.phase === 'defeat' || playerHealthState.isDead)}
      stars={gameStars as 0 | 1 | 2 | 3} score={gameScore}
      wordsFound={wordsFound} gameState={gameState}
      onContinue={handleContinue} onRetry={handleRetry}
      worldNumber={worldNumber}
      healthState={bossHealthState}
      effectCallbacks={bossEffectCallbacks} />

    {isBossLevel && isBossActive && !showBossIntro && !showLevelComplete && !playerHealthState.isDead && (
      <div className="fixed bottom-[calc(4.5rem+var(--admob-banner-height,0px))] sm:bottom-[calc(6rem+var(--admob-banner-height,0px))] lg:bottom-[calc(1rem+var(--admob-banner-height,0px))] left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-md">
        <PlayerHealthBar healthState={playerHealthState} />
      </div>
    )}

    {activeChallenge && (
      <FlashChallengeToast
        challenge={activeChallenge}
        isComplete={isChallengeComplete}
        isFailed={isChallengeFailed}
        onDismiss={dismissChallenge}
        timeLeft={challengeTimeLeft}
      />
    )}

    <PauseOverlay isOpen={isPaused && !showLevelComplete}
      onResume={handlePauseToggle} onRestart={handleRetry} onExit={onExit} />

    <LevelEntryOverlay levelNumber={levelNumber} worldNumber={worldNumber}
      isVisible={entryPhase === 'title'} onComplete={handleEntryPhaseComplete} />

    {showVictoryCinematic && (
      <CinematicPlayer
        composition={VictoryCinematic as unknown as React.ComponentType<Record<string, unknown>>}
        compositionProps={{
          starsEarned: gameStars, wordsFound: wordsFound.length,
          finalScore: gameScore, timeRemaining,
          titleText: t('adventure.cinematic.victory'),
          statLabels: { wordsFound: t('adventure.cinematic.wordsFound'), finalScore: t('adventure.cinematic.score'), timeRemaining: t('adventure.cinematic.timeLeft') },
          starsLabel: t('adventure.cinematic.stars'),
        }}
        durationSeconds={VICTORY_DURATION_FRAMES / 30} onComplete={handleCinematicComplete}
        fallbackType="victory" />
    )}

    {showDefeatCinematic && (
      <CinematicPlayer
        composition={DefeatCinematic as unknown as React.ComponentType<Record<string, unknown>>}
        compositionProps={{
          wordsFound: wordsFound.length,
          bestWord: wordsFound.reduce((best, word) => word.length > best.length ? word : best, ''),
          finalScore: gameScore,
          titleText: t('adventure.cinematic.defeat'),
          encourageText: t('adventure.cinematic.encourageText'),
          encourageSubtext: t('adventure.cinematic.encourageSubtext'),
          statLabels: { wordsFound: t('adventure.cinematic.wordsFound'), finalScore: t('adventure.cinematic.score'), bestWord: t('adventure.cinematic.bestWord') },
        }}
        durationSeconds={DEFEAT_DURATION_FRAMES / 30} onComplete={handleCinematicComplete}
        fallbackType="defeat" />
    )}

    {showWorldUnlockCinematic && worldUnlockProps && (
      <CinematicPlayer
        composition={WorldUnlockCinematic as unknown as React.ComponentType<Record<string, unknown>>}
        compositionProps={worldUnlockProps as unknown as Record<string, unknown>}
        durationSeconds={WORLD_UNLOCK_DURATION_FRAMES / 30}
        onComplete={handleCinematicComplete}
        fallbackType="victory" />
    )}

    <LootChestReveal
      isOpen={showLootChest}
      drops={lootDrops}
      onComplete={handleLootChestComplete}
      chestTier={gameStars >= 3 ? 'golden' : gameStars >= 2 ? 'silver' : 'wooden'}
    />

    {!isBossLevel && (
      <LevelCompleteModal isOpen={showLevelComplete}
        stars={gameStars as 0 | 1 | 2 | 3} score={gameScore} objectives={objectives}
        levelNumber={levelNumber} worldNumber={worldNumber}
        onContinue={handleContinue} onRetry={handleRetry} onExit={onExit}
        totalStars={totalStars} bestAttempt={bestAttempt} previousBestStars={previousBestStars}
        xpEarned={earnedXp} goldEarned={earnedGold}
        isLastLevelOfWorld={isLastLevelOfWorld}
        onNextWorld={onNextWorld}
        canRetryFree={retriesUsed < freeRetriesPerWorld}
        saveFailed={saveFailed} onRetrySave={onRetrySave}
        bestWord={wordsFound.reduce((best, word) => word.length > best.length ? word : best, '')}
        wordsFoundCount={wordsFound.length}
        streakMilestone={streakMilestone}
        modeStats={modeStats} />
    )}

    {storyBeat && (
      <StoryBeatCard
        worldId={worldNumber}
        characterName={t(storyBeat.characterKey)}
        dialogueKey={storyBeat.dialogueKey}
        isVisible={showStoryBeat}
        onContinue={handleStoryBeatContinue}
      />
    )}

    <EdgeVignetteLayer showEdgeVignetteFlash={showEdgeVignette} />

    <AdventureEffectsLayerFull currentPopup={currentPopup}
      onPopupComplete={handlePopupComplete} scoreDisplayRef={scoreDisplayRef}
      reaction={reaction} onDismissReaction={dismissReaction}
      chainBurstConfig={chainBurstConfig}
      onChainBurstComplete={() => setChainBurstConfig(null)}
      world={worldNumber} particleConfig={particleConfig}
      onParticleComplete={() => setParticleConfig(null)}
      pendingExplosions={pendingExplosions}
      onExplosionComplete={removeExplosion}
      levelUpData={levelUpData}
      onLevelUpClose={handleLevelUpClose}
      currentMilestone={currentMilestone}
      isBossLevel={isBossLevel}
      showBossFireworks={showBossFireworks}
      defeatedBossTier={defeatedBossTier} />
  </>
));

AdventureGameOverlays.displayName = 'AdventureGameOverlays';

export default AdventureGameOverlays;
