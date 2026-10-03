import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LiveClassroomLeaderboard from '../LiveClassroomLeaderboard';

vi.mock('@/hooks/useModeSting', () => ({ useModeSting: () => ({ playModeSound: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));

describe('LiveClassroomLeaderboard — projector rows on a short wall (1366x768)', () => {
  it('Given a short projector, Then rows tighten so three or more students fit above the control strip', () => {
    render(
      <LiveClassroomLeaderboard
        variant="projector"
        leaderboard={[{ username: 'Ada', score: 3 }, { username: 'Bo', score: 1 }]}
      />
    );
    const row = screen.getAllByTestId('live-board-row')[0];
    expect(row.className).toContain('md:[@media(max-height:1000px)]:py-1.5');
    expect(screen.getAllByTestId('live-board-rank')[0].className).toContain('md:[@media(max-height:1000px)]:h-9');
    expect(screen.getByText('Ada').className).toContain('md:[@media(max-height:1000px)]:text-2xl');
  });
});
