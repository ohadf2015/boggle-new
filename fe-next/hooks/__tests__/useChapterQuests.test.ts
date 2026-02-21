import { renderHook, act } from '@testing-library/react';
import { useChapterQuests } from '../useChapterQuests';

describe('useChapterQuests', () => {
  it('initializes with zero progress', () => {
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    expect(result.current.progress).toHaveLength(3);
    result.current.progress.forEach(p => {
      expect(p.current).toBe(0);
      expect(p.isComplete).toBe(false);
    });
  });

  it('recordWordsFound increments wordCountChapter quest', () => {
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    act(() => { result.current.recordWordsFound(5); });
    const wordQuest = result.current.progress.find(p => p.questId === 'w1c1-words');
    expect(wordQuest?.current).toBe(5);
  });

  it('marks quest complete when target reached', () => {
    const { result } = renderHook(() => useChapterQuests({ worldId: 1, chapterNumber: 1 }));
    act(() => { result.current.recordWordsFound(20); });
    const wordQuest = result.current.progress.find(p => p.questId === 'w1c1-words');
    expect(wordQuest?.isComplete).toBe(true);
  });
});
