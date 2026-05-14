import { test, expect } from '@playwright/test';

test.describe('Education access gate', () => {
  test('non-teacher hitting /teacher redirects to /education/access', async ({ page }) => {
    await page.goto('http://localhost:3001/en/teacher/curriculum');
    await expect(page).toHaveURL(/\/education\/access/);
  });

  test('apply form submission shows success state', async ({ page }) => {
    await page.goto('http://localhost:3001/en/education/access');
    await page.fill('#tar-full_name', 'E2E Tester');
    await page.fill('#tar-email', `e2e-${Date.now()}@example.com`);
    await page.fill('#tar-use_case', 'This is an E2E test use case description.');
    await page.click('button[type=submit]');
    await expect(page.getByRole('status')).toContainText(/Application sent|sent/i);
  });

  test('admin queue redirects non-admin away', async ({ page }) => {
    await page.goto('http://localhost:3001/en/admin/teacher-access');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/admin/teacher-access');
  });
});
