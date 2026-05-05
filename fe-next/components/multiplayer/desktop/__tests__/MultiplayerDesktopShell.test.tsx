import { render, screen } from '@testing-library/react';
import { MultiplayerDesktopShell } from '../MultiplayerDesktopShell';
import type { ShellSlots } from '../types';

const mkSlots = (): ShellSlots => ({
  left: {
    roster: <div data-testid="roster">R</div>,
    modeBadge: <div data-testid="badge">B</div>,
  },
  center: <div data-testid="center">C</div>,
  right: { wordsLadder: <div data-testid="ladder">L</div> },
  meta: { mode: 'standard', roomId: 'r1' },
});

describe('MultiplayerDesktopShell', () => {
  it('renders all three columns with required slots', () => {
    render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(screen.getByTestId('roster')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('ladder')).toBeInTheDocument();
  });

  it('exposes container-query class for ≥1024px gate', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(container.firstChild).toHaveClass('@container');
  });

  it('uses logical (start/end) layout for RTL safety', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    const shell = container.querySelector('[data-mp-shell]');
    expect(shell?.className).not.toMatch(/\bml-\d|\bmr-\d/);
  });

  it('renders activityStream and chat when provided', () => {
    const slots: ShellSlots = {
      ...mkSlots(),
      right: {
        wordsLadder: <div data-testid="ladder">L</div>,
        activityStream: <div data-testid="stream">S</div>,
        chat: <div data-testid="chat">CH</div>,
      },
    };
    render(<MultiplayerDesktopShell slots={slots} />);
    expect(screen.getByTestId('stream')).toBeInTheDocument();
    expect(screen.getByTestId('chat')).toBeInTheDocument();
  });

  it('keeps placeholder when secondary slot missing (no reflow)', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(container.querySelector('[data-slot="left-secondary"]')).toBeInTheDocument();
  });
});
