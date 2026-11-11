import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('EduHostResults once the reveal has settled', () => {
  it('given a no-points round where the class still found lesson words, then the class chest shows its count, never a "?"', () => {
    const summary = {
      teacherName: 'T', lessonNames: ['Physics'], lessonIds: ['l1'], totalWords: 12, classFoundCount: 5, missedWords: [], masteryByPlayer: {},
      coverage: [], podium: [{ username: 'Noa', score: 0, rank: 1 }, { username: 'Dan', score: 0, rank: 2 }],
    } as unknown as ClassroomSummary;
    render(<EduHostResults summary={summary} players={[{ username: 'Noa', score: 0 }, { username: 'Dan', score: 0 }]} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('class-chest')).not.toHaveTextContent('?');
  });

  it('given a wall with missed words beside the podium, then the missed panel grows to the column height with Practice pinned to its foot', () => {
    const summary = {
      teacherName: 'T', lessonNames: ['Weather'], lessonIds: ['l1'], totalWords: 4, classFoundCount: 2, missedWords: ['fog', 'hail'],
      coverage: [{ word: 'rain', foundBy: ['Noa'] }, { word: 'storm', foundBy: ['Ido'] }, { word: 'fog', foundBy: [] }, { word: 'hail', foundBy: [] }],
      masteryByPlayer: { Noa: { found: 1, total: 4 }, Ido: { found: 1, total: 4 }, Lia: { found: 0, total: 4 } },
      podium: [],
    } as unknown as ClassroomSummary;
    const players = [{ username: 'Noa', score: 30, wordsFoundCount: 6 }, { username: 'Ido', score: 10, wordsFoundCount: 2 }, { username: 'Lia', score: 0, wordsFoundCount: 0 }];
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} />);
    const panel = screen.getByTestId('edu-reteach-words');
    expect(panel).toHaveAttribute('data-fill');
    expect(panel.className).toContain('@5xl/results:flex-1');
    expect(screen.getByTestId('edu-replay-missed').parentElement!.className).toContain('@5xl/results:mt-auto');
  });
});
