import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWordHuntFx } from '../useWordHuntFx';
import type { SurvivalGameState } from '../useSurvivalGameLogic';

const haptics = vi.hoisted(() => ({ hapticError: vi.fn(), hapticWordAccepted: vi.fn() }));
vi.mock('@/utils/haptics', () => haptics);
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const triggerReward = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useGameRewards', () => ({ useGameRewards: () => ({ rewardId: 'r', triggerReward }) }));
vi.mock('@/hooks/useExperiment', () => {
  const trackExposure = () => {};
  return { useExperiment: () => ({ variant: 'control', trackExposure }) };
});

function state(feedbackSeq: number, feedbackType: string): SurvivalGameState {
  return {
    feedbackSeq,
    feedbackType,
    lastScoreIncrement: 2,
    attempts: [],
    lifePoints: 100,
    eliminatedLetters: new Set<string>(),
    isClueGaining: false,
    hasWon: false,
    isGameOver: false,
    liveScore: 0,
  } as unknown as SurvivalGameState;
}

function verdict(type: string, skipAnimations: boolean, calm: boolean) {
  const hook = renderHook(({ s }) => useWordHuntFx(s, skipAnimations, calm), { initialProps: { s: state(0, type) } });
  hook.rerender({ s: state(1, type) });
  return hook.result.current;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('useWordHuntFx on a phone that runs slow', () => {
  it('Given a found word, Then the screen still flashes and the phone buzzes, but no particles run', () => {
    const fx = verdict('valid-word', true, false);
    expect(fx.flashTrigger).toBe(1);
    expect(fx.flashColor).toBe('bg-neo-lime/15');
    expect(fx.pixiEffects).toHaveLength(0);
    expect(haptics.hapticWordAccepted).toHaveBeenCalledTimes(1);
  });

  it('Given a rejected word, Then a red flash stands in for the particle layer and the phone buzzes', () => {
    const fx = verdict('not-in-dictionary', true, false);
    expect(fx.flashTrigger).toBe(1);
    expect(fx.flashColor).toBe('bg-neo-red/15');
    expect(haptics.hapticError).toHaveBeenCalledTimes(1);
  });

  it('Given the target word, Then it flashes gold', () => {
    const fx = verdict('target-found', true, false);
    expect(fx.flashTrigger).toBe(1);
    expect(fx.flashColor).toBe('bg-neo-yellow/30');
  });
});

describe('useWordHuntFx with motion turned off', () => {
  it('Given a found word, Then nothing flashes, though the buzz still confirms it', () => {
    const fx = verdict('valid-word', true, true);
    expect(fx.flashTrigger).toBe(0);
    expect(haptics.hapticWordAccepted).toHaveBeenCalledTimes(1);
  });
});

describe('useWordHuntFx on desktop', () => {
  it('Given a rejected word, Then the particle layer owns the red flash, with no second CSS flash', () => {
    const fx = verdict('invalid-word', false, false);
    expect(fx.flashTrigger).toBe(0);
    expect(fx.pixiEffects.map((e) => e.type)).toContain('invalid');
  });

  it('Given a found word, Then confetti and particles run', () => {
    const fx = verdict('valid-word', false, false);
    expect(triggerReward).toHaveBeenCalledWith('wordFound');
    expect(fx.pixiEffects.map((e) => e.type)).toContain('wordValid');
  });
});
