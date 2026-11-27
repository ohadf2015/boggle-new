import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({
  record: vi.fn(async () => 25),
  startSession: vi.fn(async () => ({ success: true, sessionId: 'sess-1' })),
  reviewProps: [] as Array<{ cards: Array<{ word: string; kind: string }>; onFinish: (a: boolean[]) => Promise<number | null> }>,
  memory: { data: undefined as unknown, isError: false, refetch: vi.fn(async () => ({})) },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('lesson=L1'),
  usePathname: () => '/en/student/review',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'stu-1' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, f?: string) => f ?? k, language: 'en' }) }));
vi.mock('@/components/education/academyModes/useAuthedLessons', () => ({
  useAuthedLessons: () => ({
    lessons: [{ id: 'L1', name: 'Animals', language: 'en', words: [{ word: 'dog' }, { word: 'cat' }, { word: 'owl' }] }],
    error: null,
    signedOut: false,
    retry: vi.fn(),
  }),
}));
vi.mock('@/hooks/useWordMemory', () => ({ useWordMemory: () => h.memory }));
vi.mock('@/hooks/usePracticeSession', () => ({ usePracticeProgress: () => ({ startSession: h.startSession }) }));
vi.mock('@/components/education/PracticeSessionProvider', () => ({ PracticeSessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/academyModes/MissedWordsReview', () => ({
  __esModule: true,
  default: (props: (typeof h.reviewProps)[number]) => {
    h.reviewProps.push(props);
    return null;
  },
}));
vi.mock('@/components/education/academyModes/AcademyStates', () => ({ AcademyLoading: () => <div>loading</div>, AcademyNotice: () => null }));
vi.mock('@/components/education/academyModes/AcademyChrome', () => ({ ACADEMY_ART: { lesson: '/x.png' } }));
vi.mock('@/components/education/academyModes/useRecordedXp', () => ({ useRecordedXp: () => h.record }));
vi.mock('@/components/education/academyModes/useAcademyPlayer', () => ({ useAcademyPlayer: () => ({}) }));
vi.mock('@/lib/supabase/education/progress', () => ({ getStudentProgress: vi.fn(async () => ({ data: [] })) }));

import ReviewPageClient from '../PageClient';

const lastProps = () => h.reviewProps[h.reviewProps.length - 1];

describe('/student/review on the server word memory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.reviewProps.length = 0;
    h.memory.data = undefined;
    h.memory.isError = false;
    localStorage.clear();
  });

  it('GIVEN the memory has not answered yet WHEN the page loads THEN no deck is dealt (no order a late read could flip)', async () => {
    render(<ReviewPageClient />);
    await new Promise((r) => setTimeout(r, 20));
    expect(h.reviewProps).toHaveLength(0);
  });

  it('GIVEN a due word on the server WHEN the deck is dealt THEN it comes first', async () => {
    h.memory.data = {
      today: '2026-11-10',
      dueCount: 1,
      words: [
        { lessonId: 'L1', word: 'owl', strength: 'sprout', storedStrength: 'sprout', due: true, nextReviewDate: '2000-01-01', lastReviewDate: '2000-01-01' },
        { lessonId: 'L1', word: 'dog', strength: 'plant', storedStrength: 'plant', due: false, nextReviewDate: '2999-01-01', lastReviewDate: '2000-01-01' },
      ],
      lessons: [],
    };
    render(<ReviewPageClient />);
    await waitFor(() => expect(h.reviewProps.length).toBeGreaterThan(0));
    expect(lastProps().cards[0].word).toBe('owl');
  });

  it('GIVEN a finished run WHEN recorded THEN every answer goes to the server as wordResults and nothing is stored on the device', async () => {
    h.memory.data = { today: '2026-11-10', dueCount: 0, words: [], lessons: [] };
    render(<ReviewPageClient />);
    await waitFor(() => expect(h.reviewProps.length).toBeGreaterThan(0));
    const { cards, onFinish } = lastProps();
    const answers = cards.map((_, i) => i !== 1);
    await act(async () => {
      await onFinish(answers);
    });
    expect(h.startSession).toHaveBeenCalledWith('flashcard', { variant: 'missed_review' });
    const sent = h.record.mock.calls[0][0] as { type: string; sessionId: string; cardsReviewed: number; cardsCorrect: number; wordResults: unknown[] };
    expect(sent).toMatchObject({ type: 'flashcard', sessionId: 'sess-1', cardsReviewed: cards.length, cardsCorrect: cards.length - 1 });
    expect(sent.wordResults).toEqual(cards.map((c, i) => ({ word: c.word, correct: answers[i], kind: c.kind === 'meaning' ? 'recognise' : 'spell' })));
    expect(localStorage.length).toBe(0);
  });

  it('GIVEN the memory read failed WHEN the page loads THEN a deck is still dealt from the lesson words', async () => {
    h.memory.isError = true;
    render(<ReviewPageClient />);
    await waitFor(() => expect(h.reviewProps.length).toBeGreaterThan(0));
    expect(lastProps().cards.length).toBeGreaterThan(0);
  });
});
