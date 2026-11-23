// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { SoloPlayPrompt } from './SoloPlayPrompt';
import { QUIP_MS } from '@/components/multiplayer/lobby/LobbyQuip';

// Stub translator returns the key so we can assert which strings render.
const t = (key: string) => key;

describe('SoloPlayPrompt', () => {
  afterEach(() => vi.useRealTimers());

  it('Given a solo host, Then the mascot greets them with a playful line next to the play-vs-bots CTA', () => {
    render(<SoloPlayPrompt onPlayVsBots={() => {}} t={t} />);
    expect(screen.getByTestId('solo-mascot')).toBeInTheDocument();
    expect(screen.getByText('hostView.soloPrompt.title')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-quip')).toHaveTextContent('lobby.fun.quip1');
    expect(screen.getByRole('button', { name: 'hostView.soloPrompt.cta' })).toBeInTheDocument();
  });

  it('Given time passes, Then the mascot moves on to its next line', () => {
    vi.useFakeTimers();
    render(<SoloPlayPrompt t={t} />);
    act(() => { vi.advanceTimersByTime(QUIP_MS); });
    expect(screen.getByTestId('lobby-quip')).toHaveTextContent('lobby.fun.quip2');
  });

  it('fires onPlayVsBots when the CTA is pressed', () => {
    const onPlayVsBots = vi.fn();
    render(<SoloPlayPrompt onPlayVsBots={onPlayVsBots} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'hostView.soloPrompt.cta' }));
    expect(onPlayVsBots).toHaveBeenCalledTimes(1);
  });
});
