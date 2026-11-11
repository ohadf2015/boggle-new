// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExitConfirmDialog } from '../HostDialogs';
import { classroomLobbyExitSkipsConfirm, countClassStudents } from '../exitConfirmModel';
import { PlayerRoundDialogs } from '@/player/components/in-game/PlayerRoundDialogs';

const t = (key: string) => key;

function dialogButtons(): HTMLElement[] {
  return screen.getAllByRole('button');
}

describe('ExitConfirmDialog — a classroom host who pressed exit mid-game', () => {
  afterEach(cleanup);

  it('Given a running class game, When the dialog opens, Then End game is the first button and is styled destructive', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} classroom phase="game" />);
    const [first, second] = dialogButtons();
    expect(first).toHaveTextContent('eduLive.exit.confirm');
    expect(first.className).toContain('bg-neo-red');
    expect(second).toHaveTextContent('eduLive.exit.stay');
  });

  it('Given a running class game, When the dialog opens, Then Keep playing is a quiet secondary, not the lime primary fill', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} classroom phase="game" />);
    const stay = screen.getByRole('button', { name: 'eduLive.exit.stay' });
    expect(stay.className).not.toContain('bg-neo-lime');
    expect(stay.className).toContain('bg-transparent');
    expect(stay.className).toContain('shadow-none!');
  });

  it('Given the footer stacks on a phone, When it renders, Then the visual order follows the DOM (no reversed column)', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} classroom phase="game" />);
    const footer = screen.getByRole('button', { name: 'eduLive.exit.confirm' }).parentElement as HTMLElement;
    expect(footer.className).not.toContain('flex-col-reverse');
    expect(footer.className).not.toContain('flex-row-reverse');
  });

  it('Given a running class game, When End game is pressed, Then the room exit is confirmed once', () => {
    const onConfirm = vi.fn();
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={onConfirm} t={t} classroom phase="game" />);
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Given no phase is passed, When the dialog opens, Then it keeps the mid-game copy', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} classroom />);
    expect(screen.getByText('eduLive.exit.title')).toBeInTheDocument();
    expect(screen.queryByText('eduLive.exit.lobbyTitle')).toBeNull();
  });
});

describe('ExitConfirmDialog — a classroom host in the lobby with students waiting', () => {
  afterEach(cleanup);

  it('Given the lobby, When the dialog opens, Then it asks one plain question about closing the room, never "Keep playing"', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} classroom phase="lobby" />);
    expect(screen.getByText('eduLive.exit.lobbyTitle')).toBeInTheDocument();
    expect(screen.getByText('eduLive.exit.lobbyBody')).toBeInTheDocument();
    expect(screen.queryByText('eduLive.exit.stay')).toBeNull();
    expect(screen.queryByText('eduLive.exit.title')).toBeNull();
  });

  it('Given the lobby, When the dialog opens, Then Close room leads and is destructive, Stay is secondary', () => {
    const onConfirm = vi.fn();
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={onConfirm} t={t} classroom phase="lobby" />);
    const [first, second] = dialogButtons();
    expect(first).toHaveTextContent('eduLive.exit.lobbyConfirm');
    expect(first.className).toContain('bg-neo-red');
    expect(second).toHaveTextContent('eduLive.exit.lobbyStay');
    fireEvent.click(first);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('countClassStudents — whether an empty lobby needs a confirm at all', () => {
  it('Given only the teacher, bots and the practice seat, When counted, Then there are no students', () => {
    const players = [
      { username: 'Ms K', isHost: true, playerId: 'h' },
      { username: 'Practice', isPractice: true, playerId: 'p' },
      { username: 'Bot 1', isBot: true },
    ];
    expect(countClassStudents(players)).toBe(0);
  });

  it('Given a student who shares the teacher display name, When counted, Then the student still counts', () => {
    const players = [
      { username: 'Ms K', isHost: true, playerId: 'host-1' },
      { username: 'Ms K', playerId: 'student-1' },
    ];
    expect(countClassStudents(players)).toBe(1);
  });

  it('Given the same student listed twice, When counted, Then the stable id counts them once', () => {
    expect(countClassStudents([{ username: 'Dana', playerId: 's1' }, { username: 'Dana', playerId: 's1' }])).toBe(1);
  });

  it('Given no roster yet, When counted, Then zero', () => {
    expect(countClassStudents(undefined)).toBe(0);
  });
});

describe('classroomLobbyExitSkipsConfirm — leaving silently needs a known, empty roster', () => {
  it('Given no roster update has arrived for this room, When the host presses exit, Then the dialog is asked', () => {
    expect(classroomLobbyExitSkipsConfirm({ classroom: true, rosterKnown: false, players: [] })).toBe(false);
  });

  it('Given a roster update showed only the teacher, When the host presses exit, Then it exits without asking', () => {
    expect(classroomLobbyExitSkipsConfirm({ classroom: true, rosterKnown: true, players: [{ username: 'Ms K', isHost: true }] })).toBe(true);
  });

  it('Given a roster with a student named like the teacher, When the host presses exit, Then the dialog is asked', () => {
    const players = [{ username: 'Ms K', isHost: true, playerId: 'h' }, { username: 'Ms K', playerId: 's' }];
    expect(classroomLobbyExitSkipsConfirm({ classroom: true, rosterKnown: true, players })).toBe(false);
  });

  it('Given an arcade room, When the host presses exit, Then the dialog is always asked', () => {
    expect(classroomLobbyExitSkipsConfirm({ classroom: false, rosterKnown: true, players: [] })).toBe(false);
  });
});

describe('ExitConfirmDialog — arcade host is untouched', () => {
  afterEach(cleanup);

  it('Given an arcade room, When the dialog opens, Then Cancel still comes first with the original copy and classes', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} />);
    const [first, second] = dialogButtons();
    expect(first).toHaveTextContent('common.cancel');
    expect(first.className).toContain('bg-neo-navy/30');
    expect(second).toHaveTextContent('common.confirm');
    expect(second.className).toContain('bg-neo-red');
    expect(screen.getByText('hostView.exitWarning')).toBeInTheDocument();
  });
});

describe('Student leave dialog — a separate component, unchanged', () => {
  afterEach(cleanup);

  it('Given a student pressed leave, When the dialog opens, Then it keeps its own copy with Cancel first', () => {
    const onConfirmExit = vi.fn();
    render(
      <PlayerRoundDialogs
        t={t}
        tournamentData={null}
        tournamentStandings={[]}
        showTournamentStandings={false}
        setShowTournamentStandings={() => {}}
        showExitConfirm
        setShowExitConfirm={() => {}}
        onConfirmExit={onConfirmExit}
      />,
    );
    expect(screen.getByText('playerView.exitConfirmation')).toBeInTheDocument();
    expect(screen.queryByText('eduLive.exit.title')).toBeNull();
    const [first, second] = dialogButtons();
    expect(first).toHaveTextContent('common.cancel');
    expect(second).toHaveTextContent('common.confirm');
    fireEvent.click(second);
    expect(onConfirmExit).toHaveBeenCalledTimes(1);
  });
});
