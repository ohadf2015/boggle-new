/**
 * Test: Native Play Games Services bridge
 *
 * Tests the Android-only Google Play Games Services bridge built on
 * @openforge/capacitor-game-connect. The bridge must be a no-op (typed
 * "unavailable" result) off Android, and pass the exact plugin-contract
 * option shapes through on Android.
 */

import {
  initializePlayGames,
  isPlayGamesAvailable,
  signInPlayGames,
  submitLeaderboardScore,
  unlockAchievement,
  incrementAchievement,
  showLeaderboard,
  showAchievements,
  __resetForTesting,
} from '../nativePGS';
import * as platform from '../platform';

// Mock platform utils
vi.mock('../platform', () => ({
  isNative: vi.fn(),
  isIOS: vi.fn(),
  isAndroid: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock the plugin — vi.hoisted so the object exists before vi.mock's factory runs
const mockGameConnect = vi.hoisted(() => ({
  signIn: vi.fn(),
  submitScore: vi.fn(),
  unlockAchievement: vi.fn(),
  incrementAchievementProgress: vi.fn(),
  showLeaderboard: vi.fn(),
  showAchievements: vi.fn(),
  getUserTotalScore: vi.fn(),
}));

vi.mock('@openforge/capacitor-game-connect', () => ({
  CapacitorGameConnect: mockGameConnect,
}));

// Mock Capacitor — initializePlayGames now gates on the native plugin being
// registered (isPluginAvailable), so the bridge only runs on real device builds.
const mockIsPluginAvailable = vi.hoisted(() => vi.fn(() => true));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isPluginAvailable: mockIsPluginAvailable },
}));

