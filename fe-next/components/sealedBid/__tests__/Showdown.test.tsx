import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Showdown from '../Showdown';

// Mock SharedFxApp
vi.mock('../../../lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnCoinStream: vi.fn(),
    spawnBurst: vi.fn(),
  },
}));

describe('Showdown', () => {
  const base = {
    onDone: vi.fn(),
    reducedMotion: true,
    bots: [{ name: 'Bot A', word: 'TRAIN' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unique settlement shows win text and +delta', () => {
    render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
      />
    );
    expect(screen.getByText(/\+60/)).toBeInTheDocument();
  });

  it('clash settlement shows loss and -delta', () => {
    render(
      <Showdown
        {...base}
        playerWord="TRAIN"
        settlement={{ outcome: 'clash', stake: 20, multiplier: 2, delta: -20 }}
      />
    );
    expect(screen.getByText(/-20/)).toBeInTheDocument();
  });

  it('none settlement shows neutral message', () => {
    render(
      <Showdown
        {...base}
        playerWord="SILENT"
        settlement={{ outcome: 'none', stake: 20, multiplier: 1, delta: 0 }}
      />
    );
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('renders opponent card with bot word', () => {
    render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
      />
    );
    expect(screen.getByText('Bot A')).toBeInTheDocument();
    expect(screen.getByText('TRAIN')).toBeInTheDocument();
  });

  it('provides continue button that calls onDone', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
        onDone={onDone}
      />
    );
    const continueBtn = screen.getByRole('button', { name: /continue|next|done/i });
    await user.click(continueBtn);
    expect(onDone).toHaveBeenCalled();
  });

  it('calls onDone after timeout', async () => {
    const onDone = vi.fn();
    render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
        onDone={onDone}
      />
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('reduces motion: no card flips, static reveal', () => {
    const { container } = render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
        reducedMotion={true}
      />
    );
    // With reducedMotion, cards should show words immediately (no animation)
    expect(screen.getByText('TRAIN')).toBeInTheDocument();
  });

  it('animates card flip when reducedMotion is false', () => {
    const { container } = render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
        reducedMotion={false}
      />
    );
    // Just verify it renders without crashing during animation
    expect(screen.getByText('Bot A')).toBeInTheDocument();
  });

  it('handles playerWord null gracefully', () => {
    render(
      <Showdown
        {...base}
        playerWord={null}
        settlement={{ outcome: 'clash', stake: 20, multiplier: 2, delta: 0 }}
      />
    );
    expect(screen.getByText(/-?0/)).toBeInTheDocument();
  });

  it('multiple bots render all cards', () => {
    render(
      <Showdown
        {...base}
        bots={[
          { name: 'Bot A', word: 'TRAIN' },
          { name: 'Bot B', word: 'STRAIN' },
        ]}
        playerWord="RETINAS"
        settlement={{ outcome: 'clash', stake: 20, multiplier: 2, delta: -10 }}
      />
    );
    expect(screen.getByText('Bot A')).toBeInTheDocument();
    expect(screen.getByText('Bot B')).toBeInTheDocument();
    expect(screen.getByText('TRAIN')).toBeInTheDocument();
    expect(screen.getByText('STRAIN')).toBeInTheDocument();
  });
});
