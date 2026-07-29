/**
 * shadowPhase — pure phase state machine for the Shadow Clash phone controller.
 *
 * Why this exists: the phone used to call `setPhase(...)` directly from every
 * socket handler. A player eliminated mid-game would then have their
 * `eliminated` screen overwritten by the room-wide `discussionStart` /
 * `voteStart` broadcasts — reviving a dead player with a live ballot. Routing
 * every transition through this reducer makes the terminal phases sticky:
 * `eliminated` and `watching` only yield to the game-over event.
 */

export type ShadowPhase =
  | 'waiting'
  | 'role-reveal'
  | 'night-waiting'
  | 'night-action'
  | 'seer-result'
  | 'discussion'
  | 'voting'
  | 'voted'
  | 'eliminated'
  | 'watching';

export type ShadowPhaseEvent =
  | { type: 'role-assigned' }
  | { type: 'night-action'; waiting?: boolean }
  | { type: 'seer-result' }
  | { type: 'discussion-start' }
  | { type: 'vote-start' }
  | { type: 'voted' }
  | { type: 'eliminated' }
  | { type: 'game-over' };

export function shadowPhaseReducer(current: ShadowPhase, event: ShadowPhaseEvent): ShadowPhase {
  // role-assigned is a NEW-GAME signal (host started the next game), never a
  // mid-game revival vector — so it must escape the terminal states below, or a
  // player who finished one game would be frozen on "watching" in game two.
  if (event.type === 'role-assigned') {
    return 'role-reveal';
  }
  // Eliminated is terminal: a dead player can never be pulled back into active
  // play by a room-wide broadcast. The only way out is the game ending.
  if (current === 'eliminated') {
    return event.type === 'game-over' ? 'watching' : 'eliminated';
  }
  // The post-game spectator screen is fully sticky (until the next game).
  if (current === 'watching') {
    return 'watching';
  }

  switch (event.type) {
    // 'role-assigned' is handled by the early return above (escapes terminals).
    case 'night-action':
      return event.waiting ? 'night-waiting' : 'night-action';
    case 'seer-result':
      return 'seer-result';
    case 'discussion-start':
      return 'discussion';
    case 'vote-start':
      return 'voting';
    case 'voted':
      return 'voted';
    case 'eliminated':
      return 'eliminated';
    case 'game-over':
      return 'watching';
    default:
      return current;
  }
}
