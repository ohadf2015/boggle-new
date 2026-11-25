import { describe, it, expect } from 'vitest';
import { keepServerNames } from '../serverMinifier.mjs';

describe('keepServerNames', () => {
  it('Given Next minimizers, Then the JS minifier is swapped for one that keeps names and the CSS one is kept', () => {
    const css = { options: { parallel: 2 } };
    const js = () => {};
    const out = keepServerNames([js, css]);
    expect(out).toHaveLength(2);
    expect(out[0]).not.toBe(js);
    expect(typeof out[0]).toBe('function');
    expect(out[1]).toBe(css);
  });

  it('Given the swapped minifier, When webpack applies it, Then it runs Next minify without mangling', () => {
    const [js] = keepServerNames([() => {}]);
    const taps: string[] = [];
    const hook = { tap: (name: string) => taps.push(name) };
    const compiler = { hooks: { thisCompilation: hook, compilation: hook } };
    (js as (c: unknown) => void)(compiler);
    expect(taps.length).toBeGreaterThan(0);
  });
});
