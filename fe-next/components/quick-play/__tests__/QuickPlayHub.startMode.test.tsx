import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QuickPlayHub } from '../QuickPlayHub';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => null }));
vi.mock('@/hooks/useBackOneLevel', () => ({ useBackOneLevel: () => vi.fn() }));
vi.mock('../QuickPlayModePicker', () => ({ QuickPlayModePicker: () => <div data-testid="mock-picker" /> }));
vi.mock('../lightningPath', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lightningPath')>()),
  strikeHoldMs: () => 1,
}));
vi.mock('../adapters/QuickModeAdapter', () => ({
  QuickModeAdapter: ({ config }: { config: { mode: string } }) => <div data-testid="mock-round" data-mode={config.mode} />,
}));

describe('QuickPlayHub start mode deep link', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (String(url).includes('/round')) {
        const { mode } = JSON.parse(init?.body ?? '{}');
        return Promise.resolve({ ok: true, json: async () => ({ mode, seed: 's', language: 'en', durationSec: 60, grid: [['a']], totalWords: 1, perfectScore: 1 }) });
      }
      return Promise.resolve({ ok: false, json: async () => null });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const roundCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('/round'));

  it('given startMode=blast, when the hub mounts, then a blast round starts without a wheel tap', async () => {
    const { findByTestId } = render(<QuickPlayHub startMode="blast" />);
    expect((await findByTestId('mock-round')).getAttribute('data-mode')).toBe('blast');
    expect(roundCalls()).toHaveLength(1);
  });

  it('given startMode=random, then exactly one round of some quick mode starts', async () => {
    const { findByTestId } = render(<QuickPlayHub startMode="random" />);
    expect(['classic', 'blast', 'word-hunt', 'wheel-rush']).toContain((await findByTestId('mock-round')).getAttribute('data-mode'));
    expect(roundCalls()).toHaveLength(1);
  });

  it('given no startMode, then the wheel waits for the player', async () => {
    const { getByTestId } = render(<QuickPlayHub />);
    await waitFor(() => expect(getByTestId('mock-picker')).toBeTruthy());
    expect(roundCalls()).toHaveLength(0);
  });

  it('given a challenge link, then startMode is ignored and the challenge owns the round', async () => {
    render(<QuickPlayHub startMode="blast" challengeId="c1" />);
    await new Promise((r) => setTimeout(r, 30));
    expect(roundCalls()).toHaveLength(0);
  });
});
