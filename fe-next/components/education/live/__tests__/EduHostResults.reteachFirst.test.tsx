import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ClassroomSummary } from '@/shared/types/classroom';

const socket = vi.hoisted(() => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }));
const capture = vi.hoisted(() => vi.fn());
const pro = vi.hoisted(() => ({ hasPro: false, loading: false, known: true, trialUsed: true, accessTrialExpires: null, accessTrialEnded: true }));

vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => socket }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('room=ABC123&host=1') }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));

import EduHostResults from '@/components/education/live/EduHostResults';

const t = (key: string, fallbackOrParams?: string | Record<string, string | number>) =>
  typeof fallbackOrParams === 'object' ? `${key}:${JSON.stringify(fallbackOrParams)}` : key;

/** Three students, every word found by at most one: the verdict is "whole lesson", yet two words nobody found. */
const summary = {
  teacherName: 'Ms K',
  lessonNames: ['Weather'],
  lessonIds: ['l1'],
  totalWords: 4,
  coverage: [
    { word: 'rain', foundBy: ['Noa'] },
    { word: 'storm', foundBy: ['Ido'] },
    { word: 'fog', foundBy: [] },
    { word: 'hail', foundBy: [] },
  ],
  missedWords: ['fog', 'hail'],
  classFoundCount: 2,
  masteryByPlayer: { Noa: { found: 1, total: 4 }, Ido: { found: 1, total: 4 }, Lia: { found: 0, total: 4 } },
  podium: [],
} as unknown as ClassroomSummary;
const players = [
  { username: 'Noa', score: 30, wordsFoundCount: 6 },
  { username: 'Ido', score: 10, wordsFoundCount: 2 },
  { username: 'Lia', score: 0, wordsFoundCount: 0 },
];

function renderWall(extra: Partial<React.ComponentProps<typeof EduHostResults>> = {}) {
  return render(
    <EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} onClose={vi.fn()} onExitRoom={vi.fn()} {...extra} />
  );
}

