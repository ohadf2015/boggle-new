import { renderHook } from '@testing-library/react';
import { useAdventureModeAdapter } from '../useAdventureModeAdapter';
import type { LevelConfig } from '@/types/adventure';

function makeLevelConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    worldId: 1,
    levelId: 1,
    gridSize: 4,
    timeLimit: 60,
    minWordLength: 3,
    targetScore: 100,
    starThresholds: [50, 100, 150],
    objectives: [],
    ...overrides,
  } as LevelConfig;
}

describe('useAdventureModeAdapter', () => {
  it('returns default classic state when levelConfig is null', () => {
    const { result } = renderHook(() => useAdventureModeAdapter(null));
    expect(result.current.archetype).toBe('classic');
    expect(result.current.gameMode).toBe('timer');
    expect(result.current.showTimer).toBe(true);
    expect(result.current.showMoveCounter).toBe(false);
    expect(result.current.showLifeBar).toBe(false);
    expect(result.current.showRunePicker).toBe(false);
  });

  it('returns blast mode state with showMoveCounter=true, showTimer=false', () => {
    const config = makeLevelConfig({ archetype: 'blast' });
    const { result } = renderHook(() => useAdventureModeAdapter(config));
    expect(result.current.archetype).toBe('blast');
    expect(result.current.gameMode).toBe('moves');
    expect(result.current.showTimer).toBe(false);
    expect(result.current.showMoveCounter).toBe(true);
    expect(result.current.showLifeBar).toBe(false);
  });

  it('returns hunt mode state with showLifeBar=true, showTargetWordUI=true', () => {
    const config = makeLevelConfig({ archetype: 'hunt' });
    const { result } = renderHook(() => useAdventureModeAdapter(config));
    expect(result.current.archetype).toBe('hunt');
    expect(result.current.gameMode).toBe('lives');
    expect(result.current.showLifeBar).toBe(true);
    expect(result.current.showTargetWordUI).toBe(true);
    expect(result.current.showTimer).toBe(false);
  });

  it('returns wheel mode state that plays as classic boggle (no center-letter rule)', () => {
    const config = makeLevelConfig({ archetype: 'wheel', centerLetter: 'A' });
    const { result } = renderHook(() => useAdventureModeAdapter(config));
    expect(result.current.archetype).toBe('wheel');
    expect(result.current.centerLetterRequired).toBe(false);
    expect(result.current.centerLetter).toBe(null);
    expect(result.current.showTimer).toBe(true);
  });

  it('returns forge mode state with showRunePicker=true', () => {
    const config = makeLevelConfig({ archetype: 'forge', hasRunePick: true });
    const { result } = renderHook(() => useAdventureModeAdapter(config));
    expect(result.current.archetype).toBe('forge');
    expect(result.current.showRunePicker).toBe(true);
    expect(result.current.showTimer).toBe(true);
  });

  it('returns boss mode state', () => {
    const config = makeLevelConfig({ archetype: 'boss' });
    const { result } = renderHook(() => useAdventureModeAdapter(config));
    expect(result.current.archetype).toBe('boss');
    expect(result.current.gameMode).toBe('timer');
    expect(result.current.showTimer).toBe(true);
    expect(result.current.showRunePicker).toBe(false);
  });

  it('uses movesLimit from levelConfig when provided for blast mode', () => {
    const config = makeLevelConfig({ archetype: 'blast', movesLimit: 20 });
    const { result } = renderHook(() => useAdventureModeAdapter(config));
    expect(result.current.movesLimit).toBe(20);
  });

  it('uses lifePoints from levelConfig when provided for hunt mode', () => {
    const config = makeLevelConfig({ archetype: 'hunt', lifePoints: 75 });
    const { result } = renderHook(() => useAdventureModeAdapter(config));
    expect(result.current.lifePoints).toBe(75);
  });
});
