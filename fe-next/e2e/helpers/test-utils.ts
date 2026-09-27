import { Page, expect } from '@playwright/test';

/** Supported locales for LexiClash */
export const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

/** Navigate to a locale-prefixed path */
export async function goto(page: Page, path: string, locale: Locale = 'en') {
  const url = `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
  await page.goto(url);
}

/** Wait for page to be fully loaded (hydrated) */
export async function waitForHydration(page: Page) {
  // Wait for Next.js hydration — __NEXT_DATA__ or body not having loading class
  await page.waitForLoadState('networkidle');
  // Give React time to hydrate
  await page.waitForTimeout(500);
}

/** Clear onboarding state so modal appears for fresh user */
export async function clearOnboardingState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('lexiclash_onboarding_completed');
    localStorage.removeItem('lexiclash_onboarding_data');
    localStorage.removeItem('lexiclash_contextual_guidance');
  });
}

/** Mark onboarding as completed so it doesn't block other tests */
export async function skipOnboarding(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
  });
}

/** Clear daily challenge state for fresh test */
export async function clearDailyState(page: Page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    keys
      .filter((k) => k.startsWith('lexiclash_daily') || k.startsWith('lexiclash_word_hunt'))
      .forEach((k) => localStorage.removeItem(k));
  });
}

/** Get a test ID selector */
export function tid(id: string) {
  return `[data-testid="${id}"]`;
}

/** Assert element is visible with text */
export async function expectVisible(page: Page, testId: string) {
  await expect(page.locator(tid(testId))).toBeVisible();
}

/** Assert element contains text */
export async function expectText(page: Page, testId: string, text: string | RegExp) {
  await expect(page.locator(tid(testId))).toContainText(text);
}

/** Generate a random username for tests */
export function randomUsername(prefix = 'TestPlayer') {
  return `${prefix}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Wait for a socket event simulation — checks for UI changes triggered by socket */
export async function waitForSocketUpdate(page: Page, timeout = 3000) {
  await page.waitForTimeout(timeout);
}

/** Take a named screenshot for visual regression */
export async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}
