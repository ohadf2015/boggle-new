import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const holiday = vi.fn();
const replace = vi.fn();
const push = vi.fn();
let search = '';
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holiday() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => '/he/holiday-arcade',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('../ArcadeGameHost', () => ({ default: ({ game }: { game: string }) => <div data-testid="host">{game}</div> }));
const prefetch = vi.hoisted(() => vi.fn());
vi.mock('../gameLoaders', () => ({ prefetchGame: prefetch }));

import ArcadeHub from '../ArcadeHub';
import ArcadeTile from '../ArcadeTile';

beforeEach(() => {
  search = '';
  replace.mockReset();
  push.mockReset();
});

describe('ArcadeHub', () => {
  it('Given the holiday is still resolving, then it waits and never redirects', () => {
    holiday.mockReturnValue({ holiday: null, resolved: false });
    render(<ArcadeHub />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('Given no holiday is active, then the player is sent home in their language', () => {
    holiday.mockReturnValue({ holiday: null, resolved: true });
    render(<ArcadeHub />);
    expect(replace).toHaveBeenCalledWith('/he');
  });

  it('Given Hanukkah, then its three party games are offered and picking one opens it', () => {
    holiday.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    render(<ArcadeHub />);
    const picks = screen.getAllByTestId(/^arcade-pick-/).map((el) => el.dataset.testid);
    expect(picks).toEqual(['arcade-pick-latke', 'arcade-pick-spin', 'arcade-pick-catch']);
    fireEvent.click(screen.getByTestId('arcade-pick-catch'));
    expect(push).toHaveBeenCalledWith('/he/holiday-arcade?g=catch', { scroll: false });
  });

  it('Given a shared link to the other holiday game or a retired word game, then the hub ignores it', () => {
    search = 'g=dash';
    holiday.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    render(<ArcadeHub />);
    expect(screen.queryByTestId('host')).toBeNull();
    search = 'g=oil';
    render(<ArcadeHub />);
    expect(screen.queryByTestId('host')).toBeNull();
    search = 'g=spin';
    render(<ArcadeHub />);
    expect(screen.getByTestId('host')).toHaveTextContent('spin');
  });

  it('Given Christmas, then only party games show, each with a Pass & Play badge and no word section', () => {
    holiday.mockReturnValue({ holiday: 'christmas', resolved: true });
    render(<ArcadeHub />);
    const picks = screen.getAllByTestId(/^arcade-pick-/).map((el) => el.dataset.testid);
    expect(picks).toEqual(['arcade-pick-presents', 'arcade-pick-splat', 'arcade-pick-dash']);
    expect(screen.getAllByText('holiday.arcade.family.badge')).toHaveLength(3);
    expect(screen.queryByText('holiday.arcade.wordSection')).toBeNull();
  });

  it('Given a finger lands on a card, then that game starts loading before the tap finishes', () => {
    holiday.mockReturnValue({ holiday: 'christmas', resolved: true });
    render(<ArcadeHub />);
    fireEvent.pointerDown(screen.getByTestId('arcade-pick-dash'));
    expect(prefetch).toHaveBeenCalledWith('dash');
  });

  it('Given the preview before the event, then the tile is locked with its opening date and links nowhere', () => {
    render(<ArcadeTile holiday="christmas" opensOn="2026-12-13" />);
    const tile = screen.getByTestId('holiday-arcade-tile');
    expect(tile).not.toHaveAttribute('href');
    expect(tile).toHaveAttribute('aria-disabled', 'true');
    expect(tile.textContent).toContain('holiday.arcade.tileLocked');
  });

  it('Given the event card tile, then it links to the arcade in the player language', () => {
    render(<ArcadeTile holiday="christmas" />);
    expect(screen.getByTestId('holiday-arcade-tile')).toHaveAttribute('href', '/he/holiday-arcade');
  });
});
