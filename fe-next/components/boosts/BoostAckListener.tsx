'use client';

import { useBoostAckListener } from '@/hooks/useBoostAckListener';

/**
 * Mounts the boost-ack listener globally inside the socket-aware provider tree.
 * Renders nothing — its job is to surface a success toast when the server
 * confirms a boost was registered for the player's game.
 */
export default function BoostAckListener(): null {
  useBoostAckListener();
  return null;
}
