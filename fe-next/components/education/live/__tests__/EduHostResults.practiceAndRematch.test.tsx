import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const TEACHER = 'Ms. Cohen';

const summary = (over: Partial<ClassroomSummary> = {}): ClassroomSummary => ({
  teacherName: TEACHER,
  lessonNames: ['Unit 3'],
  lessonIds: ['l1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'atlas', foundBy: ['Noa'] },
    { word: 'basalt', foundBy: ['Dan'] },
    { word: 'crater', foundBy: [] },
    { word: 'delta', foundBy: [] },
  ],
  missedWords: ['crater', 'delta'],
  masteryByPlayer: { [TEACHER]: { found: 0, total: 4 }, Noa: { found: 1, total: 4 }, Dan: { found: 1, total: 4 } },
  podium: [
    { username: TEACHER, score: 0, rank: 1, wordsFound: 0, totalWords: 4 },
    { username: 'Noa', score: 40, rank: 2, wordsFound: 1, totalWords: 4 },
    { username: 'Dan', score: 20, rank: 3, wordsFound: 1, totalWords: 4 },
  ],
  ...over,
});

const students = [
  { username: 'Noa', score: 40, wordsFoundCount: 1 },
  { username: 'Dan', score: 20, wordsFoundCount: 1 },
] as unknown as PlayerResult[];
const bots = students.map((p) => ({ ...p, isBot: true })) as unknown as PlayerResult[];

describe('EduHostResults practice rounds, rematch and lesson honesty', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    pro.hasPro = false;
    pro.loading = false;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('given a free teacher after a bots-only practice round, when results show, then no Teacher Pro ask appears', () => {
    render(<EduHostResults summary={summary()} players={bots} t={t} onRematch={vi.fn()} />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
  });

  it('given a bots-only round whose scores also carry the host row, as the server sends it, when results show, then no Pro ask, no student count, and the bots podium stays', () => {
    const live = [...bots, { username: TEACHER, score: 0, isHost: true, isBot: false }] as unknown as PlayerResult[];
    render(<EduHostResults summary={summary({ podium: [], masteryByPlayer: { [TEACHER]: { found: 0, total: 4 } } })} players={live} t={t} onRematch={vi.fn()} />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    expect(screen.queryByTestId('edu-stat-students')).toBeNull();
    expect(screen.getByTestId('podium-stage')).toBeInTheDocument();
  });

  it('given a free teacher after a real class round, when results show, then the Teacher Pro card still shows', () => {
    render(<EduHostResults summary={summary()} players={students} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toBeInTheDocument();
  });

  it('given a nailed lesson, when the teacher taps Play again, then the room restarts and it counts as a projector rematch', () => {
    const onRematch = vi.fn();
    render(<EduHostResults summary={summary({ missedWords: [], classFoundCount: 4 })} players={students} t={t} onRematch={onRematch} />);
    fireEvent.click(screen.getByTestId('edu-results-play-again'));
    expect(onRematch).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('results_primary_action_clicked', { action: 'rematch', surface: 'projector' });
  });

  it('given points but zero lesson words, when results show, then no "0 of N" lesson number appears and the winner still stands', () => {
    const none = summary({
      classFoundCount: 0,
      coverage: ['atlas', 'basalt', 'crater', 'delta'].map((word) => ({ word, foundBy: [] })),
      missedWords: ['atlas', 'basalt', 'crater', 'delta'],
      masteryByPlayer: { Noa: { found: 0, total: 4 }, Dan: { found: 0, total: 4 } },
      podium: [
        { username: 'Noa', score: 40, rank: 1, wordsFound: 0, totalWords: 4 },
        { username: 'Dan', score: 20, rank: 2, wordsFound: 0, totalWords: 4 },
      ],
    });
    render(<EduHostResults summary={none} players={students} t={t} onRematch={vi.fn()} />);
    const wall = screen.getByTestId('edu-host-results');
    expect(screen.queryByTestId('class-chest')).toBeNull();
    expect(screen.queryByTestId(/^podium-detail-/)).toBeNull();
    expect(wall.textContent).not.toContain('"found":0');
    expect(wall).toHaveAttribute('data-outcome', 'winner');
  });
});
