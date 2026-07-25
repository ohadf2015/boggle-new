import { test, expect } from '@playwright/test';
import { OnboardingPage } from './pages/OnboardingPage';
import { goto, clearOnboardingState, waitForHydration } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

/**
 * FTUE end-to-end.
 *
 * The flow is one screen. The specs below deliberately assert the ABSENCE of
 * gates as much as their presence — the previous FTUE stalled new players on a
 * language step that needed two taps on the same flag, a profile form whose CTA
 * looked disabled, and a 14-option style grid, all before any gameplay.
 *
 * (The former version of this file tested `components/OnboardingModal.tsx` — a
 * welcome-demo → profile → quick-tips modal with no live caller — so it was
 * already asserting against a flow that does not ship.)
 */

// ---------------------------------------------------------------------------
// 1. Fresh user first visit
// ---------------------------------------------------------------------------
test.describe('Fresh User First Visit', () => {
  test('the FTUE appears on first visit', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();
    await expect(onboarding.flow).toBeVisible();
  });

  test('does NOT appear if onboarding already completed', async ({ page }) => {
    await goto(page, '/');
    await applyStorageFixture(page, ONBOARDED_USER);
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await expect(onboarding.flow).not.toBeVisible();
  });

  test('does NOT appear if onboarding was skipped', async ({ page }) => {
    await goto(page, '/');
    await page.evaluate(() => {
      localStorage.setItem('lexiclash_onboarding_completed', 'skipped');
    });
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await expect(onboarding.flow).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. One screen, no gates
// ---------------------------------------------------------------------------
test.describe('Single-screen FTUE', () => {
  test('a player who reads nothing can reach a game in one tap', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();

    await onboarding.play();

    await onboarding.expectRedirectToGame();
  });

  test('the name arrives pre-filled, so identity is optional', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();

    await expect(onboarding.nameInput).toBeVisible();
    expect((await onboarding.nameInput.inputValue()).trim().length).toBeGreaterThan(0);
  });

  test('play stays enabled even with the name cleared', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();

    await onboarding.nameInput.fill('');
    await expect(onboarding.playButton).toBeEnabled();

    await onboarding.play();
    await onboarding.expectRedirectToGame();
  });

  test('a chosen name is what gets saved', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();

    await onboarding.nameInput.fill('E2EPlayer');
    await onboarding.play();
    await onboarding.expectRedirectToGame();

    const stored = await page.evaluate(() =>
      localStorage.getItem('lexiclash_onboarding_data')
    );
    expect(stored).toContain('E2EPlayer');
  });

  test('language switches on a single tap and does not advance the flow', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();

    await onboarding.language('sv').click();

    // Still on the same screen — one tap changes language, nothing else.
    await expect(onboarding.playButton).toBeVisible();
    await expect(onboarding.language('sv')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the tutorial is opt-in and returns the player to play', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();

    await expect(onboarding.howToPlayLink).toBeVisible();
    await onboarding.howToPlayLink.click();

    // Opening it must not end onboarding or navigate anywhere.
    await expect(page).toHaveURL(/\/en\/?$/);
  });
});

// ---------------------------------------------------------------------------
// 3. Completion state
// ---------------------------------------------------------------------------
test.describe('Completion', () => {
  test('marks onboarding complete in localStorage', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForFlow();

    await onboarding.play();
    await onboarding.expectRedirectToGame();

    const completed = await page.evaluate(() =>
      localStorage.getItem('lexiclash_onboarding_completed')
    );
    expect(completed).toBe('true');
  });

  test('clearing onboarding state brings the FTUE back', async ({ page }) => {
    await goto(page, '/');
    await applyStorageFixture(page, ONBOARDED_USER);
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await expect(onboarding.flow).not.toBeVisible();

    await clearOnboardingState(page);
    await page.reload();
    await onboarding.waitForFlow();
    await expect(onboarding.flow).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Locale support
// ---------------------------------------------------------------------------
test.describe('Locale Support', () => {
  test('works in English (LTR)', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser('en');
    await onboarding.waitForFlow();
    await expect(onboarding.flow).toHaveAttribute('dir', 'ltr');
  });

  test('works in Hebrew (RTL) with the correct dir attribute', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser('he');
    await onboarding.waitForFlow();
    await expect(onboarding.flow).toHaveAttribute('dir', 'rtl');
  });
});
