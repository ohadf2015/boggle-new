import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectorWheel, { useProjectorWheelPuzzle } from '@/components/education/live/ProjectorWheel';

type Handler = (data?: unknown) => void;
function fakeSocket() {
  const handlers: Record<string, Handler[]> = {};
  return {
    handlers,
    emit: vi.fn(),
    on: vi.fn((event: string, h: Handler) => { (handlers[event] ??= []).push(h); }),
    off: vi.fn((event: string, h: Handler) => { handlers[event] = (handlers[event] ?? []).filter((x) => x !== h); }),
    fire(event: string, data?: unknown) { for (const h of handlers[event] ?? []) h(data); },
  };
}

const PUZZLE = { centerLetter: 'i', outerLetters: ['e', 't', 'q', 'u', 'o', 's'], allLetters: [] };

describe('useProjectorWheelPuzzle', () => {
  it('GIVEN a Wheel Rush round WHEN the projector mounts late THEN it asks the server for the wheel and shows it', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useProjectorWheelPuzzle(socket as never, true));
    expect(socket.emit).toHaveBeenCalledWith('requestWheelRushState');
    act(() => socket.fire('wheelRushInit', { puzzle: PUZZLE, startedAt: 1 }));
    expect(result.current?.centerLetter).toBe('i');
  });

  it('GIVEN a wheel on screen WHEN the next round (or a host reconnect) starts THEN the old wheel is dropped and the new one is asked for', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useProjectorWheelPuzzle(socket as never, true));
    act(() => socket.fire('wheelRushInit', { puzzle: PUZZLE, startedAt: 1 }));
    socket.emit.mockClear();
    act(() => socket.fire('startGame', {}));
    expect(result.current).toBeNull();
    expect(socket.emit).toHaveBeenCalledWith('requestWheelRushState');
  });

  it('GIVEN another mode WHEN the projector mounts THEN it never asks for a wheel', () => {
    const socket = fakeSocket();
    renderHook(() => useProjectorWheelPuzzle(socket as never, false));
    expect(socket.emit).not.toHaveBeenCalled();
  });
});

describe('ProjectorWheel', () => {
  it('GIVEN the wheel WHEN shown on the wall THEN the centre letter and every outer letter are printed', () => {
    render(<ProjectorWheel puzzle={PUZZLE} label="Class wheel" />);
    expect(screen.getByTestId('projector-wheel-center')).toHaveTextContent('I');
    expect(screen.getAllByTestId('projector-wheel-letter').map((el) => el.textContent)).toEqual(['E', 'T', 'Q', 'U', 'O', 'S']);
    expect(screen.getByRole('img', { name: 'Class wheel' })).toBeInTheDocument();
  });
});
