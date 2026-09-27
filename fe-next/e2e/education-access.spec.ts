import { test, expect } from '@playwright/test';

test.describe('Education access gate', () => {
  test('non-teacher hitting /teacher redirects to /education/access', async ({ page }) => {
    await page.goto('http://localhost:3001/en/teacher/curriculum');
    await expect(page).toHaveURL(/\/education\/access/);
  });

  test('apply form submission shows success state', async ({ page }) => {
    await page.goto('http://localhost:3001/en/education/access');
    // Name + email come from the signed-up account — the form only asks for
    // role and use case now.
    await page.getByRole('radio', { name: /Teacher/i }).first().click();
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
