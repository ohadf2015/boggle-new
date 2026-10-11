import { expect, type Page } from '@playwright/test';

/** Solve the loaded crossword by revealing every cell; resolves once "Solved!" shows. */
export async function solveCrosswordByReveal(page: Page): Promise<void> {
  const cells = page.getByRole('gridcell');
  const letter = page.getByRole('button', { name: 'Letter', exact: true });
  const solved = page.getByText('Solved!', { exact: true });
  const count = await cells.count();
  for (let i = 0; i < count && !(await solved.isVisible()); i++) {
    await cells.nth(i).click();
    await letter.click();
  }
  await expect(solved).toBeVisible();
}
