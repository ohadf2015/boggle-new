/**
 * The student hub must never print an interpolation placeholder.
 *
 * The three stat tiles and the milestone line each borrowed a *format* string
 * and rendered it as a static label, so a signed-in student saw `#{rank}`,
 * `{count}-day streak` and `{xp} XP to next level: 466` on their own home
 * screen in every locale. Rendering the real `en` bundle (not a key-echo mock)
 * is what makes that visible to a test: a mock that returns the key back would
 * have shown `education.leaderboard.rank` and passed a "no braces" assertion.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { en } from '@/translations/en';

function lookup(path: string): string {
  const value = path
    .split('.')
    .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], en);
  return typeof value === 'string' ? value : path;
}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      let out = lookup(key);
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          out = out.split(`{{${name}}}`).join(String(value)).split(`{${name}}`).join(String(value));
        }
      }
      return out;
    },
    language: 'en',
    direction: 'ltr',
  }),
}));

vi.mock('@/hooks/useClassroomLeaderboard', () => ({
  useClassroomLeaderboard: () => ({
    topThree: [],
    currentUserRank: { rank: 3, totalXp: 500 },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({ currentStreak: 5, isLoaded: true, lastWinDate: null }),
}));

vi.mock('@/backend/modules/xpManager', () => ({
  getXpProgress: () => ({
    currentLevel: 7,
    xpInCurrentLevel: 200,
    xpNeededForNextLevel: 500,
    progressPercent: 40,
  }),
  getXpForLevel: (level: number) => level * 100,
}));

vi.mock('@/components/education/milestones/MilestoneCelebration', () => ({
  MilestoneCelebration: () => null,
}));

vi.mock('@/lib/supabase/education/milestones', () => ({
  checkMilestoneCrossed: () => null,
  getMilestoneRewards: () => [],
  getMilestoneProgress: () => ({
    currentLevel: 7,
    nextMilestone: { level: 10, title: 'Ten' },
    progressPercent: 40,
    xpToNextMilestone: 466,
  }),
  getMilestones: () => [{ level: 10, title: 'Ten' }],
}));

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ sizeClassName }: { sizeClassName?: string }) => (
    <div data-testid="mascot" role="button" className={sizeClassName} />
  ),
}));

vi.mock('framer-motion', () => {
  const R = require('react');
  const Div = R.forwardRef(function Div(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return R.createElement('div', { ...rest, ref }, children);
  });
  return {
    m: { div: Div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { StudentHubProgressZone } from '../StudentHubProgressZone';

describe('StudentHubProgressZone labels', () => {
  it('renders no interpolation placeholder anywhere in the hero', () => {
    const { container } = render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(container.textContent ?? '').not.toMatch(/[{}]/);
  });

  it('gives the mascot button a text colour so the contrast audit can read it', () => {
    // The wrapper carries role="button" and an aria-label but renders no text,
    // so its computed colour is inherited from the navy page while its fill is
    // cream — the audit reads that as 1.02:1 text contrast and flags a control
    // that is actually fine. An explicit on-fill colour costs nothing visually
    // (there is no text node) and makes the measurement honest.
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByTestId('mascot').className).toContain('text-neo-black');
  });

  it('labels the rank and streak tiles with nouns, not count formats', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByText(en.leaderboard.rank)).toBeInTheDocument();
    expect(screen.getByText(en.education.xp.streak)).toBeInTheDocument();
  });
});
