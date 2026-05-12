import { FROST_HITS_REQUIRED } from '../types';
import type { BlastTileType } from '../types'; // eslint-disable-line no-duplicate-imports

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
    // New tile types: cleared on first hit like standard/gold/bomb/etc.
    case 'diamond': return 0;
    case 'countdown': return 0;
    case 'shuffle': return 0;
    case 'magma': return 0;
    case 'portal': return 0;
    case 'catalyst': return 0;
    default: return 0;
  }
}
