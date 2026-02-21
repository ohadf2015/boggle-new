/**
 * @jest-environment jsdom
 *
 * Tests for PlayerWaitingView layout fix:
 * - Root div must not use h-dvh (parent PageClient already constrains height)
 * - main element must be flex flex-col for mobile scroll to work
 */
import fs from 'fs';
import path from 'path';

describe('PlayerWaitingView layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../../player/components/PlayerWaitingView.tsx'),
      'utf-8'
    );
  });

  it('root div uses flex-1 min-h-0 instead of h-dvh', () => {
    // Root div should NOT use h-dvh (PageClient already has h-dvh)
    expect(source).not.toMatch(/className="h-dvh flex flex-col bg-neo-navy/);
    expect(source).toContain('flex-1 flex flex-col min-h-0 bg-neo-navy');
  });

  it('main element uses flex flex-col for mobile scroll chain', () => {
    // main must be flex flex-col so its flex-1 children can take height
    expect(source).toContain('flex-1 min-h-0 overflow-hidden flex flex-col');
  });

  it('mobile layout div uses flex-1 min-h-0 instead of h-full', () => {
    // lg:hidden div must not use bare h-full — needs flex-1 min-h-0
    expect(source).not.toContain('"lg:hidden h-full"');
    expect(source).toContain('lg:hidden flex flex-col flex-1 min-h-0');
  });

  it('chat container does not use fixed h-72', () => {
    expect(source).not.toContain('"bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-72"');
  });

  it('uses roomChat translation key for chat section heading', () => {
    expect(source).not.toContain("t('hostView.battleFeed')");
    expect(source).toContain("t('hostView.roomChat')");
  });
});
