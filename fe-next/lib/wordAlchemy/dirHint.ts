const norm = (s: string) => s.trim().toUpperCase();

/**
 * Returns ↑ when the guess comes before the correct answer alphabetically
 * (player should try something later in the alphabet), ↓ if after.
 * Uses locale-aware comparison so Hebrew sorts correctly.
 */
export function alchemyDirHint(guess: string, answer: string, locale: string): '↑' | '↓' {
  return norm(guess).localeCompare(norm(answer), locale) < 0 ? '↑' : '↓';
}
