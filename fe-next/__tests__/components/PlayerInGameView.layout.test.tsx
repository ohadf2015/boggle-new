/**
 * @jest-environment jsdom
 *
 * Tests: PlayerInGameView must not use h-dvh (parent already constrains height)
 */
import fs from 'fs';
import path from 'path';

describe('PlayerInGameView layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../../player/components/PlayerInGameView.tsx'),
      'utf-8'
    );
  });

  it('main game div uses flex-1 instead of h-dvh', () => {
    expect(source).not.toContain('"h-dvh overflow-hidden bg-neo-cream');
    // After blast mode conditional styling, the classes are split across cn() branches
    expect(source).toContain('flex-1 flex flex-col min-h-0 overflow-x-clip overflow-y-auto transition-colors duration-300');
    expect(source).toContain('bg-neo-cream');
  });

  it('loading placeholder does not use min-h-dvh', () => {
    expect(source).not.toContain('"min-h-dvh bg-neo-cream');
    expect(source).toContain('flex-1 flex flex-col min-h-0 bg-neo-cream');
  });
});
