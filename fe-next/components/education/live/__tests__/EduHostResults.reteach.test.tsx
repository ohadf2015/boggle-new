import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ClassroomSummary } from '@/shared/types/classroom';

const socket = vi.hoisted(() => {
  const handlers: Record<string, Array<(data: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: (event: string, fn: (data: unknown) => void) => {
      (handlers[event] ??= []).push(fn);
    },
    off: (event: string, fn: (data: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== fn);
    },
    fire: (event: string, data: unknown) => (handlers[event] ?? []).forEach((h) => h(data)),
  };
});

vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => socket }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('room=ABC123&host=1') }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import EduHostResults from '@/components/education/live/EduHostResults';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const summary = {
  teacherName: 'Ms K',
  lessonNames: ['Cells'],
  lessonIds: ['l1'],
  totalWords: 3,
  coverage: [
    { word: 'osmosis', foundBy: ['Noa', 'Ido'] },
    { word: 'enzyme', foundBy: [] },
    { word: 'membrane', foundBy: ['Noa'] },
  ],
  missedWords: ['enzyme'],
  classFoundCount: 2,
  masteryByPlayer: { Noa: { found: 2, total: 3 }, Ido: { found: 1, total: 3 }, Lia: { found: 0, total: 3 } },
  podium: [],
} as unknown as ClassroomSummary;
const players = [
  { username: 'Noa', score: 30, wordsFoundCount: 6 },
  { username: 'Ido', score: 10, wordsFoundCount: 2 },
  { username: 'Lia', score: 0, wordsFoundCount: 0 },
];

describe('EduHostResults reteach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('given words most of the class missed, when the wall shows results, then the teacher sees them and a count of who needs help', () => {
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} />);
    expect(screen.getAllByTestId('edu-most-missed-word').map((el) => el.textContent)).toEqual(['enzyme0/3', 'membrane1/3']);
    expect(screen.getByTestId('edu-needs-help-count')).toHaveTextContent('{"count":2}');
  });

  it('given the replay tap, when the server narrows the room, then the next round starts on those words', () => {
    const onRematch = vi.fn();
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={onRematch} />);
    fireEvent.click(screen.getByTestId('edu-replay-missed'));
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachWords', { gameCode: 'ABC123', words: ['enzyme', 'membrane'] });
    expect(onRematch).not.toHaveBeenCalled();
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['enzyme', 'membrane'] }));
    expect(onRematch).toHaveBeenCalledTimes(1);
  });

  it('given every lesson word went unfound, when results show, then no replay competes with Play again and the coverage panel stays', () => {
    const allMissed = { ...summary, classFoundCount: 0, missedWords: ['osmosis', 'enzyme', 'membrane'], coverage: summary.coverage.map((c) => ({ ...c, foundBy: [] })) } as ClassroomSummary;
    render(<EduHostResults summary={allMissed} players={players} t={t} onRematch={vi.fn()} />);
    expect(screen.queryByTestId('edu-replay-missed')).not.toBeInTheDocument();
    expect(screen.getByTestId('tv-coverage-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tv-reteach-whole-lesson')).toHaveTextContent('education.results.wholeLessonAgain');
  });

  it('given no rematch handler and a word too few found, when results show, then the wall never claims all found', () => {
    const fewFound = { ...summary, missedWords: [], coverage: summary.coverage.map((c) => ({ ...c, foundBy: c.foundBy.length ? c.foundBy : ['Lia'] })) } as ClassroomSummary;
    render(<EduHostResults summary={fewFound} players={players} t={t} />);
    expect(screen.getByTestId('tv-coverage-panel')).toBeInTheDocument();
    expect(screen.queryByText('education.results.allFound')).not.toBeInTheDocument();
  });

  it('given no rematch handler, when results show, then no replay is offered that could not start a round', () => {
    render(<EduHostResults summary={summary} players={players} t={t} />);
    expect(screen.queryByTestId('edu-replay-missed')).not.toBeInTheDocument();
  });
});
