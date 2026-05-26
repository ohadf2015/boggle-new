// @vitest-environment jsdom
import { describe, it } from 'vitest';

/**
 * Pending integration: once /public/rive/crane.riv ships from the designer,
 * the WordTowerCrane should mount RiveAnimation with stateMachine="Crane" and
 * fire triggers on the same lifecycle the DOM crane already runs:
 *
 *   - sweep         -> boolean isSwinging = true while the trolley moves
 *   - drop          -> trigger fired on tap
 *   - landed:<q>    -> trigger fired with quality ('perfect'|'good'|'sloppy'|'miss')
 *   - topple        -> trigger fired when consecutiveSloppy >= TOPPLE_AFTER_SLOPPY
 *
 * The reduced-motion path must keep the DOM crane and skip Rive entirely
 * (already handled by RiveAnimation.tsx's useDevicePerformance gate).
 *
 * Until the asset lands, this file pins the contract via TODOs so the next
 * change to the crane has a checklist instead of a blank page.
 */
describe.todo('WordTowerCrane × Rive integration', () => {
  it.todo('mounts RiveAnimation with src=/rive/crane.riv stateMachine=Crane');
  it.todo('sets isSwinging=true while sweeping, false on drop');
  it.todo('fires drop trigger when tap commits placement');
  it.todo('fires landed trigger with quality after evaluatePlacement');
  it.todo('fires topple trigger when consecutiveSloppy >= TOPPLE_AFTER_SLOPPY');
  it.todo('skips Rive when reducedMotion=true (DOM crane only)');
});
