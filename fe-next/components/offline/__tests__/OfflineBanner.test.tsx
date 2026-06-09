import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { onlineMock, flagMock } = vi.hoisted(() => ({
  onlineMock: vi.fn(),
  flagMock: vi.fn(),
}));

vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({ online: onlineMock(), slow: false, type: 'wifi', rttMs: null }),
}));

vi.mock('@/hooks/useOfflineModeFlag', () => ({
  useOfflineModeFlag: () => flagMock(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
}));

import { OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    onlineMock.mockReset();
    flagMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when online', () => {
    onlineMock.mockReturnValue(true);
    flagMock.mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders nothing when offline-mode flag is off', () => {
    onlineMock.mockReturnValue(false);
    flagMock.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders when offline and flag is on', () => {
    onlineMock.mockReturnValue(false);
    flagMock.mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('offline.banner.title')).toBeInTheDocument();
  });

  it('reserves layout space instead of overlaying the top strip', () => {
    // Regression: shares the top-0 banner slot; must sit IN FLOW, not float
    // over the in-game exit button.
    onlineMock.mockReturnValue(false);
    flagMock.mockReturnValue(true);
    render(<OfflineBanner />);
    const banner = screen.getByRole('status');
    expect(banner.className).not.toContain('fixed');
    expect(banner.className).not.toContain('inset-x-0');
  });

  it('hides itself after dismiss and persists to sessionStorage', () => {
    onlineMock.mockReturnValue(false);
    flagMock.mockReturnValue(true);
    render(<OfflineBanner />);

    fireEvent.click(screen.getByLabelText('offline.banner.dismiss'));
    expect(sessionStorage.getItem('lexiclash_offline_banner_dismissed')).toBe('1');
  });

  it('respects prior session dismissal on mount', () => {
    sessionStorage.setItem('lexiclash_offline_banner_dismissed', '1');
    onlineMock.mockReturnValue(false);
    flagMock.mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
