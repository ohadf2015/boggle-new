import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import { ClassroomResultsCard } from '@/components/education/ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const WORDS = ['thunder', 'whisper', 'shadow', 'castle', 'silver', 'meadow'];
const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Weekly Vocabulary'],
  lessonIds: ['l1'],
  totalWords: WORDS.length,
  classFoundCount: 1,
  coverage: WORDS.map((word, i) => ({ word, foundBy: i === 5 ? ['Maya'] : [] })),
  missedWords: WORDS.slice(0, 5),
  masteryByPlayer: { Maya: { found: 1, total: 6 }, Leo: { found: 0, total: 6 }, Noa: { found: 0, total: 6 } },
  podium: [
    { username: 'Maya', score: 133, wordsFound: 6 },
    { username: 'Leo', score: 112, wordsFound: 4 },
    { username: 'Noa', score: 87, wordsFound: 3 },
  ],
} as unknown as ClassroomSummary;
const players = [
  { username: 'Maya', score: 133, wordsFoundCount: 6 },
  { username: 'Leo', score: 112, wordsFoundCount: 4 },
  { username: 'Noa', score: 87, wordsFoundCount: 3 },
] as unknown as PlayerResult[];

/** Every number a viewer can see in the winner banner (screen-reader-only text excluded). */
function visibleNumbers(el: HTMLElement): string[] {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.sr-only, style').forEach((n) => n.remove());
  return clone.textContent?.match(/\d+/g) ?? [];
}

function expectNoSecondNumberThroughTheReveal() {
  let sawSpotlight = false;
  for (let ms = 0; ms < 9000; ms += 40) {
    act(() => {
      vi.advanceTimersByTime(40);
    });
    const bar = screen.queryByTestId('winner-spotlight');
    if (!bar) continue;
    sawSpotlight = true;
    expect(visibleNumbers(bar), `at ${ms}ms the banner shows its own score beside the podium`).toEqual([]);
  }
  expect(sawSpotlight).toBe(true);
  expect(screen.getByTestId('winner-names')).toHaveTextContent('Maya');
}

describe('The round-end wall shows one score for the winner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('given the projector recap, when the podium climbs, then the winner banner never shows a second, different number', () => {
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} onClose={vi.fn()} onExitRoom={vi.fn()} />);
    expectNoSecondNumberThroughTheReveal();
    expect(screen.getByTestId('podium-plate-1')).toHaveTextContent('133');
  });

  it('given the phone recap, when the podium climbs, then the winner banner never shows a second, different number', () => {
    render(<ClassroomResultsCard summary={summary} username="Leo" isTeacher={false} />);
    expectNoSecondNumberThroughTheReveal();
  });
});
