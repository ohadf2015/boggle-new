import type { BlastTileType } from '../types';

/**
 * Get initial hitsRemaining for a tile type.
 * Multi-hit tiles survive being included in words until their hits reach 0.
 */
export function getInitialHitsRemaining(type: BlastTileType): number {
  switch (type) {
    case 'ice': return 2;
    case 'prism': return 2;
    case 'gem': return 3;
    case 'frozen': return 3;
    default: return 0;
  }
}
