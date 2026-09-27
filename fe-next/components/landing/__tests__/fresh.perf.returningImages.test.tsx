/**
 * Piece D (perf), SPEC section 10 item 6: returning-tree images must not be
 * `priority`.
 *
 * The server renders BOTH home trees (CSS shows one, see ../homeTree). A
 * `priority` next/image in the returning tree therefore emits a high-priority
 * `<link rel="preload" as="image">` into every fresh visitor's HTML, for an
 * image that sits inside a `display:none` subtree they never see
 * (daily.png cube, arena.png anchor cube). Lazy images inside `display:none`
 * are never fetched, and for returning users they are visible, so they load.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { BookOpen, Swords } from 'lucide-react';

const imageProps: Array<Record<string, unknown>> = [];
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    imageProps.push(props);
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" src={String(props.src)} />;
  },
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useDailyChallengeStats', () => ({
  useDailyChallengeStats: () => ({
    countdown: '05:00:00',
    hasPlayed: false,
    hasSolved: false,
    streak: 0,
    puzzleNumber: 1,
    isClient: true,
    loading: false,
  }),
}));
vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => ({ loading: false, currentStreak: 0, completedDates: [], cycleStart: '' }),
}));
vi.mock('@/utils/dailyChallenge/storage', () => ({ getLastSevenDaysCompletion: () => [] }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

import { HomeDailyHero } from '../home/HomeDailyHero';
import { LandingModeCubes } from '../LandingModeCubes';

describe('returning-tree images never preload for fresh visitors', () => {
  beforeEach(() => {
    imageProps.length = 0;
  });

  it('shouldNotPrioritiseTheDailyHeroCube', () => {
    // GIVEN the returning tree's daily hero
    render(<HomeDailyHero />);
    // THEN none of its images is a priority preload
    expect(imageProps.length).toBeGreaterThan(0);
    expect(imageProps.filter((p) => p.priority)).toEqual([]);
  });

  it('shouldNotPrioritiseTheAnchorModeCube', () => {
    // GIVEN the returning tree's mode cubes with an art-backed anchor
    render(
      <LandingModeCubes
        t={(k: string) => k}
        dailyNode={<div />}
        models={[
          {
            key: 'arena',
            title: 'Arena',
            href: '/en/multiplayer',
            variant: 'pink',
            Icon: Swords,
            role: 'anchor',
            genIcon: '/modes/cubes/arena.png',
            onClick: vi.fn(),
          },
          {
            key: 'practice',
            title: 'Practice',
            href: '/en/practice',
            variant: 'cyan',
            Icon: BookOpen,
            role: 'normal',
            genIcon: '/modes/cubes/practice.png',
            onClick: vi.fn(),
          },
        ]}
        extras={[]}
        sectionLabel="Game modes"
      />,
    );
    // THEN the anchor art renders but is not a priority preload
    expect(imageProps.some((p) => p.src === '/modes/cubes/arena.png')).toBe(true);
    expect(imageProps.filter((p) => p.priority)).toEqual([]);
  });
});
