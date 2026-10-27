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

const models = ['arena', 'adventure', 'wordTowerV2', 'brainGym', 'blast', 'connections', 'wordCraft', 'crossword'].map((k) => model(k));

describe('HomeModeGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockReset();
  });
  afterEach(() => {
    act(() => dropLaunch());
    vi.useRealTimers();
  });

  it('shows every mode on the page with no "more modes" detour', () => {
    render(<HomeModeGrid models={models} liveCount={42} />);
    expect(screen.queryByTestId('landing-cubes-more')).toBeNull();
    expect(screen.queryByTestId('home-more-sheet')).toBeNull();
    const keys = screen.getAllByTestId(/^mode-cube/).map((el) => el.getAttribute('data-cube-key'));
    expect(keys.sort()).toEqual(models.map((m) => m.key).sort());
    expect(screen.getByTestId('mode-cube-anchor')).toHaveAttribute('data-cube-key', 'arena');
    expect(screen.getByTestId('home-live-count')).toHaveTextContent('42');
  });

  it('organises modes into titled groups in intent order', () => {
    render(<HomeModeGrid models={models} liveCount={0} />);
    const groups = screen.getAllByTestId(/^home-group-/);
    expect(groups.map((g) => g.getAttribute('data-testid'))).toEqual(['home-group-together', 'home-group-solo', 'home-group-think']);
    expect(within(groups[0]).getByRole('heading')).toHaveTextContent('landing.home.groupTogether');
    expect(within(groups[1]).getByRole('heading')).toHaveTextContent('landing.home.groupSolo');
    expect(within(groups[2]).getByRole('heading')).toHaveTextContent('landing.home.groupThink');
    const keysIn = (g: HTMLElement) => within(g).getAllByTestId(/^mode-cube/).map((el) => el.getAttribute('data-cube-key'));
    expect(keysIn(groups[1])).toEqual(['adventure', 'wordTowerV2', 'brainGym', 'blast']);
    expect(keysIn(groups[2])).toEqual(['connections', 'wordCraft', 'crossword']);
  });

  it('leaves out a group nobody can see and labels previews only when present', () => {
    const { rerender } = render(<HomeModeGrid models={models.slice(0, 5)} liveCount={0} />);
    expect(screen.queryByTestId('home-group-think')).toBeNull();
    expect(screen.queryByTestId('home-group-preview')).toBeNull();
    rerender(<HomeModeGrid models={[...models.slice(0, 5), model('wordfall', { badge: 'ADMIN' })]} liveCount={0} />);
    expect(within(screen.getByTestId('home-group-preview')).getByRole('heading')).toHaveTextContent('landing.home.groupPreview');
  });

  it('tracks the tap and launches into the mode', () => {
    render(
      <>
        <LaunchProvider>
          <HomeModeGrid models={models} liveCount={0} />
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
          <HomeModeGrid models={locked} liveCount={0} />
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
    render(<HomeModeGrid models={tagged} liveCount={0} />);
    expect(screen.getByText('landing.badge.new')).toBeInTheDocument();
    expect(screen.getByText('landing.badge.beta')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('stacks the badge above the title instead of floating it over the art', () => {
    // Given a small tile tagged NEW
    const tagged = [model('arena'), model('wordTowerV2', { badge: 'NEW' })];
    // When the grid renders
    render(<HomeModeGrid models={tagged} liveCount={0} />);
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
    render(<HomeModeGrid models={tagged} liveCount={0} />);
    // Then only the resume pill shows
    expect(screen.getByTestId('mode-resume-chip')).toBeInTheDocument();
    expect(screen.queryByText('landing.badge.new')).not.toBeInTheDocument();
  });

  it('gives each tile a who-you-play-with chip and a one-line pitch', () => {
    const tagged = [
      model('arena', { tag: { players: 'multiplayer' } }),
      model('wordCraft', { tag: { players: 'vsBot', untimed: true }, description: 'Claim the grid' }),
    ];
    render(<HomeModeGrid models={tagged} liveCount={0} />);
    const label = screen.getByTestId('mode-tile-label');
    expect(within(label).getByTestId('mode-tag')).toHaveTextContent('landing.home.modeTag.vsBot');
    expect(within(label).getByTestId('mode-tag')).toHaveTextContent('landing.home.modeTag.untimed');
    expect(within(label).getByTestId('mode-tile-desc')).toHaveTextContent('Claim the grid');
    expect(screen.getByTestId('mode-cube-anchor')).toHaveTextContent('landing.home.modeTag.multiplayer');
  });

  it('keeps the hover lift behind motion-safe (reduced motion gets no movement)', () => {
    render(<HomeModeGrid models={models} liveCount={0} />);
    for (const tile of screen.getAllByTestId('mode-cube')) {
      expect(tile.className).toContain('motion-safe:hover:-translate-y-0.5');
      expect(tile.className).not.toMatch(/(^|\s)hover:-translate-y/);
    }
  });
});
