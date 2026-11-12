// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExitConfirmDialog } from '../HostDialogs';
import { classroomExitPhase } from '../exitConfirmModel';

const t = (key: string) => key;

function renderRound(overrides: Partial<React.ComponentProps<typeof ExitConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onEndRound = vi.fn();
  render(
    <ExitConfirmDialog open onOpenChange={() => {}} onConfirm={onConfirm} onEndRound={onEndRound} t={t} classroom phase="round" {...overrides} />,
  );
  return { onConfirm, onEndRound };
}

describe('ExitConfirmDialog — a classroom host who pressed exit while a round runs', () => {
  afterEach(cleanup);

  it('Given a running round, When the dialog opens, Then it offers to end the round and says everyone sees the results', () => {
    renderRound();
    expect(screen.getByText('eduLive.exit.roundTitle')).toBeInTheDocument();
    expect(screen.getByText('eduLive.exit.roundBody')).toBeInTheDocument();
    expect(screen.queryByText('eduLive.exit.title')).toBeNull();
  });

  it('Given a running round, When the dialog opens, Then End this round is the first, filled button', () => {
    renderRound();
    const [first] = screen.getAllByRole('button');
    expect(first).toHaveTextContent('eduLive.exit.roundConfirm');
    expect(first.className).toContain('bg-neo-lime');
  });

  it('Given a running round, When End this round is pressed, Then the round ends and the room is not closed', () => {
    const { onConfirm, onEndRound } = renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.roundConfirm' }));
    expect(onEndRound).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Given a running round, When Close the room is pressed, Then the room closes and the round is not ended separately', () => {
    const { onConfirm, onEndRound } = renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.exit.closeRoom' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onEndRound).not.toHaveBeenCalled();
  });

  it('Given a running round, When the dialog opens, Then Close the room is a quiet secondary, not a second filled button', () => {
    renderRound();
    const close = screen.getByRole('button', { name: 'eduLive.exit.closeRoom' });
    expect(close.className).not.toContain('bg-neo-lime');
    expect(close.className).not.toContain('bg-neo-red');
    expect(close.className).toContain('bg-transparent');
  });

  it('Given a running round, When Keep playing is offered, Then it is still there to back out', () => {
    renderRound();
    expect(screen.getByRole('button', { name: 'eduLive.exit.stay' })).toBeInTheDocument();
  });

  it('Given the round phase but no way to end the round, When the dialog opens, Then it falls back to the room-closing copy', () => {
    renderRound({ onEndRound: undefined });
    expect(screen.getByText('eduLive.exit.title')).toBeInTheDocument();
    expect(screen.queryByText('eduLive.exit.roundConfirm')).toBeNull();
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
