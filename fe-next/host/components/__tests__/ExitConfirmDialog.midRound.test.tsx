// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExitConfirmDialog } from '../HostDialogs';
import { classroomExitPhase } from '../exitConfirmModel';
import type { EndRoundRequest, EndRoundStatus } from '../../hooks/useEndRoundRequest';

const t = (key: string) => key;

function renderRound(status: EndRoundStatus = 'idle', overrides: Partial<React.ComponentProps<typeof ExitConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const endRound: EndRoundRequest = { status, request: vi.fn(), reset: vi.fn(), reconnect: vi.fn() };
  render(
    <ExitConfirmDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} endRound={endRound} t={t} classroom phase="round" {...overrides} />,
  );
  return { onConfirm, onOpenChange, endRound };
}

describe('ExitConfirmDialog — a classroom host who pressed exit while a round runs', () => {
  afterEach(cleanup);

  it('Given a running round, When the dialog opens, Then it offers to end the round and says everyone sees the results', () => {
    renderRound();
    expect(screen.getByText('eduLive.exit.roundTitle')).toBeInTheDocument();
    expect(screen.getByText('eduLive.exit.roundBody')).toBeInTheDocument();
  });

  it('Given a running round, When the dialog opens, Then End this round is the first, filled button', () => {
    renderRound();
    const [first] = screen.getAllByRole('button');
    expect(first).toHaveTextContent('eduLive.exit.roundConfirm');
    expect(first.className).toContain('bg-neo-lime');
  });

  it('Given a running round, When End this round is pressed, Then the round is requested, the dialog stays open and the room is not closed', () => {
    const { onConfirm, onOpenChange, endRound } = renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.roundConfirm' }));
    expect(endRound.request).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Given the request is pending, Then the button is busy and disabled', () => {
    renderRound('pending');
    const btn = screen.getByTestId('classroom-exit-end-round');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveTextContent('eduLive.exit.endingRound');
  });

  it.each([
    ['rejected', 'eduLive.exit.endRejected'],
    ['rateLimited', 'eduLive.exit.endRateLimited'],
    ['timeout', 'eduLive.exit.endTimeout'],
  ] as const)('Given the request ended %s, Then the dialog says why and End this round can be pressed again', (status, key) => {
    renderRound(status);
    expect(screen.getByRole('alert')).toHaveTextContent(key);
    expect(screen.getByTestId('classroom-exit-end-round')).toBeEnabled();
  });

  it('Given the host is offline, Then it says reconnecting and offers the reconnect path instead of ending', () => {
    const { endRound } = renderRound('offline');
    expect(screen.getByRole('alert')).toHaveTextContent('eduLive.exit.reconnecting');
    expect(screen.getByTestId('classroom-exit-end-round')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.reconnect' }));
    expect(endRound.reconnect).toHaveBeenCalledTimes(1);
  });

  it('Given a running round, When Close the room is tapped, Then a second confirm warns that students leave and results are lost, and nothing closes yet', () => {
    const { onConfirm } = renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.closeRoom' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('eduLive.exit.closeMidRoundBody')).toBeInTheDocument();
    expect(screen.queryByText('eduLive.exit.roundConfirm')).toBeNull();
  });

  it('Given the second confirm, When Close the room is confirmed, Then the room closes', () => {
    const { onConfirm } = renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.closeRoom' }));
    const confirm = screen.getByTestId('classroom-exit-close-room-confirm');
    expect(confirm.className).toContain('bg-neo-red');
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Given the second confirm, When Go back is pressed, Then the end-this-round choice returns and nothing closes', () => {
    const { onConfirm } = renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.closeRoom' }));
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.back' }));
    expect(screen.getByText('eduLive.exit.roundConfirm')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Given the first screen, Then Close the room is a quiet secondary, not a second filled button', () => {
    renderRound();
    const close = screen.getByRole('button', { name: 'eduLive.exit.closeRoom' });
    expect(close.className).not.toContain('bg-neo-lime');
    expect(close.className).not.toContain('bg-neo-red');
  });

  it('Given the round phase but no end-round request, When the dialog opens, Then it falls back to the room-closing copy', () => {
    renderRound('idle', { endRound: undefined });
    expect(screen.getByText('eduLive.exit.title')).toBeInTheDocument();
  });
});

describe('classroomExitPhase — which question the classroom exit asks', () => {
  it('Given no round has started, Then it is the lobby question', () => {
    expect(classroomExitPhase({ inLobby: true, roundRunning: false })).toBe('lobby');
  });

  it('Given a round is running, Then it is the end-this-round question', () => {
    expect(classroomExitPhase({ inLobby: false, roundRunning: true })).toBe('round');
  });

  it('Given results are on screen, Then it stays the close-the-room question', () => {
    expect(classroomExitPhase({ inLobby: false, roundRunning: false })).toBe('game');
  });
});
