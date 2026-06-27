import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChapterQuests } from '../useChapterQuests';

// Mock ProgressionContext — quest progress now persisted via context
const { mockUpdateChapterQuestProgress } = vi.hoisted(() => {
  const mockUpdateChapterQuestProgress = vi.fn();
  return { mockUpdateChapterQuestProgress };
});
const mockProgression: Record<string, unknown> = {
  chapterQuestProgress: {},
};

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    progression: mockProgression,
    updateChapterQuestProgress: mockUpdateChapterQuestProgress,
  }),
}));

describe('useChapterQuests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgression.chapterQuestProgress = {};
  });

  it('initializes with zero progress when no saved data', () => {
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    expect(result.current.progress).toHaveLength(3);
    result.current.progress.forEach(p => {
      expect(p.current).toBe(0);
      expect(p.isComplete).toBe(false);
    });
  });

  it('restores progress from ProgressionContext (persistence)', () => {
    mockProgression.chapterQuestProgress = { 'w1c1-words': 12 };
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    const wordQuest = result.current.progress.find(p => p.questId === 'w1c1-words');
    expect(wordQuest?.current).toBe(12);
    expect(wordQuest?.isComplete).toBe(false);
  });

  it('marks quest complete when saved progress meets target', () => {
    mockProgression.chapterQuestProgress = { 'w1c1-words': 20 };
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    const wordQuest = result.current.progress.find(p => p.questId === 'w1c1-words');
    expect(wordQuest?.isComplete).toBe(true);
  });

  it('recordWordsFound delegates to updateChapterQuestProgress', () => {
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    act(() => { result.current.recordWordsFound(5); });
    expect(mockUpdateChapterQuestProgress).toHaveBeenCalledWith(
      'wordCountChapter',
      5,
      ['w1c1-words'],
      'add'
    );
  });

  it('recordLongWord delegates to updateChapterQuestProgress', () => {
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    act(() => { result.current.recordLongWord(); });
    expect(mockUpdateChapterQuestProgress).toHaveBeenCalledWith(
      'longWordCount',
      1,
      ['w1c1-long'],
      'add'
    );
  });

  it('recordLevelPerfect delegates to updateChapterQuestProgress', () => {
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    act(() => { result.current.recordLevelPerfect(); });
    expect(mockUpdateChapterQuestProgress).toHaveBeenCalledWith(
      'perfectLevels',
      1,
      ['w1c1-perfect'],
      'add'
    );
  });

  it('recordStreakMaster delegates with max mode and the streak length', () => {
    // World 4 / chapter 1 has a streakMaster quest (target 5, id w4c1-streak).
    const { result } = renderHook(() => useChapterQuests({ worldId: 4, chapterNumber: 1 }));
    act(() => { result.current.recordStreakMaster(5); });
    expect(mockUpdateChapterQuestProgress).toHaveBeenCalledWith(
      'streakMaster',
      5,
      ['w4c1-streak'],
      'max'
    );
  });

  it('caps progress at quest target', () => {
    mockProgression.chapterQuestProgress = { 'w1c1-words': 999 };
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    const wordQuest = result.current.progress.find(p => p.questId === 'w1c1-words');
    expect(wordQuest?.current).toBe(20); // target is 20
    expect(wordQuest?.isComplete).toBe(true);
  });
});
