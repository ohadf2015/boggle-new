import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Swords } from 'lucide-react';
import type { ModeCubeModel } from '@/lib/landing/modeMeta';
import { HomeModeGrid } from '../HomeModeGrid';
import { LaunchProvider, LAUNCH_HOLD_MS } from '../HomeLaunch';
import { LaunchHost } from '../LaunchHost';
import { dropLaunch } from '../launchStore';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch: vi.fn() }),
  usePathname: () => '/en',
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: ({ fill: _f, placeholder: _p, blurDataURL: _b, ...props }: any) => <img {...props} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, prefetch: _p, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fallback?: string) => (k.startsWith('landing.badge.admin') ? fallback : k), language: 'en', dir: 'ltr' }),
}));

function model(key: string, over: Partial<ModeCubeModel> = {}): ModeCubeModel {
  return {
    key,
    title: key.toUpperCase(),
    href: `/en/${key}`,
    variant: 'pink',
    Icon: Swords,
    genIcon: `/modes/cubes/${key}.png`,
    role: key === 'arena' ? 'anchor' : 'normal',
    onClick: vi.fn(),
    ...over,
  };
}

const models = ['arena', 'adventure', 'wordTowerV2', 'brainGym', 'blast'].map((k) => model(k));
const extras = [model('practice'), model('crossword')];

describe('HomeModeGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockReset();
  });
  afterEach(() => {
    act(() => dropLaunch());
    vi.useRealTimers();
  });

  it('lays out the live arena first and the next four modes as tiles', () => {
    render(<HomeModeGrid models={models} extras={extras} liveCount={42} />);
    expect(screen.getByTestId('mode-cube-anchor')).toHaveAttribute('data-cube-key', 'arena');
    const sheet = screen.getByTestId('home-more-sheet');
    const tiles = screen
      .getAllByTestId('mode-cube')
      .filter((el) => !sheet.contains(el))
      .map((el) => el.getAttribute('data-cube-key'));
    expect(tiles).toEqual(['adventure', 'wordTowerV2', 'brainGym', 'blast']);
    expect(screen.getByTestId('home-live-count')).toHaveTextContent('42');
  });

  it('keeps the other modes one tap away in a sheet', () => {
    render(<HomeModeGrid models={models} extras={extras} liveCount={0} />);
    const sheet = screen.getByTestId('home-more-sheet');
    expect(sheet).not.toHaveAttribute('open');
    fireEvent.click(screen.getByTestId('landing-cubes-more'));
    expect(sheet).toHaveAttribute('open');
    const keys = within(sheet)
      .getAllByRole('link')
      .map((el) => el.getAttribute('data-cube-key'));
    expect(keys).toEqual(['practice', 'crossword']);
  });

  it('tracks the tap and launches into the mode', () => {
    render(
      <>
        <LaunchProvider>
          <HomeModeGrid models={models} extras={extras} liveCount={0} />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    fireEvent.click(screen.getByTestId('mode-cube-anchor'));
    expect(models[0].onClick).toHaveBeenCalled();
    expect(screen.getByTestId('home-launch')).toHaveTextContent('ARENA');
    act(() => {
      vi.advanceTimersByTime(LAUNCH_HOLD_MS);
    });
    expect(push).toHaveBeenCalledWith('/en/arena');
  });

  it('never launches a locked mode', () => {
    const locked = [model('arena', { locked: true, lockedMessage: 'offline' }), ...models.slice(1)];
    render(
      <>
        <LaunchProvider>
          <HomeModeGrid models={locked} extras={[]} liveCount={0} />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    fireEvent.click(screen.getByTestId('mode-cube-anchor'));
    expect(screen.queryByTestId('home-launch')).toBeNull();
    expect(screen.getByText('offline')).toBeInTheDocument();
  });

  it('speaks the badge in the page language instead of a raw English tag', () => {
    const tagged = [model('arena'), model('adventure', { badge: 'NEW' }), model('blast', { badge: 'BETA' }), model('rain', { badge: 'ADMIN' })];
    render(<HomeModeGrid models={tagged} extras={[]} liveCount={0} />);
    expect(screen.getByText('landing.badge.new')).toBeInTheDocument();
    expect(screen.getByText('landing.badge.beta')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('stacks the badge above the title instead of floating it over the art', () => {
    // Given a small tile tagged NEW
    const tagged = [model('arena'), model('wordTowerV2', { badge: 'NEW' })];
    // When the grid renders
    render(<HomeModeGrid models={tagged} extras={[]} liveCount={0} />);
    // Then the badge sits in the tile's label column, next to its title
    const label = screen.getByTestId('mode-tile-label');
    expect(within(label).getByText('landing.badge.new')).toBeInTheDocument();
    expect(within(label).getByText('WORDTOWERV2')).toBeInTheDocument();
  });

  it('lets a run in progress replace the NEW badge so the tile carries one chip', () => {
    // Given the adventure tile is both NEW and has a run to resume
    const resume = { world: 2, step: 5, hp: 3, maxHp: 6, relics: [], gold: 0 };
    const tagged = [model('arena'), model('adventure', { badge: 'NEW', resume })];
    // When the grid renders
    render(<HomeModeGrid models={tagged} extras={[]} liveCount={0} />);
    // Then only the resume pill shows
    expect(screen.getByTestId('mode-resume-chip')).toBeInTheDocument();
    expect(screen.queryByText('landing.badge.new')).not.toBeInTheDocument();
  });

  it('keeps the extra-modes count reading "+2" in right-to-left pages', () => {
    render(<HomeModeGrid models={models} extras={extras} liveCount={0} />);
    expect(screen.getByText('+2')).toHaveAttribute('dir', 'ltr');
  });
});
