import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const t = (key: string) => key;
const summary = {
  teacherName: 'T', lessonNames: [], lessonIds: [], totalWords: 0, coverage: [], missedWords: [], classFoundCount: 0, masteryByPlayer: {}, podium: [],
} as unknown as ClassroomSummary;
const players = [{ username: 'Noa', score: 30, wordsFoundCount: 6 }];

describe('EduHostResults layout', () => {
  it('the frame never scrolls; one inner region does', () => {
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} onClose={vi.fn()} onExitRoom={vi.fn()} />);
    const root = screen.getByTestId('edu-host-results');
    expect(root.className).toContain('overflow-hidden');
    expect(root.className).not.toMatch(/(^|\s)overflow-y-auto/);
    const scrollers = Array.from(root.querySelectorAll('*')).filter((el) => /(^|\s)overflow-y-auto(\s|$)/.test(el.className as string));
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0].className).toContain('min-h-0');
    expect(scrollers[0].className).toContain('flex-1');
    expect(within(root).getByTestId('edu-host-results-scroll')).toBe(scrollers[0]);
  });

  it('given a short laptop wall, when the side column overflows, then no card is squeezed shut; the one scroll region takes the overflow', () => {
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} onClose={vi.fn()} onExitRoom={vi.fn()} />);
    const scroll = screen.getByTestId('edu-host-results-scroll');
    expect(scroll.className).not.toMatch(/lg:overflow-hidden/);
    const side = screen.getByTestId('edu-results-actions').parentElement as HTMLElement;
    expect(side.className).toContain('[&>*]:shrink-0');
  });
});
