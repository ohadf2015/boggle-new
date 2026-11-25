/** The fight the player just lost: dealt again, it skips the intro and starts. */
let lostKey: string | null = null;

const keyOf = (world: number, fight: string | number) => `${world}:${fight}`;

export function rememberLoss(world: number, fight: string | number): void {
  lostKey = keyOf(world, fight);
}

export function isReplay(world: number, fight: string | number): boolean {
  return lostKey === keyOf(world, fight);
}

export function clearReplay(): void {
  lostKey = null;
}
