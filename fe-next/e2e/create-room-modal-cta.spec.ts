import { test, expect, type Page } from '@playwright/test';
import { goto, waitForHydration } from './helpers/test-utils';

/**
 * Regression cover for the 2026-08-03 prod dogfood blocker:
 * "Create Private Battle" modal's START BATTLE button was a dead click on
 * short viewports (mobile phones, short desktop windows).
 *
 * Root cause: DialogContent is the scroll container (max-h-[90dvh]
 * overflow-y-auto) and the CTA sat in normal flow at the bottom of tall
 * content. When 90dvh < content height, the button ended up below the fold —
 * and the slice of it poking past the dialog's box is Radix OVERLAY
 * territory, so a center click dismissed the modal via outside-click instead
 * of creating the room. Symptom: dialog closes, user back on Arena Hub, no
 * room, no network request, no error.
 *
 * Fix: CTA pinned as `sticky bottom-0` inside the scroll container (same
 * pattern as JoinRoomModal's DialogFooter), so it is always fully visible
 * and clickable.
 *
 * These tests would have caught it: they click the button at its geometric
 * center with a trusted mouse event — exactly what the dogfood agent did.
 */

const VIEWPORTS = [
  { name: 'iPhone 12/13/14', width: 390, height: 844 },
  { name: 'small Android', width: 360, height: 640 },
  { name: 'short desktop (dogfood repro)', width: 1280, height: 600 },
];

async function openCreateModal(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await goto(page, '/multiplayer', 'en');
  await page.evaluate(() => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
  });
  await goto(page, '/multiplayer', 'en');
  await waitForHydration(page);

  // App-promo dialog sometimes intercepts the first CTA click — dismiss it.
  const notNow = page.getByRole('button', { name: /not now/i });
  if (await notNow.isVisible().catch(() => false)) await notNow.click();

  await page
    .getByRole('button', { name: /create private battle|create.*room/i })
    .first()
    .click();

  // A second promo/dialog race guard: if the promo stole the click, retry.
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click();
    await page
      .getByRole('button', { name: /create private battle|create.*room/i })
      .first()
      .click();
  }

  const dialog = page.locator('[role="dialog"]').last();
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

test.describe('Create-room modal CTA reachability', () => {
  for (const vp of VIEWPORTS) {
    test(`START BATTLE is fully visible and hit-testable at ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      const dialog = await openCreateModal(page, vp.width, vp.height);
      const cta = dialog.getByRole('button', { name: /start battle|create/i }).last();
      await expect(cta).toBeVisible();

      // Fully inside the viewport — the bug left only a sliver peeking past
      // the dialog's bottom edge.
      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);

      // Precise regression assertion: the element at the button's center must
      // be the button (or its child), NOT the dialog overlay. Pre-fix this
      // returned the overlay div, so the click dismissed the modal.
      const hitIsCta = await cta.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        );
        return hit === el || el.contains(hit);
      });
      expect(
        hitIsCta,
        'center of START BATTLE is covered by another element (pre-fix: the dialog overlay)',
      ).toBe(true);
    });

    test(`clicking START BATTLE at its center does NOT dismiss the modal back to the room list (${vp.name})`, async ({
      page,
    }) => {
      const dialog = await openCreateModal(page, vp.width, vp.height);
      const cta = dialog.getByRole('button', { name: /start battle|create/i }).last();
      await expect(cta).toBeVisible();

      // Trusted click at the geometric center — the dogfood repro.
      const box = await cta.boundingBox();
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

      // Wait for the join round-trip to settle one way or the other.
      await page.waitForTimeout(4_000);

      const dialogOpen = await dialog.isVisible().catch(() => false);
      const reachedLobby = await page
        .getByText(/waiting for players|players in room|invite/i)
        .first()
        .isVisible()
        .catch(() => false);

      // Bug signature: modal closed, still on the Arena Hub room list, no
      // room created — the click hit the overlay and Radix dismissed.
      const arenaHubVisible = await page
        .getByRole('heading', { name: /arena hub/i })
        .isVisible()
        .catch(() => false);
      const bugSignature = !dialogOpen && !reachedLobby && arenaHubVisible;

      expect(
        bugSignature,
        'START BATTLE click dismissed the modal back to the room list without creating a room (overlay click)',
      ).toBe(false);
    });
  }
});
