import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HostStatusLane, type HostStatusLaneProps } from '../HostStatusLane';

const props = (over: Partial<HostStatusLaneProps> = {}): HostStatusLaneProps => ({
  t: (k: string) => k,
  autoStartSecondsLeft: null,
  botCountdown: null,
  onCancelBotCountdown: vi.fn(),
  showSoloPrompt: false,
  onPlayVsBots: vi.fn(),
  adHold: false,
  ...over,
});

describe('HostStatusLane layout reserve', () => {
  it('takes no space in a lobby that never had anything to say', () => {
    const { container } = render(<HostStatusLane {...props()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps its slot when the bot countdown ends, so the roster below does not jump up', () => {
    const { rerender } = render(<HostStatusLane {...props({ botCountdown: 3 })} />);
    const slot = screen.getByTestId('host-status-lane');
    rerender(<HostStatusLane {...props()} />);
    expect(screen.getByTestId('host-status-lane')).toBe(slot);
    expect(slot).toBeEmptyDOMElement();
    expect(slot).toHaveAttribute('aria-hidden', 'true');
    expect(slot.className).toMatch(/min-h-\[calc\(52px/);
  });

  it('refills the same slot when a later status arrives', () => {
    const { rerender } = render(<HostStatusLane {...props({ showSoloPrompt: true })} />);
    const slot = screen.getByTestId('host-status-lane');
    rerender(<HostStatusLane {...props()} />);
    rerender(<HostStatusLane {...props({ autoStartSecondsLeft: 5 })} />);
    expect(screen.getByTestId('host-status-lane')).toBe(slot);
    expect(slot).toHaveTextContent('hostView.allReadyAutoStart');
  });
});
