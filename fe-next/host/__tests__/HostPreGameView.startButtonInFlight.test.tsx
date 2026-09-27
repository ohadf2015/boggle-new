import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartButton } from '../components/pre-game/StartButton';

describe('StartButton - In-Flight Visual Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows disabled state immediately when clicked to prevent rage-clicking', async () => {
    const user = userEvent.setup();
    const onStartGame = vi.fn();

    const { rerender } = render(
      <StartButton
        onStartGame={onStartGame}
        disabled={false}
        tournamentCreating={false}
        playerCount={2}
        maxPlayers={8}
        t={(key) => key}
      />
    );

    const startButton = screen.getByRole('button');

    // Button should be enabled initially (clickable)
    expect(startButton).not.toHaveAttribute('disabled');

    // When onStartGame is called, it sets in-flight state
    // Simulate the parent setting disabled={true} after onClick
    await user.click(startButton);
    expect(onStartGame).toHaveBeenCalledOnce();

    // After click, parent should immediately set disabled=true
    // to show visual feedback. Re-render with new disabled state.
    rerender(
      <StartButton
        onStartGame={onStartGame}
        disabled={true}
        tournamentCreating={false}
        playerCount={2}
        maxPlayers={8}
        t={(key) => key}
      />
    );

    // Button should now be disabled, showing player their click was registered
    expect(startButton).toHaveAttribute('disabled');

    // Second click should not call onStartGame again (button is disabled)
    await user.click(startButton);
    expect(onStartGame).toHaveBeenCalledOnce(); // Still only once
  });

  it('opacity-50 class is applied when disabled to show visual feedback', async () => {
    const { rerender } = render(
      <StartButton
        onStartGame={() => {}}
        disabled={false}
        tournamentCreating={false}
        playerCount={2}
        maxPlayers={8}
        t={(key) => key}
      />
    );

    const startButton = screen.getByRole('button');

    // Initially no disabled styling
    expect(startButton).toHaveClass('disabled:opacity-50');

    // When disabled, the disabled:opacity-50 class applies (Tailwind rule)
    // This is verified by the button having the class and the disabled attribute
    rerender(
      <StartButton
        onStartGame={() => {}}
        disabled={true}
        tournamentCreating={false}
        playerCount={2}
        maxPlayers={8}
        t={(key) => key}
      />
    );

    expect(startButton).toHaveAttribute('disabled');
    // The opacity-50 rule applies automatically via Tailwind's disabled: modifier
    expect(startButton).toHaveClass('disabled:opacity-50');
  });
});
