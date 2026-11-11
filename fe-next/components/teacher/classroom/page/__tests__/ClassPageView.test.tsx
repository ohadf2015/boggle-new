import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassPageView, type ClassPageViewProps } from '../ClassPageView';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

function props(over: Partial<ClassPageViewProps> = {}): ClassPageViewProps {
  return {
    classroom: { id: 'c1', name: 'Room 4', join_code: 'KITE43', language: 'en', member_count: 3 },
    language: 'en',
    classesHref: '/en/teacher/classroom',
    startHref: '/en/education/classroom-game?classroomId=c1',
    resultsHref: '/en/teacher/classroom/c1/analytics',
    libraryHref: '/en/teacher/curriculum',
    roster: <div data-testid="roster-slot" />,
    lists: [{ id: 'L1', name: 'Physics', wordCount: 8 }],
    listsLoading: false,
    lastGame: { status: 'ready', game: { playedAt: '2026-11-10T09:00:00Z', players: [{ name: 'Noa', score: 40 }], participation: { played: 3, roster: 4 }, coveragePct: 75 } },
    onShare: vi.fn(),
    onRequestDelete: vi.fn(),
    t,
    ...over,
  };
}

describe('ClassPageView', () => {
  it('Given a class, Then its name, join code, share and one Start a game primary lead the page', () => {
    const p = props();
    render(<ClassPageView {...p} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Room 4');
    expect(screen.getByTestId('class-page-code')).toHaveTextContent('KITE43');
    fireEvent.click(screen.getByTestId('class-page-share'));
    expect(p.onShare).toHaveBeenCalledTimes(1);
    const start = screen.getByTestId('class-page-start');
    expect(start).toHaveAttribute('href', p.startHref);
    expect(start).toHaveTextContent('eduShell.home.startLive');
    expect(document.querySelectorAll('[data-hero="true"]')).toHaveLength(1);
    expect(start).toHaveAttribute('data-hero', 'true');
  });

  it('Given the class, Then the roster, its word lists and the last game with a link to results show', () => {
    render(<ClassPageView {...props()} />);
    expect(screen.getByTestId('roster-slot')).toBeInTheDocument();
    expect(within(screen.getByTestId('class-page-lists')).getByText('Physics')).toBeInTheDocument();
    const last = screen.getByTestId('class-page-last-game');
    expect(last).toHaveTextContent('Noa');
    expect(within(last).getByRole('link')).toHaveAttribute('href', '/en/teacher/classroom/c1/analytics');
  });

  it('Given no lists and no game yet, Then each block says so in one line with a way forward', () => {
    render(<ClassPageView {...props({ lists: [], lastGame: { status: 'ready', game: null } })} />);
    expect(within(screen.getByTestId('class-page-lists')).getByRole('link')).toHaveAttribute('href', '/en/teacher/curriculum');
    expect(screen.getByTestId('class-page-last-game')).toHaveTextContent('teacher.lastGame.emptyTitle');
  });

  it('Given the page, Then delete sits last in a danger zone and only asks to confirm', () => {
    const p = props();
    render(<ClassPageView {...p} />);
    const zone = screen.getByTestId('class-page-danger');
    const all = Array.from(document.querySelectorAll('section'));
    expect(all[all.length - 1]).toBe(zone);
    fireEvent.click(within(zone).getByTestId('delete-class-affordance'));
    expect(p.onRequestDelete).toHaveBeenCalledTimes(1);
  });
});
