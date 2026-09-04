/**
 * usePracticeWords — the ONE place solo practice picks which lesson words a
 * student sees. Filters by the student's membership level via wordsForLevel.
 */
import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseStudentClassroom } = vi.hoisted(() => ({ mockUseStudentClassroom: vi.fn() }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => mockUseStudentClassroom() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 's1' } }) }));

import { usePracticeWords } from '../usePracticeSession';

const words = [
  { word: 'cat', canIntegrate: true, level: 'support' as const },
  { word: 'river', canIntegrate: true },
  { word: 'ubiquitous', canIntegrate: true, level: 'challenge' as const },
];

describe('usePracticeWords', () => {
  beforeEach(() => vi.clearAllMocks());

  it('drops challenge words for a support student', () => {
    mockUseStudentClassroom.mockReturnValue({ level: 'support', isLoading: false });
    const { result } = renderHook(() => usePracticeWords(words));
    expect(result.current.words.map((w) => w.word)).toEqual(['cat', 'river']);
    expect(result.current.level).toBe('support');
  });

  it('returns every word for a challenge student', () => {
    mockUseStudentClassroom.mockReturnValue({ level: 'challenge', isLoading: false });
    const { result } = renderHook(() => usePracticeWords(words));
    expect(result.current.words.map((w) => w.word)).toEqual(['cat', 'river', 'ubiquitous']);
  });

  it('handles undefined words (lesson still loading) and is referentially stable across re-renders', () => {
    mockUseStudentClassroom.mockReturnValue({ level: 'core', isLoading: false });
    const { result, rerender } = renderHook(({ w }) => usePracticeWords(w), { initialProps: { w: undefined as typeof words | undefined } });
    expect(result.current.words).toEqual([]);
    rerender({ w: words });
    const first = result.current.words;
    rerender({ w: words });
    expect(result.current.words).toBe(first);
  });
});
