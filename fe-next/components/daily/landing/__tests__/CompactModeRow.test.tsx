import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CompactModeRow } from '../CompactModeRow';
import { Building2 } from 'lucide-react';

describe('CompactModeRow', () => {
  it('should render title and icon on one line', () => {
    const mockPlay = vi.fn();
    render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="cyan"
        onPlay={mockPlay}
      />
    );

    expect(screen.getByText('Word Tower')).toBeInTheDocument();
    expect(screen.getByTestId('compact-row-cyan')).toBeInTheDocument();
  });

  it('should call onPlay when button clicked', async () => {
    const mockPlay = vi.fn();
    render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="cyan"
        onPlay={mockPlay}
      />
    );

    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(mockPlay).toHaveBeenCalledOnce();
  });

  it('should apply color class to icon', () => {
    const mockPlay = vi.fn();
    const { container } = render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="purple"
        onPlay={mockPlay}
      />
    );

    const iconContainer = container.querySelector('.text-neo-purple');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should animate in with delay', () => {
    const mockPlay = vi.fn();
    const { container } = render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="cyan"
        onPlay={mockPlay}
        delay={0.2}
      />
    );

    const motionDiv = container.querySelector('[data-testid="compact-row-cyan"]');
    expect(motionDiv).toBeInTheDocument();
  });

  // A finished quest used to be a disabled row — a dead end: no way back to
  // your Word Hunt / Word Wheel results or the leaderboard, and no way to keep
  // climbing the daily tower. The journey strip above it already let the same
  // step be tapped (rules/60 Class 3: two paths, same outcome).
  it('given a played quest, shows the done badge and still opens the quest (results / replay)', async () => {
    const mockPlay = vi.fn();
    render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="cyan"
        onPlay={mockPlay}
        played={true}
        doneLabel="Done"
      />
    );

    expect(screen.getByTestId('cyan-done-badge')).toHaveTextContent('Done');
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('given a played optional quest, drops the optional tag so the row does not overflow on a phone', () => {
    render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="cyan"
        onPlay={vi.fn()}
        played={true}
        badge="Optional"
        doneLabel="Done"
      />
    );
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });
});
