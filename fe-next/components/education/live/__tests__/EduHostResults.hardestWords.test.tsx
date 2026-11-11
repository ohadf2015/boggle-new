import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ClassroomSummary } from '@/shared/types/classroom';

const pro = vi.hoisted(() => ({ hasPro: false }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => {
  const MockLink = React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(({ href, children, ...rest }, ref) => <a ref={ref} href={href} {...rest}>{children}</a>);
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
});
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: pro.hasPro, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import EduHostResults from '@/components/education/live/EduHostResults';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const summary = {
  teacherName: 'Ms K', lessonNames: ['Weather'], lessonIds: ['l1'], totalWords: 4, classFoundCount: 2, missedWords: ['fog', 'hail'],
  coverage: [{ word: 'rain', foundBy: ['Noa'] }, { word: 'storm', foundBy: ['Ido'] }, { word: 'fog', foundBy: [] }, { word: 'hail', foundBy: [] }],
  masteryByPlayer: { Noa: { found: 1, total: 4 }, Ido: { found: 1, total: 4 }, Lia: { found: 0, total: 4 } },
  podium: [],
} as unknown as ClassroomSummary;
const players = [{ username: 'Noa', score: 30, wordsFoundCount: 6 }, { username: 'Ido', score: 10, wordsFoundCount: 2 }, { username: 'Lia', score: 0, wordsFoundCount: 0 }];

describe('EduHostResults hardest words', () => {
  it('given a live round with lesson data, then the hardest words lead the "Words your class missed" panel with the Pro line for a free teacher', () => {
    pro.hasPro = false;
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} />);
    const insight = screen.getByTestId('round-hardest-words');
    expect(screen.getByTestId('edu-reteach-words')).toContainElement(insight);
    expect(screen.getAllByTestId('round-hardest-word').length).toBeGreaterThan(0);
    expect(screen.getByTestId('pro-insight-link-results_hardest_words')).toBeInTheDocument();
  });

  it('given a Pro teacher, then the insight stays and no Pro line shows', () => {
    pro.hasPro = true;
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('round-hardest-words')).toBeInTheDocument();
    expect(screen.queryByTestId('pro-insight-link-results_hardest_words')).toBeNull();
  });

  it('given a round where nobody missed a word, then the insight still shows in the side column', () => {
    pro.hasPro = false;
    const swept = { ...summary, missedWords: [], classFoundCount: 4, coverage: summary.coverage.map((c) => ({ ...c, foundBy: ['Noa'] })) } as unknown as ClassroomSummary;
    render(<EduHostResults summary={swept} players={players} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('round-hardest-words')).toBeInTheDocument();
  });
});
