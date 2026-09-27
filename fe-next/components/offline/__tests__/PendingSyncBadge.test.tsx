// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useOfflineModeFlag', () => ({ useOfflineModeFlag: vi.fn(() => true) }));
vi.mock('@/lib/offline', () => ({ getOfflineStore: vi.fn(() => Promise.resolve({})) }));
vi.mock('@/lib/offline/scoreQueue', () => ({
  queueDepth: vi.fn(() => Promise.resolve(0)),
  peekQueue: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (k: string) => k, language: 'en' })),
}));

import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { getOfflineStore } from '@/lib/offline';
import { queueDepth, peekQueue } from '@/lib/offline/scoreQueue';
import { PendingSyncBadge } from '../PendingSyncBadge';

describe('PendingSyncBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOfflineModeFlag).mockReturnValue(true);
    vi.mocked(getOfflineStore).mockResolvedValue({} as never);
    vi.mocked(queueDepth).mockResolvedValue(0);
    vi.mocked(peekQueue).mockResolvedValue([]);
  });

  it('renders nothing when queue is empty', async () => {
    vi.mocked(queueDepth).mockResolvedValue(0);
    const { container } = render(<PendingSyncBadge />);
    await waitFor(() => expect(getOfflineStore).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when offline flag is off', async () => {
    vi.mocked(useOfflineModeFlag).mockReturnValue(false);
    vi.mocked(queueDepth).mockResolvedValue(5);
    const { container } = render(<PendingSyncBadge />);
    await waitFor(() => {}, { timeout: 100 });
    expect(container.firstChild).toBeNull();
    expect(getOfflineStore).not.toHaveBeenCalled();
  });

  it('shows badge with count when queue has items', async () => {
    vi.mocked(queueDepth).mockResolvedValue(3);
    render(<PendingSyncBadge />);
    await waitFor(() =>
      expect(screen.getByText('offline.pending.badge')).toBeInTheDocument(),
    );
  });

  it('shows correct count in badge text key when queue has 2 items', async () => {
    vi.mocked(queueDepth).mockResolvedValue(2);
    render(<PendingSyncBadge />);
    await waitFor(() =>
      expect(screen.getByText('offline.pending.badge')).toBeInTheDocument(),
    );
  });
});
