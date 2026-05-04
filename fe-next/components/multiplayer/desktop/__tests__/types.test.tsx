import type { ShellSlots, MpDesktopMode } from '../types';

describe('ShellSlots contract', () => {
  it('compiles for a complete slot object', () => {
    const slots: ShellSlots = {
      left: { roster: <div/>, modeBadge: <div/> },
      center: <div/>,
      right: { wordsLadder: <div/> },
      meta: { mode: 'classic', roomId: 'r1' },
    };
    expect(slots.meta.mode).toBe('classic');
  });

  it('accepts all four modes', () => {
    const modes: MpDesktopMode[] = ['classic', 'wheel-rush', 'blast', 'word-hunt'];
    expect(modes).toHaveLength(4);
  });
});
