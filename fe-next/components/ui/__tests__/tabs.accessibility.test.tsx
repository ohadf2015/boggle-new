/**
 * @jest-environment jsdom
 *
 * Tests for tabs.tsx contrast and focus fixes
 */
import fs from 'fs';
import path from 'path';

describe('tabs.tsx accessibility', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../tabs.tsx'),
      'utf-8'
    );
  });

  it('pill variant uses text-neo-white/80 minimum instead of text-neo-white/70', () => {
    expect(source).not.toContain('text-neo-white/70');
  });

  it('underline variant uses text-slate-400 instead of text-gray-500 for better contrast', () => {
    expect(source).not.toContain('text-gray-500');
    expect(source).toContain('text-slate-400');
  });
});
