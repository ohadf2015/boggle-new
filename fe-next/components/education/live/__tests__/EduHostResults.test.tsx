import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { useClassroomBossStore } from '@/stores/classroomBossStore';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'he', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span data-testid="boss-art" /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const proOffer = vi.hoisted(() => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => proOffer);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const summary = {
  teacherName: 'Ms Cohen', lessonNames: [], lessonIds: [], totalWords: 0, coverage: [], missedWords: [], classFoundCount: 0, masteryByPlayer: {}, podium: [],
} as unknown as ClassroomSummary;
const players = [
  { username: 'Noa', score: 30, wordsFoundCount: 6 },
  { username: 'Ido', score: 10, wordsFoundCount: 2 },
];

const placings = () =>
  [1, 2, 3]
    .map((rank) => screen.queryByTestId(`podium-place-${rank}`))
    .filter(Boolean)
    .map((el) => el!.textContent ?? '');

function finishReveal() {
  act(() => {
    vi.advanceTimersByTime(9000);
  });
}

describe('EduHostResults', () => {
  beforeEach(() => {
    useClassroomBossStore.getState().reset();
    window.sessionStorage.clear();
    pro.hasPro = false;
    pro.loading = false;
    proOffer.reportProOfferImpression.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('given a finished round, when the projector shows results, then the live screen owns an opaque layer above the lobby without nesting the /multiplayer wall', () => {
    render(<EduHostResults summary={summary} players={players} t={t} />);
    const root = screen.getByTestId('edu-host-results');
    expect(root.className).toContain('fixed inset-0');
    expect(root.className).toContain('z-[75]');
    expect(root.className).toContain('bg-neo-navy');
    expect(within(root).queryByTestId('classroom-tv-results')).toBeNull();
    expect(within(root).queryByTestId('host-next-actions')).toBeNull();
  });

  it('given a finished round, when the projector shows results, then a podium and class stats appear', () => {
    render(<EduHostResults summary={summary} players={players} t={t} />);
    finishReveal();
    expect(screen.getByTestId('podium-place-1')).toHaveAttribute('data-revealed', 'true');
    expect(placings()[0]).toContain('Noa');
    expect(placings()[1]).toContain('Ido');
    expect(screen.getByTestId('edu-stat-students')).toHaveTextContent('2');
    expect(screen.getByTestId('edu-stat-words')).toHaveTextContent('8');
    expect(screen.getByTestId('edu-stat-avg')).toHaveTextContent('20');
  });

  it('given the teacher actions, when tapped, then play again, next mode and end game run, with Play again the one primary', () => {
    const onRematch = vi.fn();
    const onClose = vi.fn();
    const onExitRoom = vi.fn();
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={onRematch} onClose={onClose} onExitRoom={onExitRoom} />);
    expect(screen.getAllByRole('button').filter((b) => b.className.includes('bg-neo-lime'))).toEqual([screen.getByTestId('edu-results-play-again')]);
    fireEvent.click(screen.getByTestId('edu-results-play-again'));
    fireEvent.click(screen.getByTestId('edu-results-next-mode'));
    fireEvent.click(screen.getByTestId('edu-results-end'));
    expect(onRematch).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onExitRoom).toHaveBeenCalledTimes(1);
  });

  const lessonSummary = {
    ...summary, totalWords: 10, classFoundCount: 4, lessonNames: ['Animals'],
    coverage: [{ word: 'cat', foundBy: ['Noa'] }, { word: 'dog', foundBy: [] }], missedWords: ['dog'],
    masteryByPlayer: { Noa: { found: 3, total: 10 }, Ido: { found: 1, total: 10 } },
  } as unknown as ClassroomSummary;

  it('given a free teacher, when results show, then the Teacher Pro trial card is the one Pro slot and no second unlock ask competes', () => {
    render(<EduHostResults summary={lessonSummary} players={players} t={t} onRematch={vi.fn()} />);
    finishReveal();
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
    expect(screen.queryByTestId('struggle-preview')).toBeNull();
    expect(document.querySelector('a[href="/he/teacher/reports"]')).toBeNull();
  });

  it('given a free teacher, when the trial card mounts on the wall, then its server-side rendered impression fires', () => {
    render(<EduHostResults summary={lessonSummary} players={players} t={t} onRematch={vi.fn()} />);
    expect(proOffer.reportProOfferImpression).toHaveBeenCalledWith(expect.objectContaining({ placement: 'classroom_results', stage: 'rendered' }));
  });

  it('given a Pro teacher, when results show, then the live projector links straight to the class report and shows no upsell', () => {
    pro.hasPro = true;
    render(<EduHostResults summary={lessonSummary} players={players} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('edu-results-report')).toHaveAttribute('href', '/he/teacher/reports');
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
  });

  it('given lesson words, when results show, then the words still to teach are on the wall', () => {
    render(<EduHostResults summary={lessonSummary} players={players} t={t} />);
    expect(screen.getByTestId('lesson-word-dog')).toHaveAttribute('data-found', 'false');
    expect(screen.queryByTestId('lesson-word-cat')).toBeNull();
  });

  it('given nobody scored, when results show, then the wall says so honestly with the stats and Play again', () => {
    render(<EduHostResults summary={summary} players={[{ username: 'Noa', score: 0 }]} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('edu-host-results')).toHaveAttribute('data-outcome', 'zero');
    expect(screen.getByTestId('edu-results-play-again')).toBeInTheDocument();
    expect(screen.getByTestId('edu-stat-students')).toHaveTextContent('1');
    expect(screen.queryByTestId('podium-crown')).toBeNull();
  });

  it('given three scorers, when the podium shows, then the winner is crowned and seats keep score order', () => {
    render(<EduHostResults summary={summary} players={[...players, { username: 'Maya', score: 20, wordsFoundCount: 3 }]} t={t} />);
    finishReveal();
    expect(placings()).toEqual([expect.stringContaining('Noa'), expect.stringContaining('Maya'), expect.stringContaining('Ido')]);
    expect(screen.getByTestId('podium-crown')).toBeInTheDocument();
  });

  const bossEnd = (status: 'defeated' | 'escaped') =>
    useClassroomBossStore.getState().receiveState({
      bossId: 'lexiconDragon', status, hp: status === 'defeated' ? 0 : 38, maxHp: 100, staggers: 1,
      pctDealt: status === 'defeated' ? 100 : 62, lastHits: [{ username: 'Noa' }], topHitters: [{ username: 'Noa', dmg: 40 }],
    } as unknown as ClassroomBossView);

  it('given the class beat the boss, when the projector shows results, then the boss outcome leads the wall', () => {
    bossEnd('defeated');
    render(<EduHostResults summary={summary} players={players} t={t} />);
    const outcome = screen.getByTestId('boss-outcome');
    expect(outcome).toHaveAttribute('data-outcome', 'defeated');
    expect(outcome.compareDocumentPosition(screen.getByTestId('podium-stage')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('eduLiveRoom.hostResults.title')).not.toBeInTheDocument();
  });

  it('given the boss escaped and no one scored points, when results show, then the boss card tells the story, not "Nobody scored"', () => {
    bossEnd('escaped');
    render(<EduHostResults summary={summary} players={[{ username: 'Noa', score: 0, wordsFoundCount: 4 }]} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-outcome', 'escaped');
    expect(screen.getByTestId('boss-outcome')).toHaveTextContent('classroomBoss.dealtPct');
    expect(screen.queryByTestId('podium-zero-note')).toBeNull();
    expect(screen.queryByTestId('podium-stage')).toBeNull();
    expect(screen.getByTestId('edu-results-play-again')).toBeInTheDocument();
  });

  it('given the boss escaped while students still scored, when the winner lands, then the wall does not throw a party for a lost fight', () => {
    bossEnd('escaped');
    render(<EduHostResults summary={summary} players={players} t={t} />);
    finishReveal();
    expect(screen.getByTestId('podium-place-1')).toHaveAttribute('data-revealed', 'true');
    expect(screen.queryByTestId('celebration-loop')).toBeNull();
    expect(screen.queryByTestId('winner-boss-escaped')).toBeNull();
  });
  it('Given a free teacher and a celebrated round with three or more students, When results show, Then the Pro slot holds the trial card and no invite row competes', () => {
    const class3 = [...players, { username: 'Lia', score: 5, wordsFoundCount: 1 }];
    render(<EduHostResults summary={summary} players={class3} t={t} />);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toBeInTheDocument();
    expect(screen.queryByTestId('teacher-invite')).toBeNull();
  });

  it('Given a Pro teacher and a celebrated round with three or more students, When results show, Then the quiet invite-a-colleague row takes the free slot', () => {
    pro.hasPro = true;
    const class3 = [...players, { username: 'Lia', score: 5, wordsFoundCount: 1 }];
    render(<EduHostResults summary={summary} players={class3} t={t} />);
    expect(screen.getByTestId('teacher-invite')).toBeInTheDocument();
  });

  it('Given only two students, When results show, Then no invite appears', () => {
    pro.hasPro = true;
    render(<EduHostResults summary={summary} players={players} t={t} />);
    expect(screen.queryByTestId('teacher-invite')).toBeNull();
  });

  it('given a finished round, when the wall renders, then it is a size container so the recap scales to its frame, not the viewport', () => {
    render(<EduHostResults summary={summary} players={players} t={t} />);
    const root = screen.getByTestId('edu-host-results');
    expect(root.className).toContain('[container:results_/_size]');
    expect(root.innerHTML).not.toMatch(/dvh|\[@media/);
    expect(root.className).not.toMatch(/\/results:/);
  });
});
