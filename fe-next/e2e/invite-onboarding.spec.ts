import { test, expect } from '@playwright/test';
import {
  goto,
  clearOnboardingState,
  waitForHydration,
} from './helpers/test-utils';

/**
 * Invite-mode onboarding E2E.
 *
 * Verifies the dedicated 3-step flow first-time users get when they land via
 * a multiplayer-room invite link (`?room=ABC123&host=Alice`):
 *
 *   1. Language pick
 *   2. Profile (name + avatar) with InviteContextBanner showing host + code
 *   3. InviteTutorialTeaser (one preset board, find any valid demo word)
 *      → consume invite → /multiplayer?room=ABC123
 *
 * The "skip" path bypasses the teaser via the always-visible Skip CTA in the
 * sticky banner — one tap from anywhere in the flow.
 */

const ROOM_CODE = 'ABC123';
const HOST_NAME = 'Alice';

test.describe('Invite-mode onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any prior onboarding state so the gate always shows the FTUE.
    await goto(page, '/');
    await clearOnboardingState(page);
    await page.evaluate(() => {
      sessionStorage.clear();
    });
  });

  test('happy path — complete tutorial → arrive at MP room', async ({ page }) => {
    await page.goto(`/en?room=${ROOM_CODE}&host=${HOST_NAME}`);
    await waitForHydration(page);

    // FTUE mounts because user is fresh + has pending invite
    await expect(page.getByTestId('onboarding-flow')).toBeVisible();

    // Pick language (English) — the LanguageSelect renders one button per locale
    await page.getByRole('button', { name: /english/i }).click();

    // Profile step shows the InviteContextBanner with host + code
    const banner = page.getByTestId('invite-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(HOST_NAME);
    await expect(banner).toContainText(ROOM_CODE);

    // Fill the profile name and submit
    // The exact selector depends on QuickProfileSetup's name input — fall back
    // to first textbox if no testid is present.
    const nameInput = page.getByRole('textbox').first();
    await nameInput.fill('Bob');

    // Submit the profile (button text varies by locale; use English match)
    await page.getByRole('button', { name: /(let'?s\s*go|continue|join)/i }).first().click();

    // InviteTutorialTeaser mounts — banner stays sticky on top
    await expect(page.getByTestId('teaser-board')).toBeVisible();
    await expect(page.getByTestId('invite-banner')).toBeVisible();

    // Spell "CAT" — a valid teaser word from the hardcoded set
    await page.getByTestId('teaser-tile-C').click();
    await page.getByTestId('teaser-tile-A').click();
    await page.getByTestId('teaser-tile-T').click();
    await page.getByTestId('teaser-submit').click();

    // Celebrate state appears, then ~1.2s later we navigate to the room
    await expect(page).toHaveURL(new RegExp(`/multiplayer\\?room=${ROOM_CODE}`), {
      timeout: 5000,
    });

    // Pending invite should be consumed (no longer in sessionStorage)
    const pending = await page.evaluate(() =>
      sessionStorage.getItem('lexiclash_pending_room_invite'),
    );
    expect(pending).toBeNull();
  });

  test('skip path — banner CTA jumps straight to MP room without teaser', async ({ page }) => {
    await page.goto(`/en?room=${ROOM_CODE}&host=${HOST_NAME}`);
    await waitForHydration(page);

    await expect(page.getByTestId('onboarding-flow')).toBeVisible();
    await page.getByRole('button', { name: /english/i }).click();

    // Profile step — fill name and submit so we reach a screen with the banner
    const nameInput = page.getByRole('textbox').first();
    await nameInput.fill('Bob');
    await page.getByRole('button', { name: /(let'?s\s*go|continue|join)/i }).first().click();

    // Teaser is mounted with the banner; tap Skip CTA in the banner
    await expect(page.getByTestId('teaser-board')).toBeVisible();
    await page.getByTestId('invite-banner-skip').click();

    // Lands at /multiplayer?room=ABC123 without going through the teaser word
    await expect(page).toHaveURL(new RegExp(`/multiplayer\\?room=${ROOM_CODE}`), {
      timeout: 5000,
    });
  });

  test('host param sanitises XSS attempt — angle brackets stripped', async ({ page }) => {
    const xssAttempt = encodeURIComponent('<script>alert(1)</script>');
    await page.goto(`/en?room=${ROOM_CODE}&host=${xssAttempt}`);
    await waitForHydration(page);

    await page.getByRole('button', { name: /english/i }).click();

    // Banner renders without raw angle brackets in the host slot.
    const banner = page.getByTestId('invite-banner');
    await expect(banner).toBeVisible();
    const text = await banner.textContent();
    expect(text ?? '').not.toContain('<');
    expect(text ?? '').not.toContain('>');
  });
});

test.describe('Practice hub fallback', () => {
  test('PendingRoomBanner appears on /practice when invite still pending', async ({ page }) => {
    await goto(page, '/');
    // Mark onboarding completed so we go straight to LandingView, then to /practice
    await page.evaluate(() => {
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      // Seed a pending invite directly so we don't have to walk the FTUE
      sessionStorage.setItem(
        'lexiclash_pending_room_invite',
        JSON.stringify({ code: 'ABC123', hostName: 'Alice', ts: Date.now() }),
      );
    });

    await goto(page, '/practice');
    await waitForHydration(page);

    const banner = page.getByTestId('pending-room-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Alice');
    await expect(banner).toContainText('ABC123');

    // Tap CTA → consume invite + navigate to room
    await page.getByTestId('pending-room-banner-cta').click();
    await expect(page).toHaveURL(/\/multiplayer\?room=ABC123/, { timeout: 5000 });
  });
});
