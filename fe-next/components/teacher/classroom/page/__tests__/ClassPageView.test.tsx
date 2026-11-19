import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassPageView, type ClassPageViewProps } from '../ClassPageView';

vi.mock('@/components/teacher/home/HomeShareSheet', () => ({ HomeShareSheet: () => null }));

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

  it('Given the class page, Then it uses the Home hero in purple: the class name, the join card and the big secondary', () => {
    render(<ClassPageView {...props({ rehearse: <button type="button" data-testid="rehearse-slot" /> })} />);
    const hero = screen.getByTestId('home-hero');
    expect(hero.className).toMatch(/(^|\s)bg-neo-purple(\s|$)/);
    expect(within(hero).getByTestId('home-join-row')).toContainElement(screen.getByTestId('class-page-code'));
    expect(within(hero).getByTestId('rehearse-slot')).toBeInTheDocument();
    expect(hero).toHaveTextContent('languages.english');
  });

  it('Given the last game is still being read, Then Start shows at once instead of a spinner', () => {
    render(<ClassPageView {...props({ replay: { kind: 'pending' } })} />);
    expect(screen.getByTestId('class-page-start')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
    expect(screen.queryByTestId('home-start-pending')).toBeNull();
  });

  it('Given a last game, Then it is one quiet row that opens the results', () => {
    render(<ClassPageView {...props()} />);
    const last = screen.getByTestId('class-page-last-game');
    expect(within(last).getAllByRole('link')).toHaveLength(1);
    expect(last.innerHTML).not.toMatch(/bg-neo-(yellow|cyan|cream)/);
  });

  it('Given word lists, Then they sit folded in one closed disclosure', () => {
    render(<ClassPageView {...props()} />);
    const fold = within(screen.getByTestId('class-page-lists')).getByTestId('class-page-lists-fold');
    expect(fold.tagName).toBe('DETAILS');
    expect(fold).not.toHaveAttribute('open');
  });

  it('Given no lists and no game yet, Then the last game hides and lists offer only the way forward', () => {
    render(<ClassPageView {...props({ lists: [], lastGame: { status: 'ready', game: null } })} />);
    expect(within(screen.getByTestId('class-page-lists')).getByRole('link')).toHaveAttribute('href', '/en/teacher/curriculum');
    expect(screen.getByTestId('class-page-lists')).not.toHaveTextContent('teacher.classPage.noLists');
    expect(screen.queryByTestId('class-page-last-game')).toBeNull();
  });

  it('Given the last game read failed, Then the row says so', () => {
    render(<ClassPageView {...props({ lastGame: { status: 'error', game: null } })} />);
    expect(screen.getByTestId('class-page-last-game')).toHaveTextContent('teacher.lastGame.error');
  });

  it('Given the danger zone, Then it is a quiet row with no red frame', () => {
    render(<ClassPageView {...props()} />);
    expect(screen.getByTestId('class-page-danger').className).not.toMatch(/border-neo-red|border-dashed/);
  });

  it('Given a Pro offer under the header, Then Start a game stays the only hero and the roster still shows', () => {
    render(<ClassPageView {...props({ proOffer: <div data-testid="classroom-pro-offer" /> })} />);
    const start = screen.getByTestId('class-page-start');
    expect(start).toHaveAttribute('data-hero', 'true');
    expect(document.querySelectorAll('[data-hero="true"]')).toHaveLength(1);
    expect(screen.getByTestId('roster-slot')).toBeInTheDocument();
    const offer = screen.getByTestId('classroom-pro-offer');
    expect(start.compareDocumentPosition(offer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(offer.compareDocumentPosition(screen.getByTestId('roster-slot')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
