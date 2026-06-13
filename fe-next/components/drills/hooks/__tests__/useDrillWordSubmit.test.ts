import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDrillWordSubmit, UseDrillWordSubmitProps } from '../useDrillWordSubmit';
import { isWordOnBoard } from '@/utils/utils';

vi.mock('@/utils/utils', () => ({
  isWordOnBoard: vi.fn(),
}));

const mockIsWordOnBoard = isWordOnBoard as any;

function makeProps(overrides: Partial<UseDrillWordSubmitProps> = {}): UseDrillWordSubmitProps {
  return {
    grid: [['C', 'A', 'T', 'S']],
    language: 'en',
    availableWords: [
      { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
      { word: 'CATS', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
    ],
    wordsFound: [],
    phase: 'playing',
    playingPhase: 'playing',
    playWordRejectedSound: vi.fn(),
    t: (key: string) => key,
    ...overrides,
  };
}

describe('useDrillWordSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsWordOnBoard.mockReturnValue(true);
  });

  describe('availableWordSet', () => {
    it('builds uppercase set from availableWords', () => {
      const { result } = renderHook(() => useDrillWordSubmit(makeProps()));
      expect(result.current.availableWordSet.has('CAT')).toBe(true);
      expect(result.current.availableWordSet.has('CATS')).toBe(true);
      expect(result.current.availableWordSet.has('DOG')).toBe(false);
    });
  });

  describe('validateWord', () => {
    it('returns valid for a correct word', () => {
      const { result } = renderHook(() => useDrillWordSubmit(makeProps()));
      const res = result.current.validateWord('cat');
      expect(res).toEqual({ valid: true, upperWord: 'CAT' });
    });

    it('normalizes word to uppercase', () => {
      const { result } = renderHook(() => useDrillWordSubmit(makeProps()));
      const res = result.current.validateWord('cAt');
      expect(res.upperWord).toBe('CAT');
      expect(res.valid).toBe(true);
    });

    it('rejects when phase is not playing', () => {
      const { result } = renderHook(() =>
        useDrillWordSubmit(makeProps({ phase: 'ready' }))
      );
      const res = result.current.validateWord('cat');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('notPlaying');
    });

    it('rejects word not on board and plays error sound', () => {
      mockIsWordOnBoard.mockReturnValue(false);
      const playWordRejectedSound = vi.fn();
      const { result } = renderHook(() =>
        useDrillWordSubmit(makeProps({ playWordRejectedSound }))
      );
      const res = result.current.validateWord('cat');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('brain.drills.errors.notOnBoard');
      expect(playWordRejectedSound).toHaveBeenCalled();
    });

    it('rejects duplicate word and plays error sound', () => {
      const playWordRejectedSound = vi.fn();
      const { result } = renderHook(() =>
        useDrillWordSubmit(makeProps({ wordsFound: ['CAT'], playWordRejectedSound }))
      );
      const res = result.current.validateWord('cat');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('brain.drills.errors.alreadyFound');
      expect(playWordRejectedSound).toHaveBeenCalled();
    });

    it('rejects word not in available set and plays error sound', () => {
      const playWordRejectedSound = vi.fn();
      const { result } = renderHook(() =>
        useDrillWordSubmit(makeProps({ playWordRejectedSound }))
      );
      const res = result.current.validateWord('dog');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('brain.drills.errors.invalidWord');
      expect(playWordRejectedSound).toHaveBeenCalled();
    });

    it('does not crash when playWordRejectedSound is undefined', () => {
      mockIsWordOnBoard.mockReturnValue(false);
      const { result } = renderHook(() =>
        useDrillWordSubmit(makeProps({ playWordRejectedSound: undefined }))
      );
      const res = result.current.validateWord('cat');
      expect(res.valid).toBe(false);
    });

    it('checks board validity before duplicate check', () => {
      mockIsWordOnBoard.mockReturnValue(false);
      const { result } = renderHook(() =>
        useDrillWordSubmit(makeProps({ wordsFound: ['CAT'] }))
      );
      const res = result.current.validateWord('cat');
      // Should fail on board check, not duplicate
      expect(res.error).toBe('brain.drills.errors.notOnBoard');
    });
  });
});
