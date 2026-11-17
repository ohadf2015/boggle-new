import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { useClassroomBossStore } from '@/stores/classroomBossStore';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, loading: false, isTeacher: true }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));
const share = vi.hoisted(() => ({ shareWithFallback: vi.fn() }));
vi.mock('@/utils/shareWithFallback', () => share);
const ph = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: ph }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const summary = {
  teacherName: 'Ms Cohen', lessonNames: ['4B Animals'], lessonIds: [], totalWords: 0, coverage: [], missedWords: [], classFoundCount: 0, masteryByPlayer: {}, podium: [], gameMode: 'classic',
} as unknown as ClassroomSummary;
const players = [
  { username: 'Noa', score: 30, wordsFoundCount: 6 },
  { username: 'Ido', score: 10, wordsFoundCount: 2 },
];

function openShare() {
  render(<EduHostResults summary={summary} players={players} t={t} gameCode="JU35M6" onRematch={vi.fn()} />);
  fireEvent.click(screen.getByTestId('edu-results-more-toggle'));
  return screen.getByTestId('edu-results-share-class-win');
}

describe('EduHostResults share class win', () => {
  beforeEach(() => {
    useClassroomBossStore.getState().reset();
    window.sessionStorage.clear();
    share.shareWithFallback.mockReset();
    ph.capture.mockClear();
    toast.success.mockClear();
  });

  it('given a round where the class found words, when the teacher taps Share class win, then a name-free class card is shared', async () => {
    share.shareWithFallback.mockResolvedValue('shared');
    fireEvent.click(openShare());
    await waitFor(() => expect(share.shareWithFallback).toHaveBeenCalledTimes(1));
    const arg = share.shareWithFallback.mock.calls[0][0];
    expect(new URL(arg.url).pathname).toBe('/en/education/class-win');
    const blob = JSON.stringify(arg);
    for (const leak of ['Noa', 'Ido', 'Cohen', '4B', 'Animals', 'JU35M6']) expect(blob).not.toContain(leak);
    await waitFor(() => expect(ph.capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'edu_class_win', kind: 'class', result: 'shared' }));
  });

  it('given no share sheet, when the link is copied, then the teacher sees a copied toast', async () => {
    share.shareWithFallback.mockResolvedValue('copied');
    fireEvent.click(openShare());
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(ph.capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'edu_class_win', kind: 'class', result: 'copied' });
  });

  it('given a round where nobody found a word, then there is no class win to share — and nothing left behind More for a free teacher', () => {
    const silent = players.map((p) => ({ ...p, wordsFoundCount: 0, score: 0 }));
    render(<EduHostResults summary={summary} players={silent} t={t} onRematch={vi.fn()} />);
    expect(screen.queryByTestId('edu-results-share-class-win')).toBeNull();
    // No class win, no parent-share upsell, no report slot (totalWords 0): the More row does not render.
    expect(screen.queryByTestId('edu-results-more-toggle')).toBeNull();
  });
});
