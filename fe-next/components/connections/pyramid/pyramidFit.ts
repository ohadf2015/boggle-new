/** Fredoka black caps run ~0.72em wide; a carved word may fill 80% of its stone. */
const WIDTH_SHARE = 80 / 0.72;
const PLAQUE_SHARE = 1.3;

/**
 * Font size for a word carved into a brick (or the capstone plaque): capped by
 * the stone's height, and shrunk by length so up to 10+ letters stay inside.
 * Sized in container units, so the stone must be a size container.
 */
export function carvedWordSize(word: string, stone: 'brick' | 'capstone' = 'brick'): string {
  const letters = Math.max(4, [...word].length);
  const share = stone === 'capstone' ? WIDTH_SHARE * PLAQUE_SHARE : WIDTH_SHARE;
  const cap = stone === 'capstone' ? '26cqh' : '46cqh';
  return `min(${cap}, ${(share / letters).toFixed(1)}cqi)`;
}
