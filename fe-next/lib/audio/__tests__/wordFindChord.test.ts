import { playWordFindChord } from '../wordFindChord';

describe('playWordFindChord', () => {
  it('exists and accepts (length:number, octave:number)', () => {
    expect(typeof playWordFindChord).toBe('function');
  });

  it('no-ops gracefully without AudioContext (SSR)', () => {
    const orig = (globalThis as any).window;
    // simulate SSR
    delete (globalThis as any).window;
    expect(() => playWordFindChord(5, 0)).not.toThrow();
    (globalThis as any).window = orig;
  });

  it('does not throw when AudioContext is missing on window', () => {
    expect(() => playWordFindChord(3, 0)).not.toThrow();
    expect(() => playWordFindChord(7, 1)).not.toThrow();
    expect(() => playWordFindChord(2, -1)).not.toThrow();
  });
});
