import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  }),
}));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));

import { ClassroomResultsCardSteps } from '../ClassroomResultsCardSteps';
import { overlayQuietZoneReason, resetOverlayQuietZoneForTests } from '@/lib/overlayQuietZone';

const summary: ClassroomSummary = {
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
  masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
};
const standings = [
  { username: 'Maya', score: 90 },
  { username: 'Noa', score: 70 },
];

const footer = () => screen.getByTestId('results-steps-footer');
const primary = () => within(footer()).getByTestId('results-steps-primary');

describe('ClassroomResultsCardSteps', () => {
  afterEach(() => resetOverlayQuietZoneForTests());

  it('given a scored round, when it opens, then the score leads and the misses are previewed under it', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    const score = screen.getByTestId('results-step-score');
    expect(score).toHaveTextContent('70');
    const preview = within(score).getByTestId('results-missed-preview');
    expect(within(preview).getByRole('heading')).toHaveTextContent('education.results.steps.missedTitle:{"count":3}');
    expect(within(preview).getAllByTestId('missed-word-row').map((r) => r.dataset.word)).toEqual(['photon', 'neutron', 'quark']);
    expect(screen.queryByTestId('results-step-lesson')).not.toBeInTheDocument();
    expect(screen.queryByTestId('results-step-missed')).not.toBeInTheDocument();
  });

  it('given more misses than fit, when previewed, then three rows show and the rest are counted', () => {
    const many = { ...summary, coverage: ['a1', 'b2', 'c3', 'd4', 'e5'].map((word) => ({ word, foundBy: [] })) };
    render(<ClassroomResultsCardSteps summary={many} username="Noa" standings={standings} onFinish={() => {}} />);
    const preview = screen.getByTestId('results-missed-preview');
    expect(within(preview).getAllByTestId('missed-word-row')).toHaveLength(3);
    expect(preview).toHaveTextContent('education.results.steps.moreWords:{"count":2}');
  });

  it('given misses, when the score step shows, then the ghost names how many words it reviews', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    expect(within(footer()).getByTestId('results-steps-ghost')).toHaveTextContent('education.results.steps.reviewCount:{"count":3}');
  });

  it('given the flow is on screen, when a prompt asks to open, then the overlay quiet zone holds it back', () => {
    const { unmount } = render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    expect(overlayQuietZoneReason()).toBe('classroom-results-steps');
    unmount();
  });

  it('given any step, when rendered, then the footer holds exactly one primary and at most one ghost', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} onPractice={() => {}} />);
    expect(within(footer()).getAllByTestId('results-steps-primary')).toHaveLength(1);
    expect(within(footer()).queryAllByTestId('results-steps-ghost').length).toBeLessThanOrEqual(1);
  });

  it('given the score step, when CONTINUE is pressed, then the lesson step replaces it, then the missed words', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    fireEvent.click(primary());
    expect(screen.getByTestId('results-step-lesson')).toHaveTextContent('"found":1');
    expect(screen.queryByTestId('results-step-score')).not.toBeInTheDocument();
    fireEvent.click(primary());
    const rows = within(screen.getByTestId('results-step-missed')).getAllByTestId('missed-word-row');
    expect(rows.map((r) => r.dataset.word)).toEqual(['photon', 'neutron', 'quark']);
  });

  it('given the missed words, when shown, then the review mascot speaks the title from a bubble', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    fireEvent.click(primary());
    fireEvent.click(primary());
    const missed = screen.getByTestId('results-step-missed');
    expect(missed.querySelector('img')?.getAttribute('src')).toContain('reviewTest');
    const bubble = within(missed).getByTestId('missed-bubble');
    expect(within(bubble).getByRole('heading')).toHaveTextContent('education.results.steps.missedTitle');
  });

  it('given misses, when the ghost REVIEW is pressed early, then it jumps straight to the missed words', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    fireEvent.click(within(footer()).getByTestId('results-steps-ghost'));
    expect(screen.getByTestId('results-step-missed')).toBeInTheDocument();
  });

  it('given the step right before the missed words, when shown, then the ghost never duplicates CONTINUE', () => {
    const onPractice = vi.fn();
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" onFinish={() => {}} onPractice={onPractice} />);
    expect(screen.getByTestId('results-step-lesson')).toBeInTheDocument();
    fireEvent.click(within(footer()).getByTestId('results-steps-ghost'));
    expect(onPractice).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('results-step-lesson')).toBeInTheDocument();
  });

  it('given the last step, when the ghost and primary are pressed, then practice and finish fire', () => {
    const onPractice = vi.fn();
    const onFinish = vi.fn();
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" onFinish={onFinish} onPractice={onPractice} />);
    fireEvent.click(primary());
    fireEvent.click(within(footer()).getByTestId('results-steps-ghost'));
    expect(onPractice).toHaveBeenCalledTimes(1);
    fireEvent.click(primary());
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('given a launcher, when on the last step, then the primary plays again', () => {
    const onPlayAgain = vi.fn();
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" onFinish={() => {}} onPlayAgain={onPlayAgain} />);
    fireEvent.click(primary());
    expect(onPlayAgain).not.toHaveBeenCalled();
    fireEvent.click(primary());
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('given a winner and a runner-up, when the score shows, then only the winner gets the podium mascot', () => {
    const podium = () => screen.getByTestId('results-step-score').querySelector('img')?.getAttribute('src') ?? '';
    const { unmount } = render(<ClassroomResultsCardSteps summary={summary} username="Maya" standings={standings} onFinish={() => {}} />);
    expect(podium()).toContain('podium');
    unmount();
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    expect(podium()).not.toContain('podium');
  });

  it('given hidden placings, when the score shows, then no rank leaks', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} hideClassPlacings onFinish={() => {}} />);
    expect(screen.queryByTestId('results-step-rank')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('results-stat-tile')).toHaveLength(1);
  });

  it('given a scored round, when it opens, then a headline and labelled points and rank tiles carry the numbers', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);
    const score = screen.getByTestId('results-step-score');
    expect(within(score).getByRole('heading', { name: 'education.results.steps.roundDone' })).toBeInTheDocument();
    const tiles = within(score).getAllByTestId('results-stat-tile');
    expect(tiles.map((el) => el.dataset.stat)).toEqual(['points', 'rank']);
    expect(tiles[0]).toHaveTextContent('education.results.steps.tilePoints');
    expect(tiles[0]).toHaveTextContent('70');
    expect(tiles[1]).toHaveTextContent('education.results.steps.tileRank');
    expect(within(tiles[1]).getByTestId('results-step-rank')).toBeInTheDocument();
  });

  it('given the lesson step, when shown, then the tally sits in the same stat tile under a headline', () => {
    render(<ClassroomResultsCardSteps summary={summary} username="Noa" onFinish={() => {}} />);
    const lesson = screen.getByTestId('results-step-lesson');
    expect(within(lesson).getByRole('heading')).toBeInTheDocument();
    const [tile] = within(lesson).getAllByTestId('results-stat-tile');
    expect(tile.dataset.stat).toBe('words');
    expect(within(tile).getByRole('progressbar')).toBeInTheDocument();
  });

  it('given a student who found every word, when finishing the lesson step, then there is no missed step', () => {
    const swept = { ...summary, coverage: summary.coverage.map((c) => ({ ...c, foundBy: ['Maya'] })) };
    render(<ClassroomResultsCardSteps summary={swept} username="Maya" onFinish={() => {}} />);
    expect(screen.getByTestId('results-step-lesson')).toHaveTextContent('allFound');
    expect(within(footer()).queryByTestId('results-steps-ghost')).not.toBeInTheDocument();
  });
});
