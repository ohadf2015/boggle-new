import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LiveClassroomLeaderboard from '../LiveClassroomLeaderboard';

vi.mock('@/hooks/useModeSting', () => ({ useModeSting: () => ({ playModeSound: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));

describe('LiveClassroomLeaderboard — projector rows on a teacher phone', () => {
  it('Given a 390px host screen, Then each row shrinks so several students fit above the control strip', () => {
    render(
      <LiveClassroomLeaderboard
        variant="projector"
        leaderboard={[{ username: 'Ada', score: 3 }, { username: 'Bo', score: 1 }]}
      />
    );
    const row = screen.getAllByTestId('live-board-row')[0];
    expect(row.className).toContain('max-md:py-1.5');
    expect(row.className).toContain('max-md:px-3');
    expect(screen.getAllByTestId('live-board-rank')[0].className).toContain('max-md:h-9');
  });
});
