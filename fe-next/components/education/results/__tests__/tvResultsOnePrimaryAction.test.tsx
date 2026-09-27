/**
 * Round 3 of the projector recap: after the reveal there is ONE primary action.
 *
 * The critic counted three competing next steps on the wall — the lime Play
 * again, a full-width pink reteach round, and a "more ways" bar. A teacher in
 * front of thirty children reads one button. So Play again stays the loud
 * one, and every reteach option (the reteach round included) folds behind a
 * single secondary "More" control. The Pro report ask stays quiet and last.
 *
 * Also: a settled reveal (`revealSettled`) paints the finished frame at once,
 * so a static capture shows the winner instead of a drumroll.
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '',
  CLASS_SWEEP_SOUND: '',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ClassroomTvResults } from '../ClassroomTvResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const summary = (): ClassroomSummary => ({
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Noa'] },
    { word: 'quark', foundBy: [] },
    { word: 'boson', foundBy: [] },
  ],
  missedWords: ['quark', 'boson'],
  masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
  podium: [
    { username: 'Maya', score: 90, rank: 1 },
    { username: 'Noa', score: 70, rank: 2 },
  ],
});

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe('projector recap — one primary action', () => {
  it('Given missed words, When the recap renders, Then the reteach round lives inside the More disclosure', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={() => {}} t={t} />);
    const reteach = screen.getByTestId('play-reteach-round');
    const details = reteach.closest('details');
    expect(details).not.toBeNull();
    expect(details!.contains(screen.getByTestId('reteach-more-actions'))).toBe(true);
  });

  it('Then Play again is the only button-sized control outside the disclosure', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={() => {}} t={t} />);
    const rematch = screen.getByTestId('classroom-tv-rematch');
    expect(rematch.closest('details')).toBeNull();
    expect(rematch.className).toContain('bg-neo-lime');
  });

  it('keeps More, the round chip row and the Pro ask on one quiet row after Play again', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={() => {}} t={t} />);
    const row = screen.getByTestId('tv-secondary-row');
    expect(row.contains(screen.getByTestId('reteach-more-actions'))).toBe(true);
    const rematch = screen.getByTestId('classroom-tv-rematch');
    expect(rematch.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('projector recap — settled reveal', () => {
  it('Given revealSettled, Then the first paint is already the finished stage', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('classroom-tv-results')).toHaveAttribute('data-round-end-stage', 'done');
  });

  it('Given revealSettled, Then the Pro ask is not held back behind the celebration delay', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('tv-followup-after-celebration').className).not.toMatch(/5\.8s/);
  });

  it('Given no revealSettled, Then the reveal still plays from its first beat', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={() => {}} t={t} />);
    expect(screen.getByTestId('classroom-tv-results')).toHaveAttribute('data-round-end-stage', 'stage');
  });
});
