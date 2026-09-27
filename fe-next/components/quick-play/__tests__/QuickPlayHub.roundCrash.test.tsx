/**
 * A throw inside the mounted round (any of the four mode adapters) had nothing
 * to catch it: QuickPlayHub renders QuickModeAdapter bare, and the page has no
 * error-boundary ancestor. React then unmounts the whole tree, so the hub is
 * gone too — the round never appears AND there is no way back to the picker.
 * That is "it didn't enter at all / the whole game got stuck", and it is silent:
 * nothing is reported, so it never showed up in Sentry.
 *
 * Written BEFORE implementation (RED phase).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickPlayHub } from '../QuickPlayHub';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/ui/BackButton', () => ({
  BackButton: ({ label }: any) => <button data-testid="mock-back">{label}</button>,
}));
vi.mock('@/hooks/useBackOneLevel', () => ({ useBackOneLevel: () => vi.fn() }));
vi.mock('../QuickPlayModePicker', () => ({
  QuickPlayModePicker: ({ onSelect }: any) => (
    <div data-testid="mock-picker">
      <button data-testid="mock-play" onClick={() => onSelect('wheel-rush', 'tap')}>play</button>
    </div>
  ),
}));
vi.mock('../lightningPath', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lightningPath')>();
  return { ...actual, strikeHoldMs: () => 10, STRIKE_HOLD_MS: 10, STRIKE_HOLD_REDUCED_MS: 10 };
});
// The round itself blows up on mount — the reported wheel failure.
vi.mock('../adapters/QuickModeAdapter', () => ({
  QuickModeAdapter: () => {
    throw new Error('wheel exploded on mount');
  },
}));
vi.mock('../QuickPlayResults', () => ({
  QuickPlayResults: () => <div data-testid="mock-results" />,
}));

const ROUND = {
  mode: 'wheel-rush', seed: 's1', language: 'en', durationSec: 60,
  grid: [], wheel: { centerLetter: 'A', outerLetters: [], allLetters: [] },
  words: ['aa'], totalWords: 1, perfectScore: 10, ghosts: [],
};

describe('QuickPlayHub — a crashing round must not take the page down', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ROUND })) as any);
    // React logs the caught error; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('contains the crash instead of unmounting the app', async () => {
    expect(() => render(<QuickPlayHub />)).not.toThrow();

    fireEvent.click(screen.getByTestId('mock-play'));

    // The boundary fallback renders — the page is alive, not a blank document.
    await waitFor(() => expect(screen.queryByTestId('quick-round-error')).toBeTruthy());
    expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('offers a way back to the mode picker', async () => {
    render(<QuickPlayHub />);
    fireEvent.click(screen.getByTestId('mock-play'));

    await waitFor(() => expect(screen.queryByTestId('quick-round-error')).toBeTruthy());

    // Retry resets the boundary AND the hub's round state, so the picker returns.
    fireEvent.click(screen.getByTestId('quick-round-error-retry'));
    await waitFor(() => expect(screen.queryByTestId('mock-picker')).toBeTruthy());
  });
});
