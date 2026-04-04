/**
 * useBlastEngineSounds - Tests for sound trigger logic.
 * Mocks SoundEffectsContext and verifies correct sounds fire on state transitions.
 */
import { renderHook } from '@testing-library/react';
import { useBlastEngineSounds } from '../hooks/useBlastEngineSounds';

// Mock SoundEffectsContext
const mockSfx = {
  playCountdownBeep: vi.fn(),
  playWordAcceptedSound: vi.fn(),
  playComboSound: vi.fn(),
  playUltraComboSound: vi.fn(),
  playComboMilestoneSound: vi.fn(),
  playMegaCascadeSound: vi.fn(),
  playAchievementSound: vi.fn(),
  playComboBreakSound: vi.fn(),
};

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => mockSfx,
}));

const baseEvents = {
  tilesCleared: 0,
  comboLevel: 0,
  cascadeLevel: 0,
  waveCleared: false,
  gameOver: false,
  swapOccurred: false,
  wordsFoundCount: 0,
};

describe('useBlastEngineSounds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should play swap sound when swapOccurred transitions to true', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents } },
    );
    rerender({ ...baseEvents, swapOccurred: true });
    expect(mockSfx.playCountdownBeep).toHaveBeenCalledWith(10);
  });

  it('should play word accepted sound when tiles are cleared', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents } },
    );
    rerender({ ...baseEvents, tilesCleared: 5 });
    expect(mockSfx.playWordAcceptedSound).toHaveBeenCalled();
  });

  it('should play combo sound at combo level 2+', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents } },
    );
    rerender({ ...baseEvents, comboLevel: 2 });
    expect(mockSfx.playComboSound).toHaveBeenCalledWith(2);
  });

  it('should play ultra combo sound at level 10', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents, comboLevel: 9 } },
    );
    rerender({ ...baseEvents, comboLevel: 10 });
    expect(mockSfx.playUltraComboSound).toHaveBeenCalled();
  });

  it('should play combo milestone sound at multiples of 5', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents, comboLevel: 4 } },
    );
    rerender({ ...baseEvents, comboLevel: 5 });
    expect(mockSfx.playComboMilestoneSound).toHaveBeenCalledWith(5);
  });

  it('should play mega cascade sound at cascade level 5+', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents, cascadeLevel: 4 } },
    );
    rerender({ ...baseEvents, cascadeLevel: 5 });
    expect(mockSfx.playMegaCascadeSound).toHaveBeenCalled();
  });

  it('should play cascade combo sound for levels 1-4', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents } },
    );
    rerender({ ...baseEvents, cascadeLevel: 2 });
    expect(mockSfx.playComboSound).toHaveBeenCalledWith(2);
  });

  it('should play achievement sound on wave clear', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents } },
    );
    rerender({ ...baseEvents, waveCleared: true });
    expect(mockSfx.playAchievementSound).toHaveBeenCalled();
  });

  it('should play combo break sound on game over', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents } },
    );
    rerender({ ...baseEvents, gameOver: true, comboLevel: 3 });
    expect(mockSfx.playComboBreakSound).toHaveBeenCalledWith(3);
  });

  it('should NOT replay swap sound if swapOccurred stays true on rerender', () => {
    const { rerender } = renderHook(
      (props) => useBlastEngineSounds(props),
      { initialProps: { ...baseEvents, swapOccurred: true } },
    );
    // Initial render fires once (prevSwap starts false, swapOccurred is true)
    expect(mockSfx.playCountdownBeep).toHaveBeenCalledTimes(1);
    mockSfx.playCountdownBeep.mockClear();
    rerender({ ...baseEvents, swapOccurred: true });
    // Same value — should not fire again
    expect(mockSfx.playCountdownBeep).toHaveBeenCalledTimes(0);
  });
});
