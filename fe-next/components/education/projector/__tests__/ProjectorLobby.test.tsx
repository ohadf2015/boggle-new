import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
let mockLiveGame: unknown = null;
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => mockLiveGame }));
vi.mock('@/components/education/lobby/LobbyModeSwitcher', () => ({
  LobbyModeSwitcher: ({ currentMode }: { currentMode: string }) => <button type="button" data-testid="mode-switcher">{currentMode}</button>,
}));
vi.mock('@/components/education/projector/ProjectorQuizBlocked', () => ({
  useQuizStartRefused: () => [false, vi.fn()],
  ProjectorQuizBlocked: () => <div data-testid="quiz-blocked" />,
}));
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({ readLocalGameMode: () => null }));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => socket }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="join-qr" data-value={value} /> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open ? <button type="button" data-testid="remove-confirm-ok" onClick={onConfirm} /> : null,
}));

import ProjectorLobby from '../ProjectorLobby';
import { PROJECTOR_LOBBY_Z } from '@/lib/education/roundEndLayer';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const base = {
  gameCode: 'AB12CD',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string; isBot?: boolean }[],
  t,
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  classroomGameMode: 'classic' as const,
};

describe('ProjectorLobby — the wall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLiveGame = null;
  });

  it('owns the screen above the page header, dark-only, as a size container so it fits any frame', () => {
    render(<ProjectorLobby {...base} />);
    const root = screen.getByTestId('projector-lobby');
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('inset-0');
    expect(root.className).toContain(`z-[${PROJECTOR_LOBBY_Z}]`);
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toMatch(/dark:bg-|bg-neo-cream/);
    expect(root.className).toContain('[container-type:size]');
  });

  it('sizes nothing from the viewport', () => {
    const { container } = render(<ProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    expect(container.innerHTML).not.toMatch(/\[[^\]]*\d(vw|vh|dvh)\b/);
    expect(container.innerHTML).not.toMatch(/(^|[\s"])(sm|md|lg|xl|max-md):/);
  });

  it('carries its own way out, since it covers the page header', () => {
    render(<ProjectorLobby {...base} />);
    fireEvent.click(screen.getByTestId('projector-exit'));
    expect(base.onExitRoom).toHaveBeenCalledTimes(1);
  });

  it('keeps the join hero at its content height in a narrow frame, so the roster can never slide over the QR', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    const classes = (screen.getByTestId('projector-join-panel').parentElement as HTMLElement).className.split(/\s+/);
    expect(classes).not.toContain('min-h-0');
    expect(classes).toContain('@5xl:min-h-0');
  });

  it('puts the join hero first and the roster beside it, one code and one QR in total', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    const hero = screen.getByTestId('projector-join-panel');
    const roster = screen.getByTestId('projector-roster');
    expect(hero.compareDocumentPosition(roster) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId('join-qr')).toHaveLength(1);
    expect(screen.getAllByTestId('projector-code')).toHaveLength(1);
    expect(screen.getByTestId('join-qr')).toHaveAttribute('data-value', 'https://www.lexiclash.live/en/join/AB12CD');
  });
});

describe('ProjectorLobby — the session it is projecting', () => {
  beforeEach(() => {
    mockLiveGame = null;
  });

  it('names the class the server resolved, the lesson and its word count', () => {
    mockLiveGame = { classroomName: '7B English', lessonNames: ['Weather'], gameMode: 'classic', settings: {} };
    render(<ProjectorLobby {...base} wordCount={9} />);
    const session = screen.getByTestId('projector-session');
    expect(session).toHaveTextContent('7B English');
    expect(session).toHaveTextContent('Weather');
    expect(session).toHaveTextContent('education.classroomGame.words:{"count":9}');
  });

  it('falls back to the generic session label when the class has no name', () => {
    render(<ProjectorLobby {...base} />);
    expect(screen.getByTestId('projector-session')).toHaveTextContent('education.classroomGame.classroomSession');
  });

  it('names the mode with the round length the clock will run and offers the switch', () => {
    mockLiveGame = { gameMode: 'wheel-rush', settings: { timerMinutes: 3 } };
    render(<ProjectorLobby {...base} classroomGameMode="wheel-rush" students={[{ username: 'Noa' }]} />);
    expect(screen.getByTestId('projector-mode')).toHaveTextContent('eduLiveRoom.lobby.minutes:{"count":1}');
    expect(screen.getByTestId('mode-switcher')).toBeInTheDocument();
  });
});