describe('EduHostResults: the words to reteach lead the wall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    pro.hasPro = false;
  });

  it('given a free teacher whose class left words unfound, then a "words your class missed" panel lists them', () => {
    renderWall();
    const panel = screen.getByTestId('edu-reteach-words');
    expect(panel).toHaveTextContent('eduLiveRoom.hostResults.missedTitle');
    expect(screen.getAllByTestId('edu-most-missed-word').map((el) => el.textContent)).toEqual(['fog0/3 · 0%', 'hail0/3 · 0%']);
  });

  it('given missed words, then "Practice these words" is the only primary and it sits in the panel', () => {
    renderWall();
    const primaries = document.querySelectorAll('[data-results-primary]');
    expect(primaries).toHaveLength(1);
    const practice = screen.getByTestId('edu-replay-missed');
    expect(primaries[0]).toBe(practice);
    expect(practice).toHaveTextContent('eduLiveRoom.hostResults.practiceWords');
    expect(screen.getByTestId('edu-reteach-words')).toContainElement(practice);
  });

  it('given the practice tap, then the room is narrowed to those words and edu_reteach_started is recorded', () => {
    renderWall();
    fireEvent.click(screen.getByTestId('edu-replay-missed'));
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachWords', { gameCode: 'ABC123', words: ['fog', 'hail'] });
    expect(capture).toHaveBeenCalledWith('edu_reteach_started', { surface: 'projector', words: 2, plan: 'free' });
  });

  it('given a free teacher, then the one secondary is "Share with parents", labelled Pro with a crown, leading to the upgrade page in a new tab', () => {
    renderWall();
    const share = screen.getByTestId('edu-results-parent-share');
    expect(share).toHaveTextContent('eduLiveRoom.hostResults.shareParents');
    expect(share.querySelector('[data-testid="pro-pill"]')).not.toBeNull();
    expect(share).toHaveAttribute('href', expect.stringMatching(/^\/en\/teacher\/upgrade\?source=results_parent_share/));
    expect(share).toHaveAttribute('target', '_blank');
  });

  it('given a Pro teacher, then "Share with parents" opens the one Reports place', () => {
    pro.hasPro = true;
    renderWall();
    expect(screen.getByTestId('edu-results-parent-share')).toHaveAttribute('href', '/en/teacher/reports');
  });

  it('given practice leads, then Play again is one quiet button and Next game and End game wait under More, none looking like a primary', () => {
    renderWall();
    const more = screen.getByTestId('edu-results-more');
    expect(more.tagName).toBe('DETAILS');
    expect(more).not.toHaveAttribute('open');
    const quiet = screen.getByTestId('edu-results-tertiary');
    expect(Array.from(quiet.querySelectorAll(':scope > div > button')).map((b) => (b as HTMLElement).dataset.testid)).toEqual(expect.arrayContaining(['edu-results-next-mode', 'edu-results-end']));
    const buttons = [screen.getByTestId('edu-results-play-again'), screen.getByTestId('edu-results-next-mode'), screen.getByTestId('edu-results-end')];
    for (const b of buttons) {
      expect(b.className).not.toMatch(/bg-neo-(lime|pink)\b/);
      expect(b.className).toMatch(/min-h-11/);
      expect(b.className).toMatch(/focus-visible:ring/);
    }
  });

  it('given a free teacher, then no trial card competes: the deeper report is one labelled Pro preview that never blurs or names a student', () => {
    renderWall();
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    const preview = screen.getByTestId('class-report-teaser');
    expect(preview.querySelector('[data-testid="pro-pill"]')).not.toBeNull();
    expect(preview.innerHTML).not.toMatch(/blur-/);
    expect(preview).not.toHaveTextContent(/Noa|Ido|Lia/);
  });

  it('given a Pro teacher, then the wall keeps the same shape: one primary, a quiet Play again, the report card as the one Pro slot, and Share with parents and the PDF export under More', () => {
    pro.hasPro = true;
    renderWall();
    expect(document.querySelectorAll('[data-results-primary]')).toHaveLength(1);
    expect(screen.queryByTestId('class-report-teaser')).toBeNull();
    const more = screen.getByTestId('edu-results-more');
    const invite = screen.queryByTestId('teacher-invite');
    const outside = Array.from(document.querySelectorAll('a, button')).filter((el) => !more.contains(el) && !invite?.contains(el));
    expect(outside.map((el) => el.getAttribute('data-testid'))).toEqual(['edu-replay-missed', 'edu-results-play-again', 'edu-results-report']);
    expect(more).toContainElement(screen.getByTestId('edu-results-parent-share'));
    expect(more).toContainElement(screen.getByTestId('report-pdf-export'));
    expect(screen.getByTestId('edu-results-report')).toHaveAttribute('target', '_blank');
  });

  it('given a class that found every word, then Play again is the primary and Share with parents stays the one secondary', () => {
    const nailed = { ...summary, missedWords: [], classFoundCount: 4, coverage: summary.coverage.map((c) => ({ ...c, foundBy: ['Noa', 'Ido', 'Lia'] })) } as ClassroomSummary;
    renderWall({ summary: nailed });
    expect(screen.queryByTestId('edu-reteach-words')).toBeNull();
    expect(screen.getByTestId('edu-results-play-again')).toHaveAttribute('data-results-primary');
    expect(document.querySelectorAll('[data-results-primary]')).toHaveLength(1);
    expect(screen.getByTestId('edu-results-parent-share')).toBeInTheDocument();
  });

  it('given no rematch handler, then the missed words still show but no practice button promises a round it cannot start', () => {
    renderWall({ onRematch: undefined });
    expect(screen.getByTestId('edu-reteach-words')).toBeInTheDocument();
    expect(screen.queryByTestId('edu-replay-missed')).toBeNull();
  });
});
