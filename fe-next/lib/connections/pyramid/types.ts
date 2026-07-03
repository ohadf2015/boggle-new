import type { ConnectionPuzzle } from '../types';

/**
 * One authored Bridge Pyramid unit: 3 base bridge riddles whose bridges all
 * pair with `metaAnswer` (the finale — find the word that forms a compound /
 * fixed phrase with each solved bridge).
 */
export interface PyramidPuzzle {
  id: string;
  /** The finale answer M — pairs with each base bridge. */
  metaAnswer: string;
  metaAccepted?: string[];
  metaHint?: string;
  /** Exactly 3, played in order; their bridges become the finale clues. */
  base: [ConnectionPuzzle, ConnectionPuzzle, ConnectionPuzzle];
  difficulty: ConnectionPuzzle['difficulty'];
}
