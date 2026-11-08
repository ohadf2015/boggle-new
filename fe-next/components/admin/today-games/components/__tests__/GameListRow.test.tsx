import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameListRow } from '../GameListRow';
import { ShowChips } from '../ShowChips';
import type { GameGroup } from '@/lib/admin/gameLog/groupGames';

const t = (_k: string, fallback?: string) => fallback ?? _k;

function group(over: Partial<GameGroup> = {}): GameGroup {
  return {
    key: 'solo:1',
    gameCode: null,
    isMultiplayer: false,
    isRanked: false,
    modeRaw: 'singleplayer',
    typeBucket: 'singleplayer',
    language: 'en',
    createdAt: '2026-11-08T19:10:29.000Z',
    endedAt: '2026-11-08T19:10:29.000Z',
    status: 'abandoned',
    host: { displayName: 'Guest jhjquy', playerId: null, guestSessionId: 'guest_1_jhjquy533', profile: null } as GameGroup['host'],
    hostAcquisition: null,
    players: [],
    playerCount: 1,
    botCount: null,
    topScore: 0,
    totalWords: 0,
    errorReasons: [],
    isAutomated: false,
    subMode: 'challenge',
    durationSec: 3,
    engagement: 'never_played',
    ...over,
  } as GameGroup;
}

describe('GameListRow', () => {
  it('shows the mode with its sub-mode and a plain-words result', () => {
    render(<GameListRow group={group()} isOpen={false} onToggle={() => {}} t={t} />);
    expect(screen.getAllByText('Single Player · Timed solo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Left after 3s · never played').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0 pts · 0 words · 3s').length).toBeGreaterThan(0);
  });

  it('dims bot rows and labels them Bot', () => {
    render(<GameListRow group={group({ engagement: 'bot', isAutomated: true })} isOpen={false} onToggle={() => {}} t={t} />);
    expect(screen.getByRole('button')).toHaveClass('opacity-60');
    expect(screen.getAllByText('Bot').length).toBeGreaterThan(0);
  });

  it('a played, completed game reads Completed', () => {
    render(
      <GameListRow
        group={group({ status: 'completed', engagement: 'played', topScore: 42, totalWords: 6, durationSec: 60, subMode: null })}
        isOpen={false}
        onToggle={() => {}}
        t={t}
      />,
    );
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('42 pts · 6 words · 1:00').length).toBeGreaterThan(0);
  });
});

describe('ShowChips', () => {
  it('shows counts and reports the tapped filter', () => {
    const onChange = vi.fn();
    render(
      <ShowChips
        value="people"
        counts={{ people: 120, real: 90, empty: 30, bots: 1333, all: 1453 }}
        onChange={onChange}
        t={t}
      />,
    );
    expect(screen.getByTestId('show-chip-people')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('show-chip-bots')).toHaveTextContent('1,333');
    fireEvent.click(screen.getByTestId('show-chip-empty'));
    expect(onChange).toHaveBeenCalledWith('empty');
  });
});