describe('Native Play Games Services bridge', () => {
  const mockIsAndroid = platform.isAndroid as jest.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    __resetForTesting();

    // Default: native Android with the plugin natively registered
    mockIsAndroid.mockReturnValue(true);
    mockIsPluginAvailable.mockReturnValue(true);

    mockGameConnect.signIn.mockResolvedValue({ player_name: 'Ada', player_id: 'p_123' });
    mockGameConnect.submitScore.mockResolvedValue(undefined);
    mockGameConnect.unlockAchievement.mockResolvedValue(undefined);
    mockGameConnect.incrementAchievementProgress.mockResolvedValue(undefined);
    mockGameConnect.showLeaderboard.mockResolvedValue(undefined);
    mockGameConnect.showAchievements.mockResolvedValue(undefined);
  });

  describe('initializePlayGames', () => {
    it('returns false on web (non-Android) and never touches the plugin', async () => {
      // GIVEN: web platform
      mockIsAndroid.mockReturnValue(false);
      // WHEN: initialize
      const result = await initializePlayGames();
      // THEN: false, no plugin call, unavailable
      expect(result).toBe(false);
      expect(isPlayGamesAvailable()).toBe(false);
    });

    it('returns false on Android when the native plugin is not registered (no unhandled rejection)', async () => {
      // GIVEN: Android but the native CapacitorGameConnect module isn't compiled in
      mockIsPluginAvailable.mockReturnValue(false);
      // WHEN: initialize
      const result = await initializePlayGames();
      // THEN: skips cleanly — never touches the plugin proxy
      expect(result).toBe(false);
      expect(isPlayGamesAvailable()).toBe(false);
      expect(mockGameConnect.signIn).not.toHaveBeenCalled();
    });

    it('returns true on Android and is idempotent', async () => {
      // GIVEN: Android
      mockIsAndroid.mockReturnValue(true);
      // WHEN: initialize twice
      const a = await initializePlayGames();
      const b = await initializePlayGames();
      // THEN: available
      expect(a).toBe(true);
      expect(b).toBe(true);
      expect(isPlayGamesAvailable()).toBe(true);
    });
  });

  describe('signInPlayGames', () => {
    it('returns unavailable on web without calling the plugin', async () => {
      mockIsAndroid.mockReturnValue(false);
      const res = await signInPlayGames();
      expect(res.success).toBe(false);
      expect(mockGameConnect.signIn).not.toHaveBeenCalled();
    });

    it('maps player_id/player_name to playerId/playerName on success', async () => {
      const res = await signInPlayGames();
      expect(res.success).toBe(true);
      expect(res.playerId).toBe('p_123');
      expect(res.playerName).toBe('Ada');
    });

    it('catches a plugin rejection (e.g. user cancel) into a failed result', async () => {
      mockGameConnect.signIn.mockRejectedValue(new Error('sign-in cancelled'));
      const res = await signInPlayGames();
      expect(res.success).toBe(false);
      expect(res.error).toContain('cancelled');
    });
  });

  describe('submitLeaderboardScore', () => {
    it('passes the exact plugin option shape { leaderboardID, totalScoreAmount }', async () => {
      const res = await submitLeaderboardScore('lb_words', 4200);
      expect(res.success).toBe(true);
      expect(mockGameConnect.submitScore).toHaveBeenCalledWith({
        leaderboardID: 'lb_words',
        totalScoreAmount: 4200,
      });
    });

    it('is a no-op returning unavailable on web', async () => {
      mockIsAndroid.mockReturnValue(false);
      const res = await submitLeaderboardScore('lb_words', 10);
      expect(res.success).toBe(false);
      expect(mockGameConnect.submitScore).not.toHaveBeenCalled();
    });

    it('returns a failed result when the plugin throws', async () => {
      mockGameConnect.submitScore.mockRejectedValue(new Error('network'));
      const res = await submitLeaderboardScore('lb_words', 10);
      expect(res.success).toBe(false);
      expect(res.error).toContain('network');
    });
  });

  describe('achievements', () => {
    it('unlockAchievement passes { achievementID }', async () => {
      const res = await unlockAchievement('ach_first_win');
      expect(res.success).toBe(true);
      expect(mockGameConnect.unlockAchievement).toHaveBeenCalledWith({ achievementID: 'ach_first_win' });
    });

    it('incrementAchievement passes { achievementID, pointsToIncrement }', async () => {
      const res = await incrementAchievement('ach_100_words', 5);
      expect(res.success).toBe(true);
      expect(mockGameConnect.incrementAchievementProgress).toHaveBeenCalledWith({
        achievementID: 'ach_100_words',
        pointsToIncrement: 5,
      });
    });

    it('unlockAchievement is unavailable on web', async () => {
      mockIsAndroid.mockReturnValue(false);
      const res = await unlockAchievement('ach_first_win');
      expect(res.success).toBe(false);
      expect(mockGameConnect.unlockAchievement).not.toHaveBeenCalled();
    });
  });

  describe('thenable Capacitor proxy (JAVASCRIPT-NEXTJS-1PH regression)', () => {
    // The real Capacitor plugin proxy exposes EVERY property access as a native
    // method — so it is accidentally "thenable". Returning or awaiting the bare
    // proxy runs Promise assimilation, which INVOKES proxy.then(resolve, reject)
    // → native '"CapacitorGameConnect.then()" is not implemented on android' →
    // an unhandled rejection (153 Sentry events). The bridge must never let the
    // bare proxy flow through await/return; it must resolve to a boolean and
    // reference the plugin synchronously.
    afterEach(() => {
      delete (mockGameConnect as unknown as { then?: unknown }).then;
    });

    function makeProxyThenable(): void {
      (mockGameConnect as unknown as { then: unknown }).then = (
        _resolve: unknown,
        reject: (e: Error) => void,
      ) => reject(new Error('"CapacitorGameConnect.then()" is not implemented on android'));
    }

    it('submitLeaderboardScore resolves (no unhandled rejection) when the proxy is thenable', async () => {
      makeProxyThenable();
      // A rejection here IS the 1PH unhandled rejection. Must resolve instead.
      const res = await submitLeaderboardScore('lb_words', 4200);
      expect(res.success).toBe(true);
      expect(mockGameConnect.submitScore).toHaveBeenCalled();
    });

    it('signInPlayGames resolves when the proxy is thenable', async () => {
      makeProxyThenable();
      const res = await signInPlayGames();
      expect(res.success).toBe(true);
    });

    it('showLeaderboard resolves when the proxy is thenable (fire-and-forget path)', async () => {
      makeProxyThenable();
      const res = await showLeaderboard('lb_words');
      expect(res.success).toBe(true);
    });
  });

  describe('native UI surfaces', () => {
    it('showLeaderboard passes { leaderboardID }', async () => {
      const res = await showLeaderboard('lb_words');
      expect(res.success).toBe(true);
      expect(mockGameConnect.showLeaderboard).toHaveBeenCalledWith({ leaderboardID: 'lb_words' });
    });

    it('showAchievements calls through', async () => {
      const res = await showAchievements();
      expect(res.success).toBe(true);
      expect(mockGameConnect.showAchievements).toHaveBeenCalled();
    });

    it('showAchievements is unavailable on web', async () => {
      mockIsAndroid.mockReturnValue(false);
      const res = await showAchievements();
      expect(res.success).toBe(false);
      expect(mockGameConnect.showAchievements).not.toHaveBeenCalled();
    });
  });
});
