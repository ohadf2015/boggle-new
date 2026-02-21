/**
 * @jest-environment jsdom
 *
 * Tests for RoomListView UX layout fixes:
 * - No double scroll (outer container must not have overflow-y-auto)
 * - Friend Activity section removed
 */
import fs from 'fs';
import path from 'path';

describe('RoomListView UX layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../RoomListView.tsx'),
      'utf-8'
    );
  });

  it('outer scroll container does NOT have overflow-y-auto (no double scroll)', () => {
    // The outer container (flex-1 min-h-0 bg-neo-navy) must NOT also have overflow-y-auto
    const lines = source.split('\n');
    const problematicLines = lines.filter(
      (line) => line.includes('min-h-0') && line.includes('overflow-y-auto') && line.includes('bg-neo-navy')
    );
    expect(problematicLines).toHaveLength(0);
  });

  it('does NOT render Friend Activity section', () => {
    expect(source).not.toContain('friendActivity');
    expect(source).not.toContain('noFriendsOnline');
    expect(source).not.toContain('invitePrompt');
  });
});
