import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LiveClassroomLeaderboard from '../LiveClassroomLeaderboard';

vi.mock('@/hooks/useModeSting', () => ({ useModeSting: () => ({ playModeSound: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));

describe('LiveClassroomLeaderboard — projector rows on a 1080p wall', () => {
  it('Given a 1080p-tall projector, Then names, ranks and scores step up a size for the back row', () => {
    render(<LiveClassroomLeaderboard variant="projector" leaderboard={[{ username: 'Ada', score: 3 }]} />);
    expect(screen.getByText('Ada').className).toContain('lg:[@media(min-height:1001px)]:text-4xl');
    expect(screen.getByText('3').className).toContain('lg:[@media(min-height:1001px)]:text-5xl');
    expect(screen.getAllByTestId('live-board-rank')[0].className).toContain('lg:[@media(min-height:1001px)]:h-14');
  });

  it('Given a 900px-tall projector (1440x900), Then rows stay dense so a class of four fits the card', () => {
    render(<LiveClassroomLeaderboard variant="projector" leaderboard={[{ username: 'Ada', score: 3 }]} />);
    expect(screen.getAllByTestId('live-board-row')[0].className).toContain('md:[@media(max-height:1000px)]:py-1.5');
    expect(screen.getByText('Ada').className).not.toContain('min-height:851px');
  });
});

describe('LiveClassroomLeaderboard — long names on the projector', () => {
  it('Given a 20-character name, Then it steps down a size and wraps to two lines inside the row instead of cutting to "Maximi…"', () => {
    render(<LiveClassroomLeaderboard variant="projector" leaderboard={[{ username: 'Maximiliana-Josefina', score: 51 }, { username: 'Ada', score: 3 }]} />);
    const long = screen.getByText('Maximiliana-Josefina');
    expect(long.className).not.toMatch(/\btruncate\b/);
    expect(long.className).toContain('line-clamp-2');
    expect(long.className).toContain('lg:[@media(min-height:1001px)]:text-2xl');
    expect(long).toHaveAttribute('title', 'Maximiliana-Josefina');
    expect(screen.getByText('Ada').className).toContain('lg:[@media(min-height:1001px)]:text-4xl');
  });
});

describe('LiveClassroomLeaderboard — long-name line height', () => {
  it('Given a wrapped name, Then its tight leading survives the size classes, so two lines stay inside the badge height', () => {
    render(<LiveClassroomLeaderboard variant="projector" leaderboard={[{ username: 'Maximiliana-Josefina', score: 51 }]} />);
    expect(screen.getByText('Maximiliana-Josefina').className).toContain('leading-[1.05]');
  });
});
