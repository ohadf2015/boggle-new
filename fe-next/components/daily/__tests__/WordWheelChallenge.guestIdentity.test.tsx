/**
 * A guest must be ONE person across the daily challenge.
 *
 * Word Hunt recorded guests under the daily fingerprint
 * (utils/dailyChallenge/guestPlayer), Word Wheel under the multiplayer guest
 * session id (utils/guestManager). Two ids → the combined board could never
 * merge a guest's two scores, and the wheel screens never highlighted the
 * guest's own Word Hunt row. Word Wheel now uses the daily fingerprint too.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    const Lazy = React.lazy(loader);
    const Stub = (props: Record<string, unknown>) => (
      <React.Suspense fallback={null}>
        <Lazy {...props} />
      </React.Suspense>
    );
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

vi.mock('../WordWheelEffectsCanvas', () => ({
  __esModule: true,
  default: () => null,
  WordWheelEffectsCanvas: () => null,
}));

// Component types are cached per tag: a Proxy that hands out a NEW component on
// every property access remounts the whole tree on each state update, which
// detaches the element a pointer sequence (userEvent) is in the middle of clicking.
vi.mock('framer-motion', () => {
  const cache = new Map<string, React.FC<React.PropsWithChildren<Record<string, unknown>>>>();
  return {
    m: new Proxy({}, {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          const Comp: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children, ...props }) => <div {...props}>{children}</div>;
          Comp.displayName = `m.${tag}`;
          cache.set(tag, Comp);
        }
        return cache.get(tag);
      },
    }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-15',
  getPuzzleNumber: () => 42,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));
vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({
  getGuestFingerprint: () => Promise.resolve('daily-fp'),
  getGuestDailyPlayer: () => Promise.resolve({ displayName: 'Curious Otter', avatarEmoji: '🦦', avatarColor: '#123456' }),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    validWords: [],
  }),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => 'session-fp',
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    canShowAd: false,
    isDailyLimitReached: false,
    showAd: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-game" />,
}));
vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-results" />,
}));

const capturedProps: Array<{ scope?: string; currentGuestFingerprint?: string | null }> = [];
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: (props: { scope?: string; currentGuestFingerprint?: string | null }) => {
    capturedProps.push(props);
    return <div data-testid="tabbed-daily-leaderboard" data-fp={props.currentGuestFingerprint ?? ''} />;
  },
}));

beforeEach(() => {
  capturedProps.length = 0;
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ hasPlayed: false }) })));
});

describe('WordWheelChallenge — guest identity', () => {
  it('hands the ready-screen leaderboard the DAILY guest fingerprint, not the multiplayer session id', async () => {
    render(<WordWheelChallenge />);
    const lb = await waitFor(() => screen.getByTestId('tabbed-daily-leaderboard'));
    await waitFor(() => expect(lb.getAttribute('data-fp')).toBe('daily-fp'));
    expect(capturedProps.some(p => p.currentGuestFingerprint === 'session-fp')).toBe(false);
  });

  it('asks the server about today’s play with the same daily fingerprint', async () => {
    render(<WordWheelChallenge />);
    await waitFor(() => {
      const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(c => String(c[0]));
      expect(urls.some(u => u.includes('/word-wheel/check-played/') && u.includes('guestFingerprint=daily-fp'))).toBe(true);
    });
  });
});
