'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock useLanguageSafe
vi.mock('@/contexts/LanguageContext', async () => {
  const actual = await vi.importActual('@/contexts/LanguageContext');
  return {
    ...actual,
    useLanguageSafe: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        const translations: Record<string, string> = {
          'adventurePlay.loading': 'Loading...',
          'adventurePlay.saving': 'Saving...',
          'adventurePlay.loadError': 'Failed to load adventure',
          'adventurePlay.backToMap': 'Back to map',
          'adventurePlay.tryAgain': 'Try again',
        };
        return translations[key] || key;
      },
      language: 'en',
    }),
  };
});

// Mock trackGrowthEvent
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

import { trackGrowthEvent } from '@/utils/growthTracking';
import RunStatusOverlay from './RunStatusOverlay';

describe('RunStatusOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with exit button', () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();

    render(
      <RunStatusOverlay phase="loading" onExit={onExit} onRetry={onRetry} />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const exitButton = screen.getByTestId('run-loading-exit');
    expect(exitButton).toBeInTheDocument();
  });

  it('calls onExit and tracks event when exit button clicked in loading state', async () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <RunStatusOverlay phase="loading" onExit={onExit} onRetry={onRetry} />
    );

    const exitButton = screen.getByTestId('run-loading-exit');
    await user.click(exitButton);

    expect(onExit).toHaveBeenCalledOnce();
    expect(trackGrowthEvent).toHaveBeenCalledWith('adventure_exit', { from: 'loading' });
  });

  it('renders error state with backToMap and tryAgain buttons', () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();

    render(
      <RunStatusOverlay phase="error" onExit={onExit} onRetry={onRetry} />
    );

    expect(screen.getByText('Failed to load adventure')).toBeInTheDocument();
    expect(screen.getByText('Back to map')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('calls onExit when backToMap button clicked in error state', async () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <RunStatusOverlay phase="error" onExit={onExit} onRetry={onRetry} />
    );

    const backButton = screen.getByText('Back to map');
    await user.click(backButton);

    expect(onExit).toHaveBeenCalledOnce();
  });

  it('calls onRetry when tryAgain button clicked in error state', async () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <RunStatusOverlay phase="error" onExit={onExit} onRetry={onRetry} />
    );

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders saving state as non-blocking chip', () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();

    const { container } = render(
      <RunStatusOverlay phase="saving" onExit={onExit} onRetry={onRetry} />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    // Should be a chip, not a full-screen overlay
    const statusEl = screen.getByText('Saving...').closest('[role="status"]');
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
    // Should not have inset-0 (full-screen overlay class)
    expect(container.querySelector('.inset-0')).not.toBeInTheDocument();
    // Should not have full-screen backdrop
    expect(container.querySelector('.bg-black')).not.toBeInTheDocument();
  });

  it('does not render for other phases', () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();

    const { container } = render(
      <RunStatusOverlay phase="playing" onExit={onExit} onRetry={onRetry} />
    );

    // Should render nothing for 'playing' phase
    expect(container.firstChild).toBeNull();
  });

  it('loading state still renders full-screen overlay (regression)', () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();

    const { container } = render(
      <RunStatusOverlay phase="loading" onExit={onExit} onRetry={onRetry} />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('run-loading-exit')).toBeInTheDocument();
    // Verify it's not the new non-blocking chip style
    expect(container.querySelector('[aria-live="polite"]')).not.toBeInTheDocument();
  });

  it('error state still renders full-screen overlay (regression)', () => {
    const onExit = vi.fn();
    const onRetry = vi.fn();

    cleanup();
    render(
      <RunStatusOverlay phase="error" onExit={onExit} onRetry={onRetry} />
    );

    expect(screen.getByText('Failed to load adventure')).toBeInTheDocument();
    expect(screen.getByText('Back to map')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
    // Verify it's not the new non-blocking chip style
    expect(screen.getByText('Failed to load adventure').closest('[aria-live]')).not.toBeInTheDocument();
  });
});
