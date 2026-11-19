import { fireEvent, screen, waitFor } from '@testing-library/react';

/** Unfolds "More games" when it is closed, as a teacher would before picking a non-preset game. */
export function showGames(): void {
  const more = screen.queryByTestId('lobby-more-games');
  if (more?.getAttribute('aria-expanded') === 'false') fireEvent.click(more);
}

export function gameTile(id: string): HTMLElement {
  showGames();
  return screen.getByTestId(`mode-tile-${id}`);
}

export function queryGameTile(id: string): HTMLElement | null {
  showGames();
  return screen.queryByTestId(`mode-tile-${id}`);
}

export function findGameTile(id: string): Promise<HTMLElement> {
  return waitFor(() => gameTile(id));
}

export function modeGrid(): HTMLElement {
  showGames();
  return screen.getByTestId('lobby-mode-grid');
}

/** Opens the one fold, then returns the Game options door inside it. */
export function gameOptions(): HTMLElement {
  showGames();
  return screen.getByTestId('lobby-setup-summary');
}

/** Opens the class and list line, then returns the class picker inside it. */
export function classPicker(): HTMLElement {
  const line = screen.queryByTestId('lobby-lesson-toggle');
  if (line?.getAttribute('aria-expanded') === 'false') fireEvent.click(line);
  return screen.getByTestId('lobby-class-picker');
}
