/**
 * @jest-environment jsdom
 *
 * Tests for HostPreGameView UX improvements:
 * - Chat uses responsive height (not fixed h-72)
 * - "Battle Feed" label renamed to roomChat translation key
 * - TV Mode visible outside Advanced Settings accordion
 */
import fs from 'fs';
import path from 'path';

describe('HostPreGameView UX improvements', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../host/components/HostPreGameView.tsx'),
      'utf-8'
    );
  });

  it('chat container does not use fixed h-72', () => {
    // h-72 is too tall on small phones (288px = 43% of iPhone SE height)
    expect(source).not.toContain('"bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-72"');
  });

  it('does not use battleFeed jargon for chat section', () => {
    // "Battle Feed" is confusing jargon — chat heading is provided by RoomChat component itself
    expect(source).not.toContain("t('hostView.battleFeed')");
  });

  it('TV Mode toggle appears outside the advanced settings accordion', () => {
    // TV Mode should be visible without expanding "Advanced Settings"
    // broadcastMode was extracted to BattleModeCard — check that file
    const battleModeSource = fs.readFileSync(
      path.join(__dirname, '../host/components/pre-game/BattleModeCard.tsx'),
      'utf-8'
    );
    const broadcastIdx = battleModeSource.indexOf('broadcastMode');
    const advancedIdx = battleModeSource.indexOf('showAdvanced &&');
    expect(broadcastIdx).toBeGreaterThan(-1);
    expect(advancedIdx).toBeGreaterThan(-1);
    expect(broadcastIdx).toBeLessThan(advancedIdx);
  });
});
