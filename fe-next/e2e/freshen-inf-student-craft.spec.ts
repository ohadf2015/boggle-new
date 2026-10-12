import { test, expect, type Route } from '@playwright/test';

// Word Workshop loads its Pixi game view on demand; tapping PLAY must still mount the board.
const LESSON = {
  id: 'e2e-workshop-lesson',
  name: 'E2E Weekly',
  description: null,
  language: 'en',
  words: [
    { word: 'teacher', canIntegrate: true },
    { word: 'puzzle', canIntegrate: true },
    { word: 'classroom', canIntegrate: true },
  ],
  classroom_id: null,
  assignment: null,
};

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

test('student craft: PLAY mounts the lazily loaded game view without page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.route('**/api/education/practice/lessons**', (route) => json(route, { lesson: LESSON }));
  await page.route('**/api/education/practice?**', (route) =>
    route.request().method() === 'GET' ? json(route, { progress: null, mastery: 'not_started' }) : route.fallback(),
  );
  await page.route('**/api/education/practice', (route) =>
    route.request().method() === 'POST'
      ? json(route, { session: { id: 'e2e-session', lesson_id: LESSON.id, session_type: 'solo_board' } })
      : route.fallback(),
  );

  const response = await page.goto(`/en/student/craft?lesson=${LESSON.id}`);
  expect(response?.status()).toBeLessThan(400);

  const play = page.getByTestId('workshop-play');
  await expect(play).toBeVisible({ timeout: 60_000 });
  await play.click();

  const game = page.getByTestId('workshop-game');
  await expect(game).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('workshop-game-loading')).toHaveCount(0, { timeout: 60_000 });
  await expect(game.locator('button').first()).toBeVisible();

  expect(errors.filter((m) => !/ResizeObserver|Non-Error/.test(m))).toEqual([]);
});
