/**
 * PlayerView — MP cozy-intro suppression contract.
 *
 * The cozy `ModeIntroCard` (ModeRevealOverlay's first-time branch) is a
 * practice-mode surface. In MP, first-time players must enter the round the
 * same as returning players: `ModeRevealOverlay` splash → `GoRipplesAnimation`
 * 3-2-1-GO → game active. Rendering the cozy intro in MP blocks
 * `setGameActive(true)` + `gameTimer.resume()` (PlayerView gates them on
 * `!showModeReveal`), leaving the round timer frozen at the room's duration
 * (default 2:00) until the player notices the "Vamos" CTA.
 *
 * Contract enforced here:
 *   - `<ModeRevealOverlay>` mounts MUST NOT pass `modeKey=`. Without modeKey,
 *     `ModeRevealOverlay` always renders the splash branch (see
 *     `components/game/ModeRevealOverlay.tsx:32`).
 *   - The auto-dismiss `setTimeout` MUST fire for everyone — no
 *     `hasSeenIntro` early-return short-circuit.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PlayerView — MP cozy intro suppression', () => {
  const source = readFileSync(
    resolve(__dirname, '../PlayerView.tsx'),
    'utf8',
  );

  it('does not pass modeKey prop to <ModeRevealOverlay>', () => {
    const occurrences = source.match(/<ModeRevealOverlay\b[\s\S]*?modeKey\s*=/g);
    expect(occurrences).toBeNull();
  });

  it('auto-dismiss effect does not short-circuit on !hasSeenIntro', () => {
    expect(source).not.toMatch(/if\s*\(\s*!hasSeenIntro\s*\)\s*return\s*;/);
  });
});
