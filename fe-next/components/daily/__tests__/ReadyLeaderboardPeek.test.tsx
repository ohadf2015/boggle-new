import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import ReadyLeaderboardPeek from '../ReadyLeaderboardPeek';

const t = (key: string) => key;

describe('ReadyLeaderboardPeek', () => {
  it('keeps the board closed until one tap opens it', () => {
    render(
      <ReadyLeaderboardPeek t={t}>
        <div data-testid="board-body">board</div>
      </ReadyLeaderboardPeek>,
    );
    expect(screen.queryByTestId('board-body')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'wordWheel.climb.showBoard' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    expect(screen.getByTestId('board-body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'wordWheel.climb.hideBoard' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('opens on its own once a wide layout resolves after mount', () => {
    const { rerender } = render(
      <ReadyLeaderboardPeek t={t}>
        <div data-testid="board-body">board</div>
      </ReadyLeaderboardPeek>,
    );
    expect(screen.queryByTestId('board-body')).toBeNull();
    rerender(
      <ReadyLeaderboardPeek t={t} defaultOpen>
        <div data-testid="board-body">board</div>
      </ReadyLeaderboardPeek>,
    );
    expect(screen.getByTestId('board-body')).toBeInTheDocument();
  });
});
