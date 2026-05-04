import type { ShellSlots, MpDesktopMode } from '../types';

describe('ShellSlots contract', () => {
  it('compiles for a complete slot object', () => {
    const slots: ShellSlots = {
      left: { roster: <div/>, modeBadge: <div/> },
      center: <div/>,
      right: { wordsLadder: <div/> },
      meta: { mode: 'standard', roomId: 'r1' },
    };
    expect(slots.meta.mode).toBe('standard');
  });

  it('accepts all four modes', () => {
    const modes: MpDesktopMode[] = ['standard', 'wheel-rush', 'blast', 'word-hunt'];
    expect(modes).toHaveLength(4);
  });
});
