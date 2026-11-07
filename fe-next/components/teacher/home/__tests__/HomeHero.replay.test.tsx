import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));

import { HomeHero } from '../HomeHero';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4 };
const REPLAY_HREF = '/en/education/classroom-game?flow=quick&classroomId=c1&lessonId=l2&mode=word-hunt';

describe('<HomeHero> week-two replay', () => {
  it('Given a returning class, Then Play again is the one primary and names the mode and list it will run', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} replay={{ kind: 'ready', href: REPLAY_HREF, detail: 'Word Hunt · Week 2' }} />);
    const play = screen.getByTestId('home-play-again');
    expect(play).toHaveAttribute('href', REPLAY_HREF);
    expect(play).toHaveTextContent('eduShell.home.loop.playAgain');
    expect(play).toHaveTextContent('Word Hunt · Week 2');
    expect(screen.queryByTestId('home-start-live')).toBeNull();
  });

  it('Then a quieter link still opens the full game picker for the class', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} replay={{ kind: 'ready', href: REPLAY_HREF, detail: 'x' }} />);
    const pick = screen.getByTestId('home-pick-game');
    expect(pick).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
    expect(pick).toHaveTextContent('eduShell.home.loop.pickGame');
  });

  it('Given the last game is still being read, Then the primary slot holds a busy placeholder, neither Start nor Play again', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} replay={{ kind: 'pending' }} />);
    const slot = screen.getByTestId('home-start-pending');
    expect(slot).toHaveAttribute('aria-busy', 'true');
    expect(within(slot).getByText('eduShell.home.loop.loading')).toBeInTheDocument();
    expect(screen.queryByTestId('home-start-live')).toBeNull();
    expect(screen.queryByTestId('home-play-again')).toBeNull();
  });

  it('Given no replay, Then Start live game stays the primary', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.getByTestId('home-start-live')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
    expect(screen.queryByTestId('home-pick-game')).toBeNull();
  });
});
