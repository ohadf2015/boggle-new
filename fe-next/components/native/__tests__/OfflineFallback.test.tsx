import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineFallback } from '../OfflineFallback';

const { mockLang } = vi.hoisted(() => ({ mockLang: { current: 'en', dir: 'ltr' as 'ltr' | 'rtl' } }));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'native.offline.title': 'No Connection',
        'native.offline.message': "We can't reach the game server.",
        'native.offline.retry': 'Try Again',
        'native.offline.retrying': 'Connecting...',
        'native.offline.playablePrompt': 'No internet? You can still play:',
        'native.offline.playBlast': 'Blast',
        'native.offline.playConnections': 'Connections',
        'native.offline.playDaily': 'Daily Word Hunt',
      };
      return translations[key] || key;
    },
    language: mockLang.current,
    dir: mockLang.dir,
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
    const onRetry = vi.fn();
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

  describe('offline-playable mode CTAs', () => {
    it('offers links to the offline-capable modes with the current locale', () => {
      mockLang.current = 'en';
      mockLang.dir = 'ltr';
      render(<OfflineFallback onRetry={() => {}} />);

      const blast = screen.getByRole('link', { name: 'Blast' });
      const connections = screen.getByRole('link', { name: 'Connections' });
      const daily = screen.getByRole('link', { name: 'Daily Word Hunt' });

      expect(blast).toHaveAttribute('href', '/en/blast');
      expect(connections).toHaveAttribute('href', '/en/connections');
      expect(daily).toHaveAttribute('href', '/en/daily');
    });

    it('prefixes mode links with the active (non-en) locale', () => {
      mockLang.current = 'he';
      mockLang.dir = 'rtl';
      render(<OfflineFallback onRetry={() => {}} />);

      expect(screen.getByRole('link', { name: 'Blast' })).toHaveAttribute('href', '/he/blast');
      expect(screen.getByRole('link', { name: 'Connections' })).toHaveAttribute(
        'href',
        '/he/connections',
      );
    });

    it('shows the playable prompt', () => {
      mockLang.current = 'en';
      mockLang.dir = 'ltr';
      render(<OfflineFallback onRetry={() => {}} />);
      expect(screen.getByText('No internet? You can still play:')).toBeInTheDocument();
    });
  });
});
