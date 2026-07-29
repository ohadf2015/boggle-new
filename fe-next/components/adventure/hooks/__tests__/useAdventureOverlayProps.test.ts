/**
 * useAdventureOverlayProps — returns spreadable props for AdventureGameOverlays.
 * Tests focus on the assembly logic: onRetrySave wiring + modeStats derivation.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as offlineQueue from '@/lib/adventure/offlineCompletionQueue';
import { useAdventureOverlayProps } from '../useAdventureOverlayProps';

const makeParams = (overrides: Partial<Parameters<typeof useAdventureOverlayProps>[0]> = {}) => {
  const saveCompletionToDb = vi.fn().mockResolvedValue(true);
  const completionSaveFailedRef = { current: true };
  const completionSavedRef = { current: false };
  const base: Parameters<typeof useAdventureOverlayProps>[0] = {
    bossOrch: {
      bossConfig: null, bossTaunt: null, showBossIntro: false,
      handleBossIntroStart: vi.fn(), handleBossIntroSkip: vi.fn(),
      bossHealthState: {} as never, bossEffectCallbacks: {} as never,
      isBossActive: false, showBossFireworks: false, defeatedBossTier: null,
      showEdgeVignette: false, playerHealthState: {} as never,
    },
    cinematics: {
      showVictoryCinematic: false, showDefeatCinematic: false,
      showWorldUnlockCinematic: false, worldUnlockProps: null,
    },
    effects: {
      currentPopup: null, scoreDisplayRef: { current: null },
      reaction: null, dismissReaction: vi.fn(),
      chainBurstConfig: null, setChainBurstConfig: vi.fn(),
      particleConfig: null, setParticleConfig: vi.fn(),
      pendingExplosions: [], removeExplosion: vi.fn(),
    },
    levelCompletion: {
      lootDrops: [], earnedXp: 10, earnedGold: 5,
      levelUpData: null, handleLevelUpClose: vi.fn(),
      completionSaveFailedRef, completionSavedRef,
    },
    flashChallenge: {
      activeChallenge: null, isChallengeComplete: false,
      isChallengeFailed: false, dismiss: vi.fn(), challengeTimeLeft: 0,
    },
    gameState: {
      stars: 2, score: 500, wordsFound: ['CAT', 'DOG', 'LONGWORD'],
      movesRemaining: 3, huntAttempts: [], huntFound: false,
    } as never,
    modeState: {
      archetype: 'classic', movesLimit: 10,
      centerLetterRequired: false, centerLetter: null,
    } as never,
    init: {
      hintData: { level: 0 },
      upgradeEffects: { freeRetriesPerWorld: 2 },
      adjustedLevelConfig: { timerSeconds: 120 },
      currentMilestone: null,
    } as never,
    isBossLevel: false,
    showLevelComplete: true,
    showLootChest: false,
    showStoryBeat: false,
    storyBeat: null,
    isPaused: false,
    entryPhase: 'playing',
    levelConfig: { world: 1, level: 3 } as never,
    timeRemaining: 60,
    retriesUsed: 1,
    objectives: [],
    totalStars: 0,
    bestAttempt: null,
    previousBestStars: 0,
    streakMilestone: null,
    isGuest: false,
    isLastLevelOfWorld: false,
    t: (k: string) => k,
    saveCompletionToDb,
    handleContinue: vi.fn(), handleRetry: vi.fn(), onExit: vi.fn(),
    handleCinematicComplete: vi.fn(), handlePauseToggle: vi.fn(),
    handleEntryPhaseComplete: vi.fn(), handleStoryBeatContinue: vi.fn(),
    handleLootChestComplete: vi.fn(), handlePopupComplete: vi.fn(),
    onNextWorld: vi.fn(),
  };
  return { ...base, ...overrides } as typeof base;
};

describe('useAdventureOverlayProps', () => {
  beforeEach(() => {
    vi.spyOn(offlineQueue, 'peekQueue').mockReturnValue([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a spreadable object with core overlay props', () => {
    const params = makeParams();
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    expect(result.current.showLevelComplete).toBe(true);
    expect(result.current.gameScore).toBe(500);
    expect(result.current.gameStars).toBe(2);
    expect(result.current.wordsFound).toEqual(['CAT', 'DOG', 'LONGWORD']);
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.freeRetriesPerWorld).toBe(2);
    expect(result.current.levelNumber).toBe(3);
    expect(result.current.worldNumber).toBe(1);
  });

  it('modeStats is null for classic archetype', () => {
    const { result } = renderHook(() => useAdventureOverlayProps(makeParams()));
    expect(result.current.modeStats).toBeNull();
  });

  it('modeStats is null for boss archetype', () => {
    const params = makeParams({
      modeState: { archetype: 'boss', movesLimit: 0, centerLetterRequired: false, centerLetter: null } as never,
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    expect(result.current.modeStats).toBeNull();
  });

  it('modeStats populated for blast archetype', () => {
    const params = makeParams({
      modeState: { archetype: 'blast', movesLimit: 10, centerLetterRequired: false, centerLetter: null } as never,
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    expect(result.current.modeStats).toMatchObject({
      archetype: 'blast',
      movesRemaining: 3,
      movesTotal: 10,
      totalWords: 3,
    });
  });

  it('modeStats counts centerLetterWords when required', () => {
    const params = makeParams({
      modeState: { archetype: 'wheel', movesLimit: 0, centerLetterRequired: true, centerLetter: 'o' } as never,
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    // 'DOG' and 'LONGWORD' contain 'o'
    expect(result.current.modeStats?.centerLetterWords).toBe(2);
  });

  it('saveFailed gates on guest + save-failed ref + showLevelComplete', () => {
    const failRef = { current: true };
    const params = makeParams({
      isGuest: false,
      showLevelComplete: true,
      levelCompletion: { ...makeParams().levelCompletion, completionSaveFailedRef: failRef },
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    expect(result.current.saveFailed).toBe(true);
  });

  it('saveFailed is false when guest', () => {
    const failRef = { current: true };
    const params = makeParams({
      isGuest: true,
      levelCompletion: { ...makeParams().levelCompletion, completionSaveFailedRef: failRef },
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    expect(result.current.saveFailed).toBe(false);
  });

  it('saveFailed is suppressed when the offline queue has pending items', () => {
    // The save was queued for offline replay — the system will retry it.
    // Showing "Progress not saved" here would be a false alarm.
    vi.spyOn(offlineQueue, 'peekQueue').mockReturnValue([
      {
        world: 1, level: 3, stars: 2, score: 500, words: 8,
        queuedAt: Date.now(),
      },
    ]);
    const failRef = { current: true };
    const params = makeParams({
      isGuest: false,
      showLevelComplete: true,
      levelCompletion: { ...makeParams().levelCompletion, completionSaveFailedRef: failRef },
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    expect(result.current.saveFailed).toBe(false);
  });

  it('onRetrySave calls saveCompletionToDb with computed longWords/timePlayed', async () => {
    const saveSpy = vi.fn().mockResolvedValue(true);
    const params = makeParams({
      saveCompletionToDb: saveSpy,
      timeRemaining: 50, // timerSeconds 120 → timePlayed 70
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    await act(async () => { await result.current.onRetrySave?.(); });
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const args = saveSpy.mock.calls[0];
    // world, level, stars, score, wordsCount, gold, longWords, words, flashGold?, timePlayed
    expect(args[0]).toBe(1);
    expect(args[1]).toBe(3);
    expect(args[2]).toBe(2);
    expect(args[3]).toBe(500);
    expect(args[4]).toBe(3);
    expect(args[5]).toBe(5);
    expect(args[6]).toBe(1); // only 'LONGWORD' is length ≥ 6
    expect(args[9]).toBe(70);
  });

  it('onRetrySave clears fail ref + sets saved ref on success', async () => {
    const failRef = { current: true };
    const savedRef = { current: false };
    const params = makeParams({
      saveCompletionToDb: vi.fn().mockResolvedValue(true),
      levelCompletion: {
        ...makeParams().levelCompletion,
        completionSaveFailedRef: failRef,
        completionSavedRef: savedRef,
      },
    });
    const { result } = renderHook(() => useAdventureOverlayProps(params));
    await act(async () => { await result.current.onRetrySave?.(); });
    expect(failRef.current).toBe(false);
    expect(savedRef.current).toBe(true);
  });
});
