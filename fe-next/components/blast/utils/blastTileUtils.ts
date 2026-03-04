import type { BlastTileType } from '../types';
import { FROST_HITS_REQUIRED } from '../types';

/**
 * Get initial hitsRemaining for a tile type.
 * Multi-hit tiles survive being included in words until their hits reach 0.
 */
export function getInitialHitsRemaining(type: BlastTileType): number {
  switch (type) {
    case 'ice': return 2;
    case 'prism': return 2;
    case 'gem': return 3;
    // Frost (frozen) redesign: 2 hits instead of 3 (reveals hidden inner special)
    case 'frozen': return FROST_HITS_REQUIRED;
    default: return 0;
  }
}
