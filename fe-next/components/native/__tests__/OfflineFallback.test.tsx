import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineFallback } from '../OfflineFallback';

// Mock useLanguage
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'native.offline.title': 'No Connection',
        'native.offline.message': "We can't reach the game server.",
        'native.offline.retry': 'Try Again',
        'native.offline.retrying': 'Connecting...',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('OfflineFallback', () => {
  it('should render offline message', () => {
    render(<OfflineFallback onRetry={() => {}} />);

    expect(screen.getByText('No Connection')).toBeInTheDocument();
    expect(screen.getByText("We can't reach the game server.")).toBeInTheDocument();
  });

  it('should render retry button', () => {
    render(<OfflineFallback onRetry={() => {}} />);

    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('should call onRetry when button clicked', () => {
    const onRetry = jest.fn();
    render(<OfflineFallback onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(onRetry).toHaveBeenCalled();
  });

  it('should show loading state when isRetrying', () => {
    render(<OfflineFallback onRetry={() => {}} isRetrying />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should render logo', () => {
    render(<OfflineFallback onRetry={() => {}} />);

    // Look for logo image
    expect(screen.getByAltText(/lexiclash/i)).toBeInTheDocument();
  });

  it('should have accessible button', () => {
    render(<OfflineFallback onRetry={() => {}} />);

    const button = screen.getByRole('button', { name: 'Try Again' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should apply correct RTL direction', () => {
    const { container } = render(<OfflineFallback onRetry={() => {}} />);

    // Main container should have dir attribute
    const mainDiv = container.querySelector('[dir]');
    expect(mainDiv).toHaveAttribute('dir', 'ltr');
  });
});
