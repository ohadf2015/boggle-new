/**
 * S6-3 — HubWelcomeBanner: shown on first visit to Hub after completing level 1-1.
 * TDD RED phase.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { HubWelcomeBanner } from '../HubWelcomeBanner';

const mockT = (key: string) => key;

describe('HubWelcomeBanner (S6-3)', () => {
  it('renders title and description', () => {
    render(<HubWelcomeBanner t={mockT} onDismiss={vi.fn()} />);
    expect(screen.getByTestId('hub-welcome-banner')).toBeInTheDocument();
    expect(screen.getByText('adventure.hubWelcome.title')).toBeInTheDocument();
    expect(screen.getByText('adventure.hubWelcome.description')).toBeInTheDocument();
  });

  it('renders explore button', () => {
    render(<HubWelcomeBanner t={mockT} onDismiss={vi.fn()} />);
    expect(screen.getByText('adventure.hubWelcome.exploreButton')).toBeInTheDocument();
  });

  it('calls onDismiss when close button clicked', async () => {
    const onDismiss = vi.fn();
    render(<HubWelcomeBanner t={mockT} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByLabelText('common.close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when explore button clicked', async () => {
    const onDismiss = vi.fn();
    render(<HubWelcomeBanner t={mockT} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByText('adventure.hubWelcome.exploreButton'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
