import { describe, it, expect } from 'vitest';
import { buildWordSet } from '../buildWordSet';

/**
 * The dictionary payload is 370k–900k words depending on language (Spanish is
 * ~2x English). `new Set(words)` over that array is a single 300–600ms
 * main-thread task, which is exactly what INP measures: a tap during the build
 * cannot be handled until it finishes. Real-user p75 INP on /es was 696ms on
 * Android vs 344ms on /en — the same 2x as the payload size.
 *
 * buildWordSet must therefore yield to the event loop between chunks so no
 * single task is long enough to swallow an interaction.
 */
describe('buildWordSet', () => {
  it('contains every word', async () => {
    const words = ['casa', 'perro', 'gato'];
    const set = await buildWordSet(words);

    expect(set.size).toBe(3);
    expect(set.has('casa')).toBe(true);
    expect(set.has('perro')).toBe(true);
    expect(set.has('gato')).toBe(true);
  });

  it('de-duplicates like Set does', async () => {
    const set = await buildWordSet(['a', 'a', 'b'], 1);
    expect(set.size).toBe(2);
  });

  it('handles an empty list', async () => {
    const set = await buildWordSet([]);
    expect(set.size).toBe(0);
  });

  it('yields to the event loop between chunks', async () => {
    const words = Array.from({ length: 10 }, (_, i) => `w${i}`);
    const interleaved: string[] = [];

    // A macrotask queued before the build starts must get a turn BEFORE the
    // build finishes — that is the whole point of chunking.
    const promise = buildWordSet(words, 2).then(() => interleaved.push('build'));
    setTimeout(() => interleaved.push('interaction'), 0);

    await promise;

    expect(interleaved[0]).toBe('interaction');
  });

  it('does not yield for a list that fits in one chunk', async () => {
    const order: string[] = [];

    const promise = buildWordSet(['a', 'b'], 1000).then(() => order.push('build'));
    setTimeout(() => order.push('interaction'), 0);

    await promise;

    // Single chunk: the build resolves on the microtask queue, ahead of any timer.
    expect(order[0]).toBe('build');
  });
});