describe('ProjectorLobby — Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLiveGame = null;
  });

  it('Given an empty room, Then Start is locked, says it is waiting, gives a reason and shows no count', () => {
    render(<ProjectorLobby {...base} onStartPracticeRound={vi.fn()} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(start).toHaveTextContent('education.projectorLobby.startWhenReady');
    expect(screen.getByTestId('projector-start-reason')).toHaveTextContent('eduLiveRoom.lobby.startBlocked');
    expect(screen.queryByTestId('projector-start-count')).toBeNull();
  });

  it('Given students, Then Start carries the player count and one tap starts the round', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }, { username: 'Ido' }, { username: 'Bot', isBot: true }]} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeEnabled();
    expect(start).toHaveAttribute('data-ready', 'true');
    expect(start).toHaveTextContent('hostView.startClassGame');
    expect(screen.getByTestId('projector-start-count')).toHaveTextContent('2');
    expect(start).toContainElement(screen.getByTestId('projector-start-count'));
    expect(screen.queryByTestId('projector-start-reason')).toBeNull();
    fireEvent.click(start);
    expect(base.onStartGame).toHaveBeenCalledTimes(1);
  });

  it('Given a room starting, Then Start holds its label and size, shows it is busy and cannot double-fire', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }]} starting />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(start).toHaveAttribute('aria-busy', 'true');
    expect(start).toHaveTextContent('hostView.startClassGame');
    expect(start.className).toContain('min-h-16');
  });

  it('Given Boss Battle, Then Start names the fight', () => {
    mockLiveGame = { gameMode: 'classic', settings: { classroomBossId: 'lexiconDragon' } };
    render(<ProjectorLobby {...base} classroomGameMode={undefined} students={[{ username: 'Noa' }]} />);
    expect(screen.getByTestId('projector-start')).toHaveTextContent('eg2Modes.boss.start');
  });

  it('keeps Start pinned to the bottom of a narrow, scrolling frame', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    const bar = screen.getByTestId('projector-start-bar');
    expect(bar).toContainElement(screen.getByTestId('projector-start'));
    expect(bar.className).toMatch(/@max-5xl:sticky/);
    expect(bar.className).toMatch(/@max-5xl:bottom-0/);
    expect(bar.className).toMatch(/@max-5xl:bg-neo-navy/);
  });

  it('keeps the mascot out of the Start bar', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    expect(screen.getByTestId('projector-start-bar').querySelector('img')).toBeNull();
  });

  it('Given an auto-start countdown, Then the teacher sees it and can cancel', () => {
    const cancel = vi.fn();
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }]} autoStartSecondsLeft={4} onCancelAutoStart={cancel} />);
    fireEvent.click(screen.getByTestId('projector-autostart-cancel'));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('Given a practice round failed, Then the teacher is told', () => {
    render(<ProjectorLobby {...base} onStartPracticeRound={vi.fn()} practiceRoundFailed />);
    expect(screen.getByText('tvLobby.practiceRoundFailed')).toBeInTheDocument();
  });
});

describe('ProjectorLobby — roster control', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given the teacher removes a student, When confirmed, Then the host kick goes to the server for that name', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }, { username: 'Troll99' }]} />);
    fireEvent.click(screen.getByTestId('projector-edit-roster'));
    fireEvent.click(screen.getAllByTestId('projector-remove')[1]);
    fireEvent.click(screen.getByTestId('remove-confirm-ok'));
    expect(socket.emit).toHaveBeenCalledWith('kickPlayer', { targetUsername: 'Troll99' });
  });

  it('marks the students the server reports as ready', () => {
    render(<ProjectorLobby {...base} students={[{ username: 'Noa' }, { username: 'Ido' }]} readyUsernames={['Noa']} />);
    expect(screen.getAllByTestId('projector-student').map((c) => c.dataset.ready)).toEqual(['true', 'false']);
  });
});

describe('ProjectorLobby entrance', () => {
  it('leaves no transform behind once panels land, so the mode sheet still covers the screen', async () => {
    const { RISE } = await import('@/components/education/live/eduLiveStyles');
    expect(RISE).toMatch(/_backwards\]$/);
  });
});
