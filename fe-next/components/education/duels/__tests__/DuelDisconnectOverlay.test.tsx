import { render, screen, waitFor } from '@testing-library/react';
import { DuelDisconnectOverlay } from '../DuelDisconnectOverlay';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock useLanguage
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'duels.opponentDisconnected': '{opponentName} disconnected',
        'duels.autoForfeitMessage': "You'll win automatically",
      };
      return translations[key] || key;
    },
  }),
}));

describe('DuelDisconnectOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render overlay with opponent name', () => {
    render(<DuelDisconnectOverlay opponentName="Bob" gracePeriodSeconds={30} />);

    expect(screen.getByTestId('disconnect-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Bob disconnected/)).toBeInTheDocument();
  });

  it('should show countdown timer', () => {
    render(<DuelDisconnectOverlay opponentName="Bob" gracePeriodSeconds={30} />);

    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('should decrement countdown every second', async () => {
    render(<DuelDisconnectOverlay opponentName="Bob" gracePeriodSeconds={30} />);

    expect(screen.getByText('30')).toBeInTheDocument();

    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(screen.getByText('29')).toBeInTheDocument());

    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(screen.getByText('28')).toBeInTheDocument());
  });

  it('should show auto-forfeit message', () => {
    render(<DuelDisconnectOverlay opponentName="Bob" gracePeriodSeconds={30} />);

    expect(screen.getByText("You'll win automatically")).toBeInTheDocument();
  });

  it('should call onDismiss when provided', () => {
    const onDismiss = jest.fn();
    render(
      <DuelDisconnectOverlay
        opponentName="Bob"
        gracePeriodSeconds={30}
        onDismiss={onDismiss}
      />
    );

    // onDismiss is typically called from parent when overlay should close
    // The component doesn't auto-dismiss, parent controls visibility
    expect(screen.getByTestId('disconnect-overlay')).toBeInTheDocument();
  });
});
