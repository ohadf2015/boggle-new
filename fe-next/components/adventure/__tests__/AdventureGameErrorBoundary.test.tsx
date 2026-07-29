/**
 * Tests for AdventureGameErrorBoundary
 * Ensures crashes during gameplay show recovery UI instead of blank screen.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'adventure.gameError.title': 'Something went wrong',
        'adventure.gameError.description': 'The game encountered an error.',
        'adventure.gameError.returnToLevels': 'Return to levels',
        'adventure.gameError.retry': 'Try again',
      };
      return keys[key] ?? key;
    },
  }),
}));

// Must import AFTER mocks
import { AdventureGameErrorBoundary } from '../AdventureGameErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

// A component that throws
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test game crash');
  return <div data-testid="child">Game running</div>;
}

describe('AdventureGameErrorBoundary', () => {
  // Suppress React error boundary console.error noise
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  it('renders children when no error', () => {
    render(
      <AdventureGameErrorBoundary onExit={vi.fn()}>
        <ThrowingChild shouldThrow={false} />
      </AdventureGameErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows error fallback when child throws', () => {
    render(
      <AdventureGameErrorBoundary onExit={vi.fn()}>
        <ThrowingChild shouldThrow={true} />
      </AdventureGameErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('The game encountered an error.')).toBeInTheDocument();
  });

  it('shows return to levels button that calls onExit', () => {
    const onExit = vi.fn();
    render(
      <AdventureGameErrorBoundary onExit={onExit}>
        <ThrowingChild shouldThrow={true} />
      </AdventureGameErrorBoundary>
    );
    const returnBtn = screen.getByText('Return to levels');
    fireEvent.click(returnBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows retry button that resets the error boundary', () => {
    const { rerender } = render(
      <AdventureGameErrorBoundary onExit={vi.fn()}>
        <ThrowingChild shouldThrow={true} />
      </AdventureGameErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click retry — boundary resets, but child still throws
    fireEvent.click(screen.getByText('Try again'));

    // After reset, it will try to re-render children which throw again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has accessible role and aria attributes', () => {
    render(
      <AdventureGameErrorBoundary onExit={vi.fn()}>
        <ThrowingChild shouldThrow={true} />
      </AdventureGameErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
