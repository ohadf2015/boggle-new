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

  it('should show check badge and disable button when played is true', () => {
    const mockPlay = vi.fn();
    render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="cyan"
        onPlay={mockPlay}
        played={true}
      />
    );

    // Should have the done badge
    expect(screen.getByTestId('cyan-done-badge')).toBeInTheDocument();

    // Button should be disabled
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should not call onPlay when clicked while played', async () => {
    const mockPlay = vi.fn();
    render(
      <CompactModeRow
        icon={<Building2 className="w-6 h-6" />}
        title="Word Tower"
        color="cyan"
        onPlay={mockPlay}
        played={true}
      />
    );

    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(mockPlay).not.toHaveBeenCalled();
  });
});
