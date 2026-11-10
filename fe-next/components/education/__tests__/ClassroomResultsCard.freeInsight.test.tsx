import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fireRankConfetti = vi.fn();
const playRoundEndCue = vi.fn(() => null);

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: (...args: unknown[]) => fireRankConfetti(...args),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: (...args: unknown[]) => playRoundEndCue(...args),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false }),
}));
vi.mock('@/components/teacher/pro/ProInsightLink', () => ({
  ProInsightLink: ({ placement }: { placement: string }) => <a data-testid={`pro-insight-link-${placement}`} href="#">pro</a>,
}));

import { ClassroomResultsCard } from '../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

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
  podium: [
    { username: 'Maya', score: 90, rank: 1 },
    { username: 'Noa', score: 70, rank: 2 },
  ],
};

const standings = [
  { username: 'Maya', score: 90 },
  { username: 'Noa', score: 70 },
];

describe('ClassroomResultsCard free teacher round insight', () => {
  it('given a free teacher, when the round ends, then the hardest words this round show on their card, not a locked report', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher standings={standings} onRematch={vi.fn()} />);
    const words = screen.getAllByTestId('round-hardest-word').map((n) => n.textContent ?? '');
    expect(words[0]).toContain('neutron');
    expect(words[1]).toContain('quark');
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
    expect(screen.getByTestId('pro-insight-link-results_hardest_words')).toBeInTheDocument();
  });

  it('given a student phone, when the round ends, then no teacher insight or Pro link renders', () => {
    render(<ClassroomResultsCard summary={summary} username="Maya" isTeacher={false} standings={standings} />);
    expect(screen.queryByTestId('round-hardest-words')).toBeNull();
    expect(screen.queryByTestId(/pro-insight-link-/)).toBeNull();
  });
});
