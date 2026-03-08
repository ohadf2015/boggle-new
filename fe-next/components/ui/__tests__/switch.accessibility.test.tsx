/**
 * @jest-environment jsdom
 *
 * Tests for switch.tsx focus ring fix
 */
import fs from 'fs';
import path from 'path';

describe('switch.tsx accessibility', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../switch.tsx'),
      'utf-8'
    );
  });

  it('should use focus-visible:ring-4 for sufficient visibility', () => {
    expect(source).toContain('focus-visible:ring-4');
  });

  it('should use focus-visible:ring-neo-lime for high contrast ring', () => {
    expect(source).toContain('focus-visible:ring-neo-lime');
  });
});
