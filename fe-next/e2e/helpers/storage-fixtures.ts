/**
 * localStorage state fixtures for simulating different user states in E2E tests.
 * Matches the exact keys/formats used by the LexiClash app.
 */

/** Fresh user — no state at all */
export const FRESH_USER = {};

/** User who completed onboarding but never played */
export const ONBOARDED_USER = {
  lexiclash_onboarding_completed: 'true',
  lexiclash_onboarding_data: JSON.stringify({
    avatarId: 'pizza',
    displayName: 'TestPlayer',
    selectedMode: 'single',
    completedAt: new Date().toISOString(),
  }),
};

/** User with a daily word hunt streak */
export const DAILY_PLAYER = {
  ...ONBOARDED_USER,
  lexiclash_daily_streak: JSON.stringify({
    current: 5,
    longest: 12,
    lastPlayedDate: new Date().toISOString().slice(0, 10),
  }),
};

/** Guest user with stored profile (no auth) */
export const GUEST_WITH_PROFILE = {
  ...ONBOARDED_USER,
  lexiclash_profile: JSON.stringify({
    displayName: 'GuestPlayer',
    avatarId: 'sushi',
    customAvatar: null,
  }),
};

/** Apply a storage fixture to the page */
export async function applyStorageFixture(
  page: import('@playwright/test').Page,
  fixture: Record<string, string>
) {
  await page.evaluate((data) => {
    localStorage.clear();
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }, fixture);
}
