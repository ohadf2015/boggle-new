import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import { WinnerSpotlight } from '@/components/education/results/WinnerSpotlight';
import { NoLessonWordsPanel } from '@/components/education/results/NoLessonWordsPanel';
import { PodiumStage } from '@/components/education/results/PodiumStage';
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
const phoneRecap = vi.hoisted(() => ({ current: false }));
vi.mock('@/components/education/results/useIsPhoneRecap', () => ({ useIsPhoneRecap: () => phoneRecap.current }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const WORDS = ['atlas', 'basalt', 'crater', 'delta', 'estuary', 'fjord', 'glacier', 'harbor', 'isthmus', 'jungle', 'karst', 'lagoon'];

const summary = (): ClassroomSummary => ({
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['l1'],
  totalWords: WORDS.length,
  classFoundCount: 0,
  coverage: WORDS.map((word) => ({ word, foundBy: [] })),
  missedWords: [],
  masteryByPlayer: { Noa: { found: 0, total: WORDS.length }, Dan: { found: 0, total: WORDS.length } },
  podium: [],
});
const players = [
  { username: 'Noa', score: 0, wordsFoundCount: 0 },
  { username: 'Dan', score: 0, wordsFoundCount: 0 },
] as unknown as PlayerResult[];

function renderZeroRound() {
  render(<EduHostResults summary={summary()} players={players} t={t} onRematch={vi.fn()} onClose={vi.fn()} onExitRoom={vi.fn()} />);
  act(() => {
    vi.advanceTimersByTime(8000);
  });
}

describe('EduHostResults: fits the wall with the Teacher Pro card', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pro.hasPro = false;
    pro.loading = false;
    phoneRecap.current = false;
  });

  it('given a free teacher, when results show, then the Pro preview waits closed under "Share and export", after the PDF, never open on the wall the class sees', () => {
    renderZeroRound();
    expect(screen.queryByTestId('class-report-teaser')).toBeNull();
    fireEvent.click(screen.getByTestId('edu-results-more-toggle'));
    const more = screen.getByTestId('edu-results-more');
    expect(more).toContainElement(screen.getByTestId('class-report-teaser'));
    expect(more.lastElementChild!.lastElementChild).toContainElement(screen.getByTestId('class-report-teaser'));
  });

  it('given a free teacher, when the class missed many words, then the wall prints the full chip list a Pro wall gets', () => {
    renderZeroRound();
    const free = screen.getByTestId('coverage-words').querySelectorAll('[data-testid^="lesson-word-"]').length;
    expect(free).toBeGreaterThan(4);
  });

  it('given a zero round, when the banner shows, then it reads in cream on a navy-light surface, not yellow capitals', () => {
    renderZeroRound();
    const bar = screen.getByTestId('winner-spotlight');
    expect(bar).toHaveAttribute('data-outcome', 'zero');
    expect(bar.className).toMatch(/\bbg-neo-navy-light\b/);
    expect(bar.innerHTML).not.toMatch(/text-neo-yellow|\buppercase\b/);
  });

  it('given a zero round, when the lesson count shows, then the count is cream, not lime', () => {
    renderZeroRound();
    expect(screen.getByTestId('tv-coverage-panel').innerHTML).not.toMatch(/text-neo-lime|bg-neo-lime/);
  });

  it('given the student card (no calm tone), when a round scores zero, then the student look keeps its yellow banner', () => {
    render(<WinnerSpotlight winner={{ username: 'Noa', score: 0 }} active t={t} />);
    expect(screen.getByTestId('winner-spotlight').innerHTML).toMatch(/text-neo-yellow/);
  });

  it('given a podium on the wall, when results show, then the class numbers sit under the winner, leaving the side column to coverage, actions and the Pro card', () => {
    render(<EduHostResults summary={summary()} players={players.map((p, i) => ({ ...p, score: 10 * (i + 1) }))} t={t} onRematch={vi.fn()} />);
    const pulse = screen.getByTestId('class-pulse');
    expect(screen.getByTestId('podium-stage').parentElement!.contains(pulse)).toBe(true);
    expect(screen.getByTestId('edu-results-actions').parentElement!.contains(pulse)).toBe(false);
  });

  it('given the no-lesson panel, then its chips and heading are neutral, never cyan capitals', () => {
    const { container } = render(<NoLessonWordsPanel words={[{ word: 'stone', foundBy: ['Noa', 'Dan'] }]} size="projector" t={t} />);
    expect(container.innerHTML).not.toMatch(/bg-neo-cyan|text-neo-cyan|\buppercase\b/);
  });

  it('given a compact no-lesson panel, then the board hint is left out and the word list is short', () => {
    const words = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'].map((word) => ({ word, foundBy: ['Noa'] }));
    render(<NoLessonWordsPanel words={words} size="projector" compact t={t} />);
    expect(screen.queryByText('eduLive.results.noLessonHint')).toBeNull();
    expect(screen.getAllByTestId(/^class-word-/).length).toBeLessThanOrEqual(4);
  });

  it('given a phone beside the Pro card, then the no-lesson panel names the problem without the found-word chips', () => {
    render(<NoLessonWordsPanel words={[{ word: 'stone', foundBy: ['Noa'] }]} size="card" compact hideWords t={t} />);
    expect(screen.getByText('eduLive.results.noLessonTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('class-word-stone')).toBeNull();
  });

  it('given the Pro state is still loading, when results show, then the wall is already in its final form', () => {
    pro.loading = true;
    renderZeroRound();
    expect(screen.queryByTestId('class-report-teaser')).toBeNull();
    expect(screen.getByTestId('coverage-words').querySelectorAll('[data-testid^="lesson-word-"]').length).toBeGreaterThan(4);
  });

  it('given a small podium, then a student lesson count wraps instead of being cut off', () => {
    render(<PodiumStage entries={[{ username: 'Noa', score: 40, rank: 1, detail: '6/14 palabras de la lección' }]} t={t} />);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByTestId('podium-detail-1').className).not.toMatch(/\btruncate\b/);
  });

  it('given a Pro teacher on a 1366x768 wall, then the invite nudge steps aside so the wall never clips', () => {
    pro.hasPro = true;
    const three = ['Noa', 'Dan', 'Ari'].map((username, i) => ({ username, score: 10 * (i + 1), wordsFoundCount: i + 1 })) as unknown as PlayerResult[];
    const s = { ...summary(), masteryByPlayer: { Noa: { found: 1, total: 12 }, Dan: { found: 2, total: 12 }, Ari: { found: 3, total: 12 } } };
    render(<EduHostResults summary={s} players={three} t={t} onRematch={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    const nudge = screen.getByTestId('teacher-invite').parentElement!;
    expect(nudge.className).toMatch(/\[@container_results_\(height<56\.25rem\)\]:hidden/);
  });

  it('given a Pro teacher hosting from a phone, then the struggle preview steps aside so the recap fits the phone', () => {
    pro.hasPro = true;
    phoneRecap.current = true;
    render(<EduHostResults summary={summary()} players={players.map((p, i) => ({ ...p, score: 10 * (i + 1) }))} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('struggle-preview').parentElement!.className).toMatch(/\[@container_results_\(height<56\.25rem\)\]:hidden/);
  });

  it('given a Pro teacher on a 1366x768 wall, then the struggle preview stays: it fits and it is the paid insight', () => {
    pro.hasPro = true;
    render(<EduHostResults summary={summary()} players={players.map((p, i) => ({ ...p, score: 10 * (i + 1) }))} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('struggle-preview').parentElement!.className).not.toMatch(/:hidden/);
  });

  it('given a winner on the calm wall, then the big name has room for its glyphs and is never cut', () => {
    render(<WinnerSpotlight winner={{ username: 'Maya', score: 40 }} active tone="calm" size="projector" t={t} />);
    expect(screen.getByTestId('winner-names').className).toMatch(/\bleading-tight\b/);
  });
});
