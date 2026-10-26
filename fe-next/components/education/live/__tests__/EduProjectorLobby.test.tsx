import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduProjectorLobby from '@/components/education/live/EduProjectorLobby';

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({
  useLiveClassroomGameInfo: () => ({ classroomName: 'Room 4B', gameMode: 'wheel-rush', settings: { timerMinutes: 3 } }),
}));
vi.mock('@/components/education/lobby/LobbyModeSwitcher', () => ({
  LobbyModeSwitcher: ({ currentMode }: { currentMode: string }) => <button type="button" data-testid="mode-switcher">{currentMode}</button>,
}));
vi.mock('@/components/education/projector/ProjectorQuizBlocked', () => ({
  useQuizStartRefused: () => [false, vi.fn()],
  ProjectorQuizBlocked: () => <div data-testid="quiz-blocked" />,
}));
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({ readLocalGameMode: () => null }));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => null }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value, className }: { value: string; className?: string }) => <svg data-testid="join-qr" data-value={value} className={className} /> }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const base = {
  gameCode: 'AB12CD',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string }[],
  t,
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  classroomGameMode: 'wheel-rush' as const,
};

describe('EduProjectorLobby', () => {
  beforeEach(() => vi.clearAllMocks());

  it('given a fresh room, when the projector shows, then the giant code, join address and QR point at the join route', () => {
    render(<EduProjectorLobby {...base} />);
    expect(screen.getByTestId('edu-lobby-code')).toHaveTextContent('AB12CD');
    expect(screen.getByTestId('edu-lobby-address')).toHaveTextContent('lexiclash.live');
    expect(screen.getByTestId('join-qr')).toHaveAttribute('data-value', 'https://www.lexiclash.live/en/join/AB12CD');
  });

  it('given no students, when the teacher looks at Start, then it is locked with a reason and a practice run is offered', () => {
    const onPractice = vi.fn();
    render(<EduProjectorLobby {...base} onStartPracticeRound={onPractice} />);
    expect(screen.getByTestId('edu-lobby-start')).toBeDisabled();
    expect(screen.getByTestId('edu-lobby-start-reason')).toHaveTextContent('eduLiveRoom.lobby.startBlocked');
    fireEvent.click(screen.getByTestId('edu-lobby-practice'));
    expect(onPractice).toHaveBeenCalledTimes(1);
  });

  it('given students joined, when the roster shows, then each name pops in with a count and Start fires', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }, { username: 'Ido' }]} readyUsernames={['Noa']} />);
    expect(screen.getByTestId('edu-lobby-count')).toHaveTextContent('eduLiveRoom.lobby.joined:{"count":2}');
    expect(screen.getAllByTestId('edu-lobby-student').map((el) => el.textContent)).toEqual(['Noa', 'Ido']);
    fireEvent.click(screen.getByTestId('edu-lobby-start'));
    expect(base.onStartGame).toHaveBeenCalledTimes(1);
  });

  it('given exactly one student, when the teacher looks at Start, then one tap starts the round with no blocked reason', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} onStartPracticeRound={vi.fn()} />);
    const start = screen.getByTestId('edu-lobby-start');
    expect(start).toBeEnabled();
    expect(start).toHaveAttribute('data-ready', 'true');
    expect(screen.getByTestId('edu-lobby-start-count')).toHaveTextContent('1');
    expect(screen.queryByTestId('edu-lobby-start-reason')).toBeNull();
    fireEvent.click(start);
    expect(base.onStartGame).toHaveBeenCalledTimes(1);
  });

  it('given a phone-width lobby that scrolls, when the roster grows, then the Start row stays pinned to the bottom', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    const row = screen.getByTestId('edu-lobby-start-row');
    expect(row).toContainElement(screen.getByTestId('edu-lobby-start'));
    expect(row.className).toMatch(/max-md:sticky/);
    expect(row.className).toMatch(/max-md:bottom-0/);
    expect(row.className).toMatch(/max-md:bg-neo-navy/);
  });

  it('given a short desktop viewport, when the join card renders, then the QR is height-capped, never squashed, and its grid row cannot collapse under the mode card', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    const qr = screen.getByTestId('join-qr');
    expect(qr.parentElement?.className).toMatch(/shrink-0/);
    expect(qr.getAttribute('class')).toMatch(/md:size-\[min\(11vw,/);
    expect(screen.getByTestId('edu-join-card').parentElement?.className).toMatch(/min-h-0|md:self-start/);
    const grid = screen.getByTestId('edu-join-card').parentElement?.parentElement as HTMLElement;
    expect(grid.className).toMatch(/grid-rows-\[auto_minmax\(min-content,1fr\)_auto\]/);
    expect(screen.getByTestId('edu-projector-lobby').className).toMatch(/md:overflow-y-auto/);
  });

  it('given a phone viewport, when the join card renders, then its wrapper keeps its content height so the roster card cannot slide over the QR', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    const wrapper = screen.getByTestId('edu-join-card').parentElement as HTMLElement;
    // A bare `min-h-0` lets the single-column (mobile) grid squeeze this auto row to ~0, and the
    // roster card below then paints over the code + QR. Only the desktop grid may opt out.
    const classes = wrapper.className.split(/\s+/);
    expect(classes).not.toContain('min-h-0');
    expect(classes).toContain('md:min-h-0');
  });

  it('given a room starting, when Start is pending, then it shows a loading state and cannot double-fire', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} starting />);
    const start = screen.getByTestId('edu-lobby-start');
    expect(start).toBeDisabled();
    expect(start).toHaveAttribute('aria-busy', 'true');
  });

  it('given the selected mode, when the lobby renders, then the mode card names it with the round length the clock will run (Wheel Rush is a fixed 1 min) and the switcher', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    expect(screen.getByTestId('edu-lobby-mode')).toHaveTextContent('eduLiveRoom.lobby.minutes:{"count":1}');
    expect(screen.getByTestId('mode-switcher')).toBeInTheDocument();
  });

  it('given the teacher leaves, when the leave control is tapped, then the room exit runs', () => {
    render(<EduProjectorLobby {...base} />);
    fireEvent.click(screen.getByTestId('edu-lobby-leave'));
    expect(base.onExitRoom).toHaveBeenCalledTimes(1);
  });

  it('given an auto-start countdown, when it runs, then the teacher sees it and can cancel', () => {
    const cancel = vi.fn();
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} autoStartSecondsLeft={4} onCancelAutoStart={cancel} />);
    fireEvent.click(screen.getByTestId('edu-lobby-autostart-cancel'));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
