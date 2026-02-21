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

  it('uses roomChat translation key for chat section heading', () => {
    // "Battle Feed" is confusing jargon — should use hostView.roomChat
    expect(source).not.toContain("t('hostView.battleFeed')");
    expect(source).toContain("t('hostView.roomChat')");
  });

  it('TV Mode toggle appears outside the advanced settings accordion', () => {
    // TV Mode should be visible without expanding "Advanced Settings"
    // Check that broadcastMode checkbox appears BEFORE the showAdvanced conditional block
    const broadcastIdx = source.indexOf('broadcastMode');
    const advancedIdx = source.indexOf('showAdvanced &&');
    expect(broadcastIdx).toBeGreaterThan(-1);
    expect(advancedIdx).toBeGreaterThan(-1);
    expect(broadcastIdx).toBeLessThan(advancedIdx);
  });
});
