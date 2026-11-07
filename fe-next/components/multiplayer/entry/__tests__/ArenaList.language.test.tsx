import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActiveRoom, Language } from '@/shared/types/game';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/utils/posthogEngagement', () => ({
  trackMpRoomJoinClicked: vi.fn(),
  trackMpRoomJoinBlocked: vi.fn(),
}));

import { ArenaList } from '../ArenaList';

const room = (gameCode: string, language: Language, over: Partial<ActiveRoom> = {}): ActiveRoom => ({
  gameCode, language, roomName: gameCode, playerCount: 2, maxPlayers: 8, gameState: 'waiting', isRanked: false, createdAt: 1, ...over,
});

const mixed = [room('EN1', 'en'), room('HE1', 'he', { playerCount: 3 }), room('EN2', 'en')];

function renderList(over: Partial<React.ComponentProps<typeof ArenaList>> = {}) {
  const props = {
    rooms: mixed, loading: false, joiningRoomCode: null, language: 'en' as Language,
    onRoomClick: vi.fn(), onRefresh: vi.fn(), onLanguageChange: vi.fn(), onStartRoom: vi.fn(), ...over,
  };
  render(<ArenaList {...props} />);
  return props;
}

const listedCodes = () =>
  within(screen.getByRole('list', { name: 'multiplayerFlow.roomList.roomsListLabel' }))
    .getAllByRole('button')
    .map((b) => b.getAttribute('data-code'));

describe('ArenaList language filter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given English and Hebrew rooms, When the filter is English, Then only English rooms are listed', () => {
    renderList();
    expect(listedCodes()).toEqual(['EN1', 'EN2']);
  });

  it('Given the filter is Hebrew, When rendered, Then the Hebrew room shows and the English ones do not', () => {
    renderList({ language: 'he' });
    expect(listedCodes()).toEqual(['HE1']);
  });

  it('Given rooms in two languages, When a chip is pressed, Then the filter switches to it', () => {
    const p = renderList();
    const filter = screen.getByRole('group', { name: 'mpUi.entry.roomLanguage' });
    expect(within(filter).getByTestId('arena-lang-en')).toHaveAttribute('aria-pressed', 'true');
    expect(within(filter).getByTestId('arena-lang-he')).toHaveAttribute('aria-pressed', 'false');
    expect(within(filter).getByTestId('arena-lang-he').textContent).toContain('1');
    fireEvent.click(within(filter).getByTestId('arena-lang-he'));
    expect(p.onLanguageChange).toHaveBeenCalledWith('he');
  });

  it('Given a filter, When counting players online, Then only that language counts', () => {
    renderList({ language: 'he' });
    expect(screen.getByTestId('arena-online').textContent).toContain('"count":3');
  });

  it('Given no Swedish rooms but English ones, When filtered to Swedish, Then the empty state names Swedish, offers Start one and points to English', () => {
    const p = renderList({ language: 'sv' });
    const empty = screen.getByTestId('arena-empty-state');
    expect(empty.textContent).toContain('mpUi.entry.emptyInLanguage');
    expect(empty.textContent).toContain('Swedish');
    fireEvent.click(within(empty).getByTestId('arena-empty-start'));
    expect(p.onStartRoom).toHaveBeenCalled();
    const elsewhere = within(empty).getByTestId('arena-empty-elsewhere');
    expect(elsewhere.textContent).toContain('"count":2');
    expect(elsewhere.textContent).toContain('English');
    fireEvent.click(elsewhere);
    expect(p.onLanguageChange).toHaveBeenCalledWith('en');
  });

  it('Given no rooms at all, When empty, Then Start one is the only action and nothing links out of MP', () => {
    renderList({ rooms: [] });
    const empty = screen.getByTestId('arena-empty-state');
    expect(within(empty).getAllByRole('button').map((b) => b.dataset.testid)).toEqual(['arena-empty-start']);
    expect(empty.querySelector('a')).toBeNull();
  });

  it('Given a full room, When its row is pressed, Then no join is attempted', () => {
    const p = renderList({ rooms: [room('FULL', 'en', { playerCount: 8, maxPlayers: 8 })] });
    const row = screen.getByRole('button', { name: /FULL/ });
    expect(row).toBeDisabled();
    fireEvent.click(row);
    expect(p.onRoomClick).not.toHaveBeenCalled();
  });
});
