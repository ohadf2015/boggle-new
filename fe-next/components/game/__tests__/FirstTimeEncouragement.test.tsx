import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FirstTimeEncouragement from '../FirstTimeEncouragement';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, className, role, onClick, ...rest }: Record<string, unknown>) => (
      <div className={className as string} role={role as string} onClick={onClick as React.MouseEventHandler<HTMLDivElement>} aria-live={rest['aria-live'] as 'polite' | 'off' | 'assertive'}>
        {children as React.ReactNode}
      </div>
    ),
  },
}));

// Mock Mascot
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

describe('FirstTimeEncouragement', () => {
  it('renders game-start trigger with gaming mascot', () => {
    render(<FirstTimeEncouragement trigger="game-start" />);
    expect(screen.getByTestId('mascot-gaming')).toBeInTheDocument();
    expect(screen.getByText('encouragement.gameStart')).toBeInTheDocument();
  });

  it('renders first-word trigger with encouraging mascot', () => {
    render(<FirstTimeEncouragement trigger="first-word" />);
    expect(screen.getByTestId('mascot-encouraging')).toBeInTheDocument();
    expect(screen.getByText('encouragement.firstWord')).toBeInTheDocument();
  });

  it('renders combo trigger with onfire mascot', () => {
    render(<FirstTimeEncouragement trigger="combo" />);
    expect(screen.getByTestId('mascot-onfire')).toBeInTheDocument();
    expect(screen.getByText('encouragement.combo')).toBeInTheDocument();
  });

  it('renders long-word trigger with celebration mascot', () => {
    render(<FirstTimeEncouragement trigger="long-word" />);
    expect(screen.getByTestId('mascot-celebration')).toBeInTheDocument();
    expect(screen.getByText('encouragement.longWord')).toBeInTheDocument();
  });

  it('calls onDismiss when clicked', async () => {
    const onDismiss = vi.fn();
    render(<FirstTimeEncouragement trigger="game-start" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('status'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('has aria-live polite for screen readers', () => {
    render(<FirstTimeEncouragement trigger="game-start" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
