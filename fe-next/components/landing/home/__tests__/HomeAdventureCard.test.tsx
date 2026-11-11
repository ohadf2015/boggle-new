import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeAdventureCard } from '../HomeAdventureCard';
import { LaunchProvider } from '../HomeLaunch';
import { LaunchHost } from '../LaunchHost';
import { dropLaunch } from '../launchStore';
import { runStorageKey } from '@/components/adventure/play/runStorage';
import { trackLandingCtaClick, trackModeSelected, trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/en',
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: ({ fill: _f, sizes: _s, priority: _p, ...props }: any) => <img {...props} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, prefetch: _p, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
  trackModeSelected: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));

const seedRun = (world: number, run: Record<string, unknown>) =>
  localStorage.setItem(runStorageKey(world), JSON.stringify({ runToken: 'tok', run: { path: [], gold: 40, relics: [], ...run } }));

const card = () => screen.getByTestId('home-adventure-card');

describe('HomeAdventureCard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(trackLandingCtaClick).mockClear();
    vi.mocked(trackModeSelected).mockClear();
    vi.mocked(trackGrowthEvent).mockClear();
  });
  afterEach(() => {
    act(() => dropLaunch());
  });

  it('Given no stored run, when it renders, then it invites the player into the adventure map', () => {
    render(<HomeAdventureCard />);
    expect(card()).toHaveAttribute('href', '/en/adventure');
    expect(card()).toHaveAttribute('data-state', 'invite');
    expect(screen.getByText('landing.home.adventureStartTitle')).toBeInTheDocument();
    expect(screen.getByText('landing.adventureModeDesc')).toBeInTheDocument();
    expect(screen.getByText('landing.home.adventureStartCta')).toBeInTheDocument();
    expect(screen.queryByTestId('home-adventure-rail')).toBeNull();
  });

  it('Given a run in progress, when it renders, then it offers to continue that run with world, node, hearts and relics', () => {
    seedRun(3, { step: 5, hp: 2, maxHp: 6, relics: ['magnet', 'hourglass'] });
    render(<HomeAdventureCard />);
    expect(card()).toHaveAttribute('href', '/en/adventure?world=3');
    expect(card()).toHaveAttribute('data-state', 'resume');
    expect(screen.getByText('landing.home.adventureContinueTitle')).toBeInTheDocument();
    expect(screen.getByText(/landing\.home\.adventureRunProgress/)).toHaveTextContent('"world":3');
    expect(screen.getByText(/landing\.home\.adventureRunProgress/)).toHaveTextContent('"step":5');
    expect(screen.getByTestId('home-adventure-hearts')).toHaveTextContent('2/6');
    expect(screen.getByTestId('home-adventure-relics').querySelectorAll('img')).toHaveLength(2);
    expect(screen.getByTestId('home-adventure-rail')).toBeInTheDocument();
    expect(screen.getByText('landing.home.adventureContinueCta')).toBeInTheDocument();
  });

  it('Given a run in progress, when the server renders, then it paints the invite state so hydration never flips the first paint', () => {
    seedRun(3, { step: 5, hp: 2, maxHp: 6 });
    const html = renderToString(<HomeAdventureCard />);
    expect(html).toContain('data-state="invite"');
    expect(html).toContain('landing.home.adventureStartTitle');
  });

  it('Given either state, when it renders, then the box keeps the same fixed height classes so the swap never shifts layout', () => {
    const { unmount } = render(<HomeAdventureCard />);
    const inviteClass = card().className;
    unmount();
    seedRun(2, { step: 4, hp: 3, maxHp: 6 });
    render(<HomeAdventureCard />);
    const heights = (cls: string) => cls.split(/\s+/).filter((c) => /(^|:)h-/.test(c)).sort();
    expect(heights(inviteClass).length).toBeGreaterThan(0);
    expect(heights(card().className)).toEqual(heights(inviteClass));
    expect(inviteClass).not.toMatch(/(^|\s)min-h-/);
  });

  it('Given an untouched or dead run, when it renders, then it does not pretend there is a run to continue', () => {
    seedRun(1, { step: 1, hp: 6, maxHp: 6 });
    seedRun(2, { step: 6, hp: 0, maxHp: 6 });
    render(<HomeAdventureCard />);
    expect(card()).toHaveAttribute('data-state', 'invite');
  });

  it('Given a click, then it fires the same events the Adventure tile fired plus its own CTA id, and launches the curtain', () => {
    seedRun(4, { step: 3, hp: 5, maxHp: 6 });
    render(
      <>
        <LaunchProvider>
          <HomeAdventureCard />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    fireEvent.click(card());
    expect(trackModeSelected).toHaveBeenCalledWith('adventure', 'home');
    expect(trackGrowthEvent).toHaveBeenCalledWith('featured_mode_card_clicked', { mode: 'adventure', surface: 'home' });
    expect(trackLandingCtaClick).toHaveBeenCalledWith('adventure_card', { mode: 'adventure', resume: true, opens_ftue: false, world: 4 });
    expect(screen.getByTestId('home-launch')).toBeInTheDocument();
  });
});
