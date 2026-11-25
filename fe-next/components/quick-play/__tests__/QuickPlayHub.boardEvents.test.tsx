import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import posthog from '@/lib/analytics/lazyPosthog';
import { QuickPlayHub } from '../QuickPlayHub';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => null }));
vi.mock('@/hooks/useBackOneLevel', () => ({ useBackOneLevel: () => vi.fn() }));
vi.mock('../lightningPath', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lightningPath')>()),
  strikeHoldMs: () => 1,
}));
vi.mock('../adapters/QuickModeAdapter', () => ({
  QuickModeAdapter: () => <div data-testid="mock-round" />,
}));

describe('QuickPlayHub board fetch instrumentation', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(posthog.capture).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('given a successful round fetch, then board_loaded carries mode and ms', async () => {
    fetchMock.mockImplementation((_u: string, init?: { body?: string }) => {
      const { mode } = JSON.parse(init?.body ?? '{}');
      return Promise.resolve({ ok: true, json: async () => ({ mode, seed: 's', language: 'en', durationSec: 60, grid: [['a']], totalWords: 1, perfectScore: 1 }) });
    });
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() =>
      expect(posthog.capture).toHaveBeenCalledWith('board_loaded', { mode: 'blast', ms: expect.any(Number) }),
    );
  });

  it('given a failing round fetch, then board_fetch_failed carries mode and status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => null });
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() =>
      expect(posthog.capture).toHaveBeenCalledWith('board_fetch_failed', { mode: 'blast', status: 500 }),
    );
  });

  it('given a network error, then board_fetch_failed reports status 0', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() =>
      expect(posthog.capture).toHaveBeenCalledWith('board_fetch_failed', { mode: 'blast', status: 0 }),
    );
  });
});
