/**
 * The end of a classroom game as a moment.
 *
 * Three things this file pins that the old card never did:
 *  1. a PODIUM — the room sees who won, with names and scores, before any table;
 *  2. an HONEST coverage glance — a lesson word the board generator never
 *     embedded is not a word the class failed, and must not sit in the same
 *     "nobody found these" list (a measured 6x6 board carried 1 of 9 words);
 *  3. one tap to the full report, for the teacher who wants the numbers.
 *
 * The behaviour the old card already had is pinned by ClassroomResultsCard.test.tsx
 * — that file is the regression gate for this split and stays unchanged.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassroomResultsCard } from '../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const proState = { hasPro: true, loading: false };
const useTeacherProSpy = vi.fn(() => proState);
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => useTeacherProSpy(),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));

vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/education/unpluggedReteachPrintablePack', () => ({
  openUnpluggedReteachPrintablePack: vi.fn().mockReturnValue(true),
}));

const base: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Maya', 'Noa'] },
    { word: 'neutron', foundBy: [] },
    { word: 'quark', foundBy: [] },
  ],
  missedWords: ['neutron', 'quark'],
  classFoundCount: 2,
  masteryByPlayer: {
    Maya: { found: 2, total: 4 },
    Noa: { found: 1, total: 4 },
  },
  podium: [
    { username: 'Maya', score: 90, rank: 1, wordsFound: 2, totalWords: 4 },
    { username: 'Noa', score: 70, rank: 2, wordsFound: 1, totalWords: 4 },
  ],
};

describe('ClassroomResultsCard — the podium', () => {
  beforeEach(() => {
    proState.hasPro = true;
    proState.loading = false;
    useTeacherProSpy.mockClear();
  });

  it('leads with the winners, for the teacher', () => {
    render(<ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher />);
    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('Maya');
    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('90');
  });

  it('shows the same podium to a student — everyone celebrates the same names', () => {
    render(<ClassroomResultsCard summary={base} username="Noa" isTeacher={false} />);
    expect(screen.getByTestId('podium-place-2')).toHaveTextContent('Noa');
  });

  it('captions each plinth with the words that player found', () => {
    render(<ClassroomResultsCard summary={base} username="Noa" isTeacher={false} />);
    expect(screen.getByTestId('podium-detail-1')).toHaveTextContent(
      'education.results.podium.wordsFound:{"found":2,"total":4}'
    );
  });

  it('renders no podium at all for an older payload that carries none', () => {
    const { podium: _omit, ...noPodium } = base;
    render(<ClassroomResultsCard summary={noPodium} username="Noa" isTeacher={false} />);
    expect(screen.queryByTestId('podium-place-1')).not.toBeInTheDocument();
  });
});

describe('ClassroomResultsCard — honest coverage', () => {
  const withNeverPlaced: ClassroomSummary = { ...base, neverPlacedWords: ['quark'] };

  it('keeps a word the board never carried out of the "nobody found these" list', () => {
    render(<ClassroomResultsCard summary={withNeverPlaced} username="Ms. Cohen" isTeacher />);
    const reteach = screen.getByTestId('missed-on-board-words');
    expect(reteach).toHaveTextContent('neutron');
    expect(reteach).not.toHaveTextContent('quark');
  });

  it('names the never-placed words separately so the teacher does not reteach unseen vocabulary', () => {
    render(<ClassroomResultsCard summary={withNeverPlaced} username="Ms. Cohen" isTeacher />);
    const block = screen.getByTestId('never-placed-words');
    expect(block).toHaveTextContent('quark');
    expect(block).toHaveTextContent('education.results.neverPlaced');
  });

  it('says the class cleared the board when every miss was a word never placed', () => {
    render(
      <ClassroomResultsCard
        summary={{ ...base, neverPlacedWords: ['neutron', 'quark'] }}
        username="Ms. Cohen"
        isTeacher
      />
    );
    expect(screen.queryByTestId('missed-on-board-words')).not.toBeInTheDocument();
    expect(screen.getByTestId('all-board-words-found')).toBeInTheDocument();
    expect(screen.getByTestId('never-placed-words')).toHaveTextContent('quark');
  });

  it('falls back to one undivided reteach list when the placed words are unknown', () => {
    render(<ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher />);
    expect(screen.getByTestId('missed-on-board-words')).toHaveTextContent('neutron');
    expect(screen.getByTestId('missed-on-board-words')).toHaveTextContent('quark');
    expect(screen.queryByTestId('never-placed-words')).not.toBeInTheDocument();
  });

  it('draws a coverage meter the teacher can read from across the room', () => {
    render(<ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher />);
    const meter = screen.getByTestId('coverage-meter');
    expect(meter).toHaveAttribute('aria-valuenow', '2');
    expect(meter).toHaveAttribute('aria-valuemax', '4');
  });

  it('meters the student against their own mastery, not the class', () => {
    render(<ClassroomResultsCard summary={base} username="Noa" isTeacher={false} />);
    expect(screen.getByTestId('coverage-meter')).toHaveAttribute('aria-valuenow', '1');
  });
});

describe('ClassroomResultsCard — the way out', () => {
  it('gives the teacher one tap to the full report', () => {
    render(<ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher />);
    expect(screen.getByTestId('full-report-link')).toHaveAttribute('href', '/en/teacher/reports');
  });

  // /teacher/reports sits behind ProGate feature="reports". Offering it from
  // the results moment to a teacher who cannot open it spends the loudest tap
  // on the card to land them on a blurred paywall.
  it('does not send a teacher without Pro into a blurred paywall', () => {
    proState.hasPro = false;
    proState.loading = false;
    render(<ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher />);
    expect(screen.queryByTestId('full-report-link')).not.toBeInTheDocument();
  });

  // Class 1 (dual source + async resolution): entitlement resolves AFTER first
  // paint. Render the pessimistic state until it lands, never an optimistic
  // link that vanishes under the teacher's finger.
  it('offers nothing until the entitlement has actually resolved', () => {
    proState.hasPro = false;
    proState.loading = true;
    render(<ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher />);
    expect(screen.queryByTestId('full-report-link')).not.toBeInTheDocument();
  });

  // useTeacherPro fires /api/subscription/status on mount and every auth.getUser
  // behind it is a 50-200ms round trip. This card renders on every phone in the
  // room, so the entitlement check must not mount for a student.
  it('never asks about a subscription on a student device', () => {
    render(<ClassroomResultsCard summary={base} username="Noa" isTeacher={false} />);
    expect(useTeacherProSpy).not.toHaveBeenCalled();
  });

  it('still gives a Pro teacher the rematch when the report is hidden', () => {
    proState.hasPro = false;
    proState.loading = false;
    render(
      <ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher onRematch={vi.fn()} />
    );
    expect(screen.getByTestId('rematch-same-list')).toBeInTheDocument();
  });

  it('does not offer a student the teacher report', () => {
    render(<ClassroomResultsCard summary={base} username="Noa" isTeacher={false} />);
    expect(screen.queryByTestId('full-report-link')).not.toBeInTheDocument();
  });

  it('never offers a student the control that restarts the whole room', () => {
    render(
      <ClassroomResultsCard summary={base} username="Noa" isTeacher={false} onRematch={vi.fn()} />
    );
    expect(screen.queryByTestId('rematch-same-list')).not.toBeInTheDocument();
  });

  it('restages the same list on one tap, once', async () => {
    const onRematch = vi.fn();
    render(
      <ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher onRematch={onRematch} />
    );
    await userEvent.click(screen.getByTestId('rematch-same-list'));
    expect(onRematch).toHaveBeenCalledTimes(1);
  });

  it('keeps every follow-up action mounted so a teacher can still find them', () => {
    render(
      <ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher onRematch={vi.fn()} />
    );
    for (const id of [
      'rematch-same-list',
      'print-missed-words-practice-sheet',
      'print-unplugged-reteach-pack',
      'share-miss-gap-practice',
      'assign-miss-gap-async-homework',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });
});
