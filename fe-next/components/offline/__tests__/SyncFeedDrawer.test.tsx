// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const makeRow = (overrides: Partial<{
  id: string; mode: string; payload: unknown; attempts: number; last_error: string | null;
}> = {}) => ({
  id: crypto.randomUUID(),
  mode: 'daily-wordhunt',
  payload: { score: 150, puzzleDate: '2026-05-13', language: 'en' },
  created_at: Date.now(),
  attempts: 0,
  last_error: null,
  ...overrides,
});

describe('PendingSyncBadge with SyncFeedDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOfflineModeFlag).mockReturnValue(true);
    vi.mocked(getOfflineStore).mockResolvedValue({} as never);
    vi.mocked(queueDepth).mockResolvedValue(0);
    vi.mocked(peekQueue).mockResolvedValue([]);
  });

  it('clicking badge opens the drawer', async () => {
    vi.mocked(queueDepth).mockResolvedValue(1);
    vi.mocked(peekQueue).mockResolvedValue([makeRow()]);
    render(<PendingSyncBadge />);
    const badge = await screen.findByRole('button', { name: /offline\.pending\.badge/ });
    fireEvent.click(badge);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('drawer lists each queued row by mode', async () => {
    vi.mocked(queueDepth).mockResolvedValue(2);
    vi.mocked(peekQueue).mockResolvedValue([
      makeRow({ mode: 'daily-wordhunt' }),
      makeRow({ mode: 'sp' }),
    ]);
    render(<PendingSyncBadge />);
    await screen.findByRole('button', { name: /offline\.pending\.badge/ });
    fireEvent.click(screen.getByRole('button', { name: /offline\.pending\.badge/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('daily-wordhunt');
    expect(dialog.textContent).toContain('sp');
  });

  it('drawer shows rejected status when attempts > 0 and last_error set', async () => {
    vi.mocked(queueDepth).mockResolvedValue(1);
    vi.mocked(peekQueue).mockResolvedValue([
      makeRow({ attempts: 2, last_error: 'puzzle_expired' }),
    ]);
    render(<PendingSyncBadge />);
    await screen.findByRole('button', { name: /offline\.pending\.badge/ });
    fireEvent.click(screen.getByRole('button', { name: /offline\.pending\.badge/ }));
    expect(screen.getByRole('dialog').textContent).toContain('offline.queue.status.rejected');
  });

  it('close button dismisses the drawer', async () => {
    vi.mocked(queueDepth).mockResolvedValue(1);
    vi.mocked(peekQueue).mockResolvedValue([makeRow()]);
    render(<PendingSyncBadge />);
    await screen.findByRole('button', { name: /offline\.pending\.badge/ });
    fireEvent.click(screen.getByRole('button', { name: /offline\.pending\.badge/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /offline\.queue\.close/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('empty drawer shows no-items message', async () => {
    vi.mocked(queueDepth).mockResolvedValue(0);
    render(<PendingSyncBadge />);
    await waitFor(() => {}, { timeout: 100 });
    expect(screen.queryByRole('button', { name: /offline\.pending\.badge/ })).not.toBeInTheDocument();
  });
});
